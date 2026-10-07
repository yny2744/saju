"use client";

import { BOKCHAE_NAME, SAJU_READING_PRICE, formatWon } from "@/lib/bokchae";
import { focusLabel, isFocus } from "@/lib/focus";
import { InviteCard } from "./InviteCard";
import { useBokchae } from "./useBokchae";

const GOLD = "#9a7a45";

function fmtDate(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${String(d.getFullYear()).slice(2)}.${p(d.getMonth() + 1)}.${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** 내 사주함: 복채 잔액 · 내 사주풀이 · 친구 초대 · 이용내역 */
export function BokchaePanel() {
  const { data, loading } = useBokchae();
  if (loading) {
    return (
      <p className="mb-7 text-center text-sm" style={{ color: "var(--color-ink-faint)" }}>
        {BOKCHAE_NAME} 정보를 불러오는 중...
      </p>
    );
  }
  if (!data) return null;

  return (
    <>
      {/* 잔액 */}
      <section className="mb-7 flex items-center justify-between rounded-2xl px-5 py-4" style={{ border: "1px solid #d8c49a", backgroundColor: "#fffdf8" }}>
        <div>
          <p className="text-[13px]" style={{ color: "var(--color-ink-faint)" }}>
            {BOKCHAE_NAME}
          </p>
          <p className="text-[28px] font-bold" style={{ fontFamily: "var(--font-serif)", color: GOLD }}>
            {formatWon(data.balance)}
          </p>
        </div>
        <a href="/start" className="rounded-xl px-4 py-2.5 text-[14px] font-bold text-white" style={{ backgroundColor: "var(--color-accent)" }}>
          사주보기 {formatWon(SAJU_READING_PRICE)}
        </a>
      </section>

      {/* 내 사주풀이 */}
      <section className="mb-7">
        <h2 className="section-label mb-3">내 사주풀이</h2>
        {data.readings.length === 0 ? (
          <p className="rounded-xl px-4 py-3 text-sm" style={{ backgroundColor: "var(--color-paper-soft)", color: "var(--color-ink-faint)" }}>
            아직 본 사주풀이가 없어요. 무료 만세력을 본 뒤 &quot;이어서 보기&quot;를 눌러 보세요.
          </p>
        ) : (
          <ul className="overflow-hidden rounded-xl" style={{ border: "1px solid var(--color-line)" }}>
            {data.readings.map((r, i) => (
              <li key={r.id} style={i > 0 ? { borderTop: "1px solid var(--color-line)" } : undefined}>
                <a href={`/reading/${r.id}`} className="flex items-center justify-between px-4 py-3">
                  <span className="text-[15px] font-semibold">
                    [사주보기] {r.nickname}
                    {r.focus && isFocus(r.focus) && (
                      <span className="ml-1.5 text-[12px] font-normal" style={{ color: "var(--color-ink-faint)" }}>
                        {focusLabel(r.focus)}
                      </span>
                    )}
                  </span>
                  <span className="text-[12px]" style={{ color: "var(--color-ink-faint)" }}>
                    {fmtDate(r.createdAt)} ›
                  </span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 친구 초대 */}
      <section className="mb-7">
        <InviteCard refCode={data.refCode} invited={data.invited} />
      </section>

      {/* 이용내역 */}
      <section className="mb-7">
        <h2 className="section-label mb-3">{BOKCHAE_NAME} 이용내역</h2>
        {data.ledger.length === 0 ? (
          <p className="rounded-xl px-4 py-3 text-sm" style={{ backgroundColor: "var(--color-paper-soft)", color: "var(--color-ink-faint)" }}>
            아직 내역이 없어요.
          </p>
        ) : (
          <ul className="overflow-hidden rounded-xl" style={{ border: "1px solid var(--color-line)" }}>
            {data.ledger.map((e, i) => (
              <li
                key={`${e.createdAt}-${i}`}
                className="flex items-center justify-between px-4 py-3"
                style={i > 0 ? { borderTop: "1px solid var(--color-line)" } : undefined}
              >
                <div>
                  <p className="text-[14px] font-medium">{e.label}</p>
                  <p className="text-[12px]" style={{ color: "var(--color-ink-faint)" }}>
                    {fmtDate(e.createdAt)}
                  </p>
                </div>
                <span className="text-[15px] font-bold" style={{ color: e.amount >= 0 ? "var(--color-element-wood)" : "var(--color-accent)" }}>
                  {e.amount >= 0 ? "+" : "−"}
                  {formatWon(Math.abs(e.amount))}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
