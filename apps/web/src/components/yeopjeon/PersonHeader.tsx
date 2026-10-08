import type { ReadingHeader } from "@/server/readings/readings";

const GOLD = "var(--color-gold)";

/** 풀이 화면 맨 위: 이름 · 생년월일 · 네 기둥 */
export function PersonHeader({ header, kicker, title, sub }: { header: ReadingHeader; kicker: string; title: string; sub?: string }) {
  return (
    <header className="mb-8 text-center">
      <p className="text-[13px]" style={{ color: GOLD }}>
        {kicker}
      </p>
      <h1 className="mt-1 text-[26px] font-bold leading-snug" style={{ fontFamily: "var(--font-serif)" }}>
        {header.nickname}
        {header.hanjaName && <span className="font-normal" style={{ color: "var(--color-ink-faint)" }}>({header.hanjaName})</span>}
        님의 {title}
      </h1>
      <p className="mt-1.5 text-[13px]" style={{ color: "var(--color-ink-soft)" }}>
        {header.birth}
        {sub && ` · ${sub}`}
      </p>
      <div className="mx-auto mt-4 grid max-w-xs grid-cols-4 gap-2">
        {header.pillars.map((p) => (
          <div key={p.label} className="rounded-lg py-2" style={{ backgroundColor: "var(--color-paper-soft)" }}>
            <p className="text-[11px]" style={{ color: "var(--color-ink-faint)" }}>
              {p.label}
            </p>
            <p className="text-[17px] font-bold" style={{ fontFamily: "var(--font-serif)" }}>
              {p.ganzhi ?? "—"}
            </p>
          </div>
        ))}
      </div>
    </header>
  );
}
