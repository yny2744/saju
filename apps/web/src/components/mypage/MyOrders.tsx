"use client";

import { useEffect, useState } from "react";
import { REFUND_NOTICE, REFUND_NOTICE_TITLE } from "@/lib/refundNotice";

/**
 * 마이페이지 결제 내역 + 환불 신청 (2026-11-13 유샘)
 *   결제가 없으면 이 칸은 보이지 않는다. 환불 신청을 누르면 요건을 확인해 접수 안내를 보여 준다.
 */

type Order = { id: string; orderName: string; amount: number; paidAt: string | null; status: string; refundRequestedAt: string | null; refundedAt: string | null };

function day(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}`;
}

export function MyOrders() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<Record<string, string>>({});

  const load = () =>
    fetch("/api/pay/orders")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => setOrders(j?.orders ?? []))
      .catch(() => setOrders([]));
  useEffect(() => {
    load();
  }, []);

  async function request(id: string) {
    setBusy(true);
    const res = await fetch("/api/pay/refund", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId: id, reason }) }).catch(() => null);
    const j = await res?.json().catch(() => null);
    setMsg((m) => ({ ...m, [id]: j?.message ?? j?.error?.message ?? "잠시 문제가 생겼어요. 다시 눌러 주세요." }));
    setBusy(false);
    setOpen(null);
    setReason("");
    if (res?.ok) load();
  }

  if (!orders || orders.length === 0) return null;
  return (
    <section className="mb-7">
      <h2 className="section-label mb-3">결제 내역</h2>
      <ul className="space-y-2">
        {orders.map((o) => (
          <li key={o.id} className="rounded-xl px-3.5 py-3" style={{ border: "1px solid var(--color-line)" }}>
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-[15px] font-bold" style={{ wordBreak: "keep-all" }}>
                {o.orderName}
              </span>
              <span className="shrink-0 text-[14px]">{o.amount.toLocaleString("ko-KR")}원</span>
            </div>
            <p className="mt-0.5 text-[12.5px]" style={{ color: "var(--color-ink-soft)" }}>
              {day(o.paidAt)} 결제
              {o.status === "refunded" ? ` · ${day(o.refundedAt)} 환불 완료` : o.refundRequestedAt ? ` · ${day(o.refundRequestedAt)} 환불 신청 접수` : ""}
            </p>
            {o.status === "refunded" && (
              <p className="mt-1 text-[13px] font-bold" style={{ color: "var(--color-element-wood)" }}>
                환불이 완료되었어요. 카드사에 따라 취소 내역이 보이기까지 며칠 걸릴 수 있어요.
              </p>
            )}
            {msg[o.id] && (
              <p className="mt-1.5 text-[13px]" style={{ wordBreak: "keep-all" }}>
                {msg[o.id]}
              </p>
            )}
            {o.status !== "refunded" && !o.refundRequestedAt && open !== o.id && (
              <button type="button" onClick={() => setOpen(o.id)} className="mt-2 text-[13px] underline" style={{ color: "var(--color-ink-soft)" }}>
                환불 신청
              </button>
            )}
            {open === o.id && (
              <div className="mt-2 rounded-lg p-3" style={{ backgroundColor: "var(--color-paper-soft)" }}>
                <p className="text-[13px] font-bold">{REFUND_NOTICE_TITLE}</p>
                <ul className="mt-1 list-disc space-y-1 pl-4 text-[12px]" style={{ color: "var(--color-ink-soft)", wordBreak: "keep-all" }}>
                  {REFUND_NOTICE.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  maxLength={200}
                  rows={2}
                  placeholder="환불 사유 (선택)"
                  className="mt-2 w-full rounded-lg border px-2.5 py-2 text-[13px]"
                />
                <div className="mt-2 flex gap-2">
                  <button type="button" onClick={() => request(o.id)} disabled={busy} className="btn-primary flex-1 py-2 text-[14px]">
                    {busy ? "접수 중…" : "환불 신청하기"}
                  </button>
                  <button type="button" onClick={() => setOpen(null)} className="rounded-lg px-3 text-[13px]" style={{ border: "1px solid var(--color-line)" }}>
                    닫기
                  </button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
