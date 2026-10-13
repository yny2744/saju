import type { SamJeong } from "@/lib/faceMap";

/** 삼정(三停) 비율 막대 - 무료 관상 결과·관상 심층 풀이 공용 */
export function SamJeongBar({ s }: { s: SamJeong }) {
  const rows: Array<[string, string, number]> = [
    ["상정", "이마 · 초년", s.upper],
    ["중정", "눈썹~코 · 중년", s.middle],
    ["하정", "인중~턱 · 말년", s.lower],
  ];
  const max = Math.max(s.upper, s.middle, s.lower);
  return (
    <div className="mt-3 rounded-xl p-4" style={{ backgroundColor: "var(--color-paper-soft)" }}>
      <div className="mb-2 text-[14px] font-semibold">삼정(三停) 비율</div>
      {rows.map(([name, desc, v]) => (
        <div key={name} className="mb-1.5 flex items-center gap-2 text-[13px]">
          <span className="w-9 font-semibold">{name}</span>
          <span className="w-[92px] shrink-0 text-[11px]" style={{ color: "var(--color-ink-faint)" }}>
            {desc}
          </span>
          <div className="h-2.5 flex-1 overflow-hidden rounded-full" style={{ backgroundColor: "var(--color-line)" }}>
            <div className="h-full rounded-full" style={{ width: `${v}%`, backgroundColor: v === max ? "var(--color-accent)" : "var(--color-ink-faint)" }} />
          </div>
          <span className="w-9 text-right tabular-nums">{v}%</span>
        </div>
      ))}
      <p className="mt-1 text-[11px]" style={{ color: "var(--color-ink-faint)" }}>
        전통 관상에서는 세 구간이 고르게 1:1:1에 가까울수록 균형 잡힌 얼굴로 봐요.
      </p>
    </div>
  );
}
