import type { FreeAnalysisKeywords } from "@/lib/freeAnalysisKeywords";
import { FOCUS_TRAIT_KEYS, type Focus } from "@/lib/focus";

/**
 * 무료 결과 "상세 해석"을 도표 2개로 묶어 보여준다.
 *  1) 나의 기본 성향 - 5줄 표: 항목 + 핵심 키워드 칩, 줄을 누르면 엔진 문장이 펼쳐짐
 *  2) 올해 운의 흐름 - 올해 흐름 한 줄 + 기회/주의할 점 두 칸
 * 문장은 엔진이 준 analysis 값을 그대로 쓰고, 키워드는 freeAnalysisKeywords의 표시용 요약이다.
 */

const TRAIT_ROWS = [
  { key: "temperament", label: "성향" },
  { key: "career", label: "직업·진로" },
  { key: "wealth", label: "재물운" },
  { key: "love", label: "연애운" },
  { key: "relationship", label: "인간관계" },
] as const;

export const FREE_ANALYSIS_KEYS = [...TRAIT_ROWS.map((r) => r.key), "yearlyFlow", "opportunity", "caution"];

/** 무료 해석 모양(8개 키가 모두 문자열)일 때만 도표로 보여주고, 아니면 기존 목록 화면을 쓴다 */
export function isFreeAnalysisShape(analysis: Record<string, unknown>): analysis is Record<string, string> {
  return FREE_ANALYSIS_KEYS.every((k) => typeof analysis[k] === "string");
}

export function FreeAnalysisBoards({
  analysis,
  kw,
  focus,
}: {
  analysis: Record<string, string>;
  kw: FreeAnalysisKeywords;
  /** 입력 화면 ③에서 고른 분야 - 그 줄을 맨 위로 올리고 펼쳐 둔다 */
  focus?: Focus;
}) {
  const focusKeys: string[] = focus ? FOCUS_TRAIT_KEYS[focus] : [];
  const rows = [...TRAIT_ROWS].sort((a, b) => Number(focusKeys.includes(b.key)) - Number(focusKeys.includes(a.key)));
  return (
    <div className="space-y-8">
      {/* 도표 1 */}
      <div>
        <h3 className="mb-2.5 text-[15px] font-semibold">나의 기본 성향</h3>
        <div className="overflow-hidden rounded-xl" style={{ border: "1px solid var(--color-line)", backgroundColor: "var(--color-paper-soft)" }}>
          {rows.map(({ key, label }, i) => {
            const hot = focusKeys.includes(key);
            return (
            <details
              key={key}
              open={hot || undefined}
              className="group"
              style={{
                ...(i > 0 ? { borderTop: "1px solid var(--color-line)" } : {}),
                ...(hot ? { backgroundColor: "var(--color-accent-soft)" } : {}),
              }}
            >
              <summary className="flex cursor-pointer list-none items-center gap-3 px-3.5 py-3 [&::-webkit-details-marker]:hidden">
                <span className="w-[62px] shrink-0 text-[13px] font-semibold">
                  {label}
                  {hot && (
                    <span className="mt-0.5 block text-[10px] font-semibold" style={{ color: "var(--color-accent)" }}>
                      관심 분야
                    </span>
                  )}
                </span>
                <span className="flex flex-1 flex-wrap gap-1.5">
                  {kw.traits[key].map((k) => (
                    <span
                      key={k}
                      className="rounded-full px-2 py-0.5 text-[12px]"
                      style={{ backgroundColor: "var(--color-paper)", border: "1px solid var(--color-line)", color: "var(--color-ink)" }}
                    >
                      {k}
                    </span>
                  ))}
                </span>
                <span aria-hidden className="shrink-0 text-xs transition-transform group-open:rotate-180" style={{ color: "var(--color-ink-faint)" }}>
                  ▾
                </span>
              </summary>
              <p className="px-3.5 pb-3 text-[13px] leading-relaxed" style={{ color: "var(--color-ink-soft)" }}>
                {analysis[key]}
              </p>
            </details>
            );
          })}
        </div>
        <p className="mt-1.5 text-[11px]" style={{ color: "var(--color-ink-faint)" }}>
          항목을 누르면 설명이 펼쳐져요.
        </p>
      </div>

      {/* 도표 2 */}
      <div>
        <h3 className="mb-2.5 text-[15px] font-semibold">올해 운의 흐름</h3>
        <div className="rounded-xl p-3.5" style={{ border: "1px solid var(--color-line)", backgroundColor: "var(--color-paper-soft)" }}>
          <div className="mb-1 flex items-baseline gap-2">
            <span className="section-label">{kw.yearLabel}</span>
            <span className="text-[15px] font-bold">{kw.yearKeyword}</span>
          </div>
          <p className="text-[13px] leading-relaxed" style={{ color: "var(--color-ink-soft)" }}>
            {analysis.yearlyFlow}
          </p>
        </div>
        <div className="mt-2.5 grid grid-cols-2 gap-2.5">
          <YearCell title="기회" keyword={kw.opportunity} text={analysis.opportunity} color="var(--color-element-wood)" />
          <YearCell title="주의할 점" keyword={kw.caution} text={analysis.caution} color="var(--color-accent)" />
        </div>
      </div>
    </div>
  );
}

function YearCell({ title, keyword, text, color }: { title: string; keyword: string; text: string; color: string }) {
  return (
    <div className="rounded-xl p-3" style={{ backgroundColor: "var(--color-paper-soft)", borderTop: `3px solid ${color}` }}>
      <div className="mb-0.5 text-[12px] font-semibold" style={{ color }}>
        {title}
      </div>
      <div className="mb-1.5 text-[14px] font-bold leading-snug">{keyword}</div>
      <p className="text-[12px] leading-relaxed" style={{ color: "var(--color-ink-soft)" }}>
        {text}
      </p>
    </div>
  );
}
