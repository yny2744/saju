"use client";

import { CURRENCY_NAME, PRICE, formatNyang } from "@/lib/yeopjeon";
import { TOPIC_KEYS } from "@/lib/topics";
import { InviteCard } from "./InviteCard";
import { useYeopjeon } from "./useYeopjeon";

const GOLD = "var(--color-gold)";

function fmtDate(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${String(d.getFullYear()).slice(2)}.${p(d.getMonth() + 1)}.${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** 내 복주머니: 엽전 잔액 · 내 사주풀이(사람별) · 친구 초대 · 이용내역 */
export function YeopjeonPanel() {
  const { data, loading } = useYeopjeon();
  if (loading) {
    return (
      <p className="mb-7 text-center text-sm" style={{ color: "var(--color-ink-faint)" }}>
        {CURRENCY_NAME} 정보를 불러오는 중...
      </p>
    );
  }
  if (!data) return null;

  return (
    <>
      {/* 잔액 */}
      <section className="mb-7 flex items-center justify-between rounded-2xl px-5 py-4" style={{ border: "1px solid var(--color-gold-line)", backgroundColor: "var(--color-card)" }}>
        <div>
          <p className="text-[13px]" style={{ color: "var(--color-ink-faint)" }}>
            내 {CURRENCY_NAME}
          </p>
          <p className="text-[28px] font-bold" style={{ fontFamily: "var(--font-serif)", color: GOLD }}>
            {formatNyang(data.balance)}
          </p>
        </div>
        <a href="/start" className="rounded-xl px-4 py-2.5 text-[14px] font-bold text-white" style={{ backgroundColor: "var(--color-accent)" }}>
          맛보기 {formatNyang(PRICE.TASTE)}
        </a>
      </section>

      {/* 내 사주풀이 (사람별) */}
      <section className="mb-7">
        <h2 className="section-label mb-3">내 사주풀이</h2>
        {data.persons.length === 0 ? (
          <p className="rounded-xl px-4 py-3 text-sm" style={{ backgroundColor: "var(--color-paper-soft)", color: "var(--color-ink-faint)" }}>
            아직 본 사주풀이가 없어요. 무료 만세력을 본 뒤 &quot;이어서 보기&quot;를 눌러 보세요.
          </p>
        ) : (
          <ul className="overflow-hidden rounded-xl" style={{ border: "1px solid var(--color-line)" }}>
            {data.persons.map((p, i) => (
              <li key={p.id} style={i > 0 ? { borderTop: "1px solid var(--color-line)" } : undefined}>
                <a href={`/person/${p.id}`} className="flex items-center justify-between gap-2 px-4 py-3">
                  <span className="min-w-0">
                    <span className="block text-[15px] font-semibold">{p.nickname}</span>
                    <span className="block truncate text-[12px]" style={{ color: "var(--color-ink-faint)" }}>
                      {p.birth}
                    </span>
                  </span>
                  <span className="shrink-0 text-[12px]" style={{ color: "var(--color-ink-soft)" }}>
                    {p.hasTaste ? "맛보기 · " : ""}
                    열린 운 {p.unlockedCount}/{TOPIC_KEYS.length} ›
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
        <h2 className="section-label mb-3">{CURRENCY_NAME} 이용내역</h2>
        {data.ledger.length === 0 ? (
          <p className="rounded-xl px-4 py-3 text-sm" style={{ backgroundColor: "var(--color-paper-soft)", color: "var(--color-ink-faint)" }}>
            아직 내역이 없어요.
          </p>
        ) : (
          <ul className="overflow-hidden rounded-xl" style={{ border: "1px solid var(--color-line)" }}>
            {data.ledger.map((e, i) => (
              <li
                key={`${e.createdAt}-${i}`}
                className="flex items-center justify-between gap-3 px-4 py-3"
                style={i > 0 ? { borderTop: "1px solid var(--color-line)" } : undefined}
              >
                <div className="min-w-0">
                  <p className="text-[14px] font-medium">{e.label}</p>
                  <p className="text-[12px]" style={{ color: "var(--color-ink-faint)" }}>
                    {fmtDate(e.createdAt)}
                  </p>
                </div>
                <span className="shrink-0 text-[15px] font-bold" style={{ color: e.amount >= 0 ? "var(--color-element-wood)" : "var(--color-danger)" }}>
                  {e.amount >= 0 ? "+" : "−"}
                  {formatNyang(Math.abs(e.amount))}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
