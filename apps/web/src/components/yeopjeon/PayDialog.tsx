"use client";

import { useEffect, useState } from "react";
import { CURRENCY_NAME, formatNyang } from "@/lib/yeopjeon";
import { PAY_BACK_KEY } from "@/lib/pay";
import { DEFAULT_PAY_METHOD, PAY_METHODS, PAY_METHODS_TEXT, portonePayMethod, tossPayMethod, type PayMethodId } from "@/lib/payMethod";
import { reportClientError } from "./useYeopjeon";

/**
 * 결제 창 (2026-10-10 수정안 31). 엽전이 모자랄 때 뜬다 - 가진 엽전은 먼저 쓰고 모자란 만큼만 카드·계좌이체 (2026-10-21 결제수단 선택).
 * 결제가 승인되면 /pay/success 에서 바로 그 운세가 열린다.
 */

type Quote =
  | { status: "enough" }
  | {
      status: "pay";
      orderId: string;
      orderName: string;
      price: number;
      useYeopjeon: number;
      amount: number;
      clientKey: string | null;
      portone: { storeId: string; channelKey: string } | null;
      customerKey: string;
      mock: boolean;
    };

type PortOneSdk = {
  requestPayment: (o: Record<string, unknown>) => Promise<{ code?: string; message?: string; paymentId?: string } | undefined>;
};
const PORTONE_SDK = "https://cdn.portone.io/v2/browser-sdk.js";

function loadPortOne(): Promise<PortOneSdk> {
  const w = window as unknown as { PortOne?: PortOneSdk };
  if (w.PortOne) return Promise.resolve(w.PortOne);
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = PORTONE_SDK;
    s.async = true;
    s.onload = () => (w.PortOne ? resolve(w.PortOne) : reject(new Error("결제 모듈을 불러오지 못했어요.")));
    s.onerror = () => reject(new Error("결제 모듈을 불러오지 못했어요."));
    document.head.appendChild(s);
  });
}

type TossPaymentsFn = (clientKey: string) => {
  payment: (o: { customerKey: string }) => {
    requestPayment: (o: Record<string, unknown>) => Promise<void>;
  };
};

const TOSS_SDK = "https://js.tosspayments.com/v2/standard";

function loadToss(): Promise<TossPaymentsFn> {
  const w = window as unknown as { TossPayments?: TossPaymentsFn };
  if (w.TossPayments) return Promise.resolve(w.TossPayments);
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = TOSS_SDK;
    s.async = true;
    s.onload = () => (w.TossPayments ? resolve(w.TossPayments) : reject(new Error("결제 모듈을 불러오지 못했어요.")));
    s.onerror = () => reject(new Error("결제 모듈을 불러오지 못했어요."));
    document.head.appendChild(s);
  });
}

export function PayDialog({
  personId,
  mode,
  topics,
  backTo,
  checkoutUrl,
  onEnough,
  onClose,
}: {
  personId: string;
  mode: "basic" | "deep" | "bundle3" | "bundle12" | "naming" | "rename" | "face" | "business" | "corp" | "brand" | "couple" | "p_naming" | "p_business" | "p_corp" | "p_brand" | "wallpaper" | "exam" | "exam_deep";
  topics: string[];
  /** 결제를 그만두면 돌아올 주소 */
  backTo: string;
  /** 주문 만들 주소 (기본: 사주 사람 /api/persons/{id}/checkout, 관상은 /api/face/readings/{id}/checkout) */
  checkoutUrl?: string;
  /** 그 사이 엽전이 충분해졌으면 (예: 다른 창에서 받음) 그냥 엽전으로 산다 */
  onEnough: () => void;
  onClose: () => void;
}) {
  const [quote, setQuote] = useState<Quote | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [method, setMethod] = useState<PayMethodId>(DEFAULT_PAY_METHOD);

  useEffect(() => {
    let cancelled = false;
    fetch(checkoutUrl ?? `/api/persons/${encodeURIComponent(personId)}/checkout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode, topics }),
    })
      .then(async (r) => {
        const body = await r.json().catch(() => ({}));
        if (cancelled) return;
        if (!r.ok) return setError(body?.error?.message ?? "결제를 준비하지 못했어요.");
        if (body.status === "enough") return onEnough();
        setQuote(body);
      })
      .catch(() => !cancelled && setError("연결이 끊겼어요. 잠시 후 다시 시도해 주세요."));
    return () => {
      cancelled = true;
    };
    // 창을 열 때 한 번만
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function pay() {
    if (!quote || quote.status !== "pay") return;
    setBusy(true);
    setError(null);
    try {
      sessionStorage.setItem(PAY_BACK_KEY, backTo);
    } catch {
      /* 무시 */
    }
    const origin = window.location.origin;
    if (quote.mock) {
      // 시험 모드: 실제 결제 없이 승인된 것처럼
      window.location.href = `/pay/success?paymentKey=mock_${quote.orderId}&orderId=${encodeURIComponent(quote.orderId)}&amount=${quote.amount}`;
      return;
    }
    if (quote.portone) {
      // 포트원 V2 (2026-10-17): 결제 ID = 주문 번호. 폰에서는 결제 뒤 redirectUrl로 돌아오고(paymentId·code가 붙어 옴),
      // PC에서는 결제창이 닫히며 결과를 돌려준다.
      const success = `${origin}/pay/success?orderId=${encodeURIComponent(quote.orderId)}&amount=${quote.amount}`;
      try {
        const PortOne = await loadPortOne();
        const res = await PortOne.requestPayment({
          storeId: quote.portone.storeId,
          channelKey: quote.portone.channelKey,
          paymentId: quote.orderId,
          orderName: quote.orderName,
          totalAmount: quote.amount,
          currency: "CURRENCY_KRW",
          payMethod: portonePayMethod(method),
          customer: { customerId: quote.customerKey },
          redirectUrl: success,
        });
        if (res?.code) {
          setError(/cancel|취소/i.test(`${res.code} ${res.message ?? ""}`) ? "결제를 취소했어요." : res.message || "결제가 되지 않았어요.");
          setBusy(false);
          return;
        }
        window.location.href = `${success}&paymentId=${encodeURIComponent(quote.orderId)}`;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        reportClientError("포트원 결제창", msg);
        setError("결제창을 열지 못했어요. 잠시 후 다시 시도해 주세요.");
        setBusy(false);
      }
      return;
    }
    try {
      const TossPayments = await loadToss();
      const payment = TossPayments(quote.clientKey!).payment({ customerKey: quote.customerKey });
      await payment.requestPayment({
        method: tossPayMethod(method),
        amount: { currency: "KRW", value: quote.amount },
        orderId: quote.orderId,
        orderName: quote.orderName,
        successUrl: `${origin}/pay/success`,
        failUrl: `${origin}/pay/fail`,
      });
    } catch (e) {
      // 손님이 결제창을 닫은 경우도 여기로 온다
      const msg = e instanceof Error ? e.message : String(e);
      if (!/취소|cancel/i.test(msg)) reportClientError("결제창 열기", msg);
      setError(/취소|cancel/i.test(msg) ? "결제를 취소했어요." : "결제창을 열지 못했어요. 잠시 후 다시 시도해 주세요.");
      setBusy(false);
    }
  }

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-end justify-center px-3 pb-3 sm:items-center" style={{ backgroundColor: "rgba(0,0,0,0.45)" }}>
      <div className="w-full max-w-sm rounded-2xl p-5" style={{ backgroundColor: "var(--color-paper)" }}>
        <p className="text-center text-[13px]" style={{ color: "var(--color-gold)" }}>
          결제
        </p>
        {!quote && !error && <p className="py-8 text-center text-[14px]">결제 금액을 계산하고 있어요...</p>}
        {quote?.status === "pay" && (
          <>
            <p className="mt-1 text-center text-[19px] font-bold" style={{ fontFamily: "var(--font-serif)" }}>
              {quote.orderName}
            </p>
            <dl className="mt-4 space-y-1.5 rounded-xl px-4 py-3 text-[14px]" style={{ backgroundColor: "var(--color-paper-soft)" }}>
              <div className="flex justify-between">
                <dt>상품 금액</dt>
                <dd className="tabular-nums">{formatNyang(quote.price)}</dd>
              </div>
              {quote.useYeopjeon > 0 && (
                <div className="flex justify-between">
                  <dt>내 {CURRENCY_NAME} 사용</dt>
                  <dd className="tabular-nums" style={{ color: "var(--color-element-wood)" }}>
                    − {formatNyang(quote.useYeopjeon)}
                  </dd>
                </div>
              )}
              <div className="flex justify-between border-t pt-1.5 text-[16px] font-bold" style={{ borderColor: "var(--color-line)" }}>
                <dt>결제할 금액</dt>
                <dd className="tabular-nums" style={{ color: "var(--color-accent)" }}>
                  {quote.amount.toLocaleString("ko-KR")}원
                </dd>
              </div>
            </dl>
            {!quote.mock && (
              <div role="radiogroup" aria-label="결제수단" className="mt-4 grid grid-cols-2 gap-2">
                {PAY_METHODS.map((m) => {
                  const on = method === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      disabled={busy}
                      onClick={() => setMethod(m.id)}
                      className="rounded-xl px-2 py-2.5 text-center disabled:opacity-60"
                      style={{
                        border: on ? "2px solid var(--color-accent)" : "1px solid var(--color-line)",
                        backgroundColor: on ? "var(--color-paper-soft)" : "transparent",
                      }}
                    >
                      <span className="block text-[15px] font-bold">{m.label}</span>
                      <span className="mt-0.5 block text-[11px]" style={{ color: "var(--color-ink-faint)" }}>
                        {m.hint}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
            <button type="button" disabled={busy} onClick={pay} className="btn-band mt-3 block w-full rounded-xl py-4 text-[17px] font-bold disabled:opacity-60" style={{ fontFamily: "var(--font-serif)" }}>
              {busy ? "결제창을 여는 중..." : `${PAY_METHODS.find((m) => m.id === method)?.label ?? "카드"}로 ${quote.amount.toLocaleString("ko-KR")}원 결제`}
            </button>
            <p className="mt-2 text-center text-[12px] leading-relaxed" style={{ color: "var(--color-ink-faint)" }}>
              {PAY_METHODS_TEXT} · 결제하면 바로 열려요
              <br />
              풀이를 열어 보기 전이면 7일 안에 전액 환불돼요
            </p>
          </>
        )}
        {error && (
          <p className="mt-3 rounded-xl px-4 py-3 text-center text-[14px]" style={{ backgroundColor: "var(--color-danger-soft)", color: "var(--color-danger)" }}>
            {error}
          </p>
        )}
        <button type="button" onClick={onClose} className="btn-secondary mt-3">
          닫기
        </button>
        <a href="/mypage" className="mt-2 block text-center text-[12px] underline underline-offset-4" style={{ color: "var(--color-ink-faint)" }}>
          친구를 초대하면 {CURRENCY_NAME}을 받을 수 있어요
        </a>
      </div>
    </div>
  );
}
