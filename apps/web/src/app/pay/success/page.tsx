"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { LoadingState } from "@/components/StatusScreens";
import { notifyYeopjeonChanged } from "@/components/yeopjeon/useYeopjeon";
import { PAY_BACK_KEY } from "@/lib/pay";

/**
 * 결제를 마치고 돌아온 화면 (수정안 31 → 2026-11-11 유샘)
 *   승인이 확인되면 "결제가 완료되었어요" 화면을 보여 주고, 손님이 [풀이 열기]를 눌러야 연다.
 *   연 뒤에는 환불되지 않는다는 것을 한 번 더 알리고, 열기 전이면 나중에(내 복주머니) 볼 수도 있다.
 */
function SuccessBody() {
  const q = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    // 포트원은 결제에 실패·취소하면 code·message를 붙여 돌려보낸다
    if (q.get("code")) {
      setError(/cancel|취소/i.test(`${q.get("code")} ${q.get("message") ?? ""}`) ? "결제를 취소했어요. 돈은 빠지지 않았어요." : q.get("message") || "결제가 되지 않았어요.");
      return;
    }
    fetch("/api/pay/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // 토스는 paymentKey, 포트원은 paymentId(= 주문 번호)
      body: JSON.stringify({ paymentKey: q.get("paymentKey") ?? q.get("paymentId"), orderId: q.get("orderId"), amount: Number(q.get("amount")) }),
    })
      .then(async (r) => {
        const body = await r.json().catch(() => ({}));
        if (r.ok && typeof body.redirect === "string" && body.redirect.startsWith("/")) {
          notifyYeopjeonChanged();
          try {
            sessionStorage.removeItem(PAY_BACK_KEY);
          } catch {
            /* 무시 */
          }
          setDone(body.redirect);
          return;
        }
        setError(body?.error?.message ?? "결제를 확인하지 못했어요.");
      })
      .catch(() => setError("연결이 끊겼어요. 이 화면을 새로 고침해 주세요. 결제가 두 번 되지는 않아요."));
  }, [q]);

  if (done) {
    const name = q.get("name");
    const amount = Number(q.get("amount"));
    return (
      <main className="mx-auto max-w-xl px-5 py-14 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full text-[30px] font-bold" style={{ backgroundColor: "#2f6b3a", color: "#fff" }} aria-hidden>
          ✓
        </div>
        <h1 className="mt-4 text-[22px] font-bold" style={{ fontFamily: "var(--font-serif)" }}>
          결제가 완료되었어요
        </h1>
        {(name || amount > 0) && (
          <p className="mt-2 text-[14.5px]" style={{ color: "var(--color-ink-soft)", wordBreak: "keep-all" }}>
            {name}
            {name && amount > 0 ? " · " : ""}
            {amount > 0 ? `${amount.toLocaleString("ko-KR")}원` : ""}
          </p>
        )}
        <button type="button" onClick={() => {
            // 연 시각을 남기고 연다 - 기록이 실패해도 손님은 그대로 연다
            const orderId = q.get("orderId");
            const go = () => window.location.replace(done);
            if (!orderId) return go();
            const t = window.setTimeout(go, 1500);
            fetch("/api/pay/opened", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId }), keepalive: true })
              .catch(() => {})
              .finally(() => {
                window.clearTimeout(t);
                go();
              });
          }} className="btn-band mx-auto mt-7 block w-full max-w-sm rounded-xl py-4 text-[17px] font-bold" style={{ fontFamily: "var(--font-serif)" }}>
          지금 풀이 열기
        </button>
        <p className="mt-3 text-[12.5px] leading-relaxed" style={{ color: "var(--color-ink-faint)", wordBreak: "keep-all" }}>
          풀이를 연 뒤에는 환불되지 않아요.
          <br />
          열기 전이면 7일 안에 전액 환불돼요.
        </p>
        <a href="/mypage" className="mt-5 inline-block text-[13px] underline underline-offset-4" style={{ color: "var(--color-ink-soft)" }}>
          나중에 볼게요
        </a>
      </main>
    );
  }
  if (!error) return <LoadingState message="결제를 확인하고 있어요..." />;
  let back = "/mypage";
  try {
    back = sessionStorage.getItem(PAY_BACK_KEY) || back;
  } catch {
    /* 무시 */
  }
  return (
    <main className="mx-auto max-w-xl px-5 py-16 text-center">
      <p className="text-[15px]" style={{ color: "var(--color-danger)" }}>
        {error}
      </p>
      <p className="mt-3 text-[13px]" style={{ color: "var(--color-ink-soft)" }}>
        돈이 빠졌는데 운세가 열리지 않았다면 고객센터로 알려 주세요. 바로 처리해 드려요.
      </p>
      <a href={back.startsWith("/") ? back : "/mypage"} className="btn-primary mx-auto mt-6 block max-w-xs">
        돌아가기
      </a>
    </main>
  );
}

export default function PaySuccessPage() {
  return (
    <Suspense fallback={<LoadingState message="결제를 확인하고 있어요..." />}>
      <SuccessBody />
    </Suspense>
  );
}
