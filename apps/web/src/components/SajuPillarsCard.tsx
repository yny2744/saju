import type { SajuJson } from "saju-engine";
import { buildPillarColumns, ELEMENT_TOKEN, type ElementKo } from "@/lib/pillarView";

/**
 * 사주 원국 카드. 천간·지지를 오행 색으로 칠하고, 기둥마다 십신(천간·지지)과 지장간을 보여준다.
 * 색은 서비스 전체가 이미 쓰는 오행 토큰(--color-element-*)이고, 표시하는 값은 전부 엔진이 계산해둔 것이다.
 */
function colorOf(element: ElementKo): string {
  return `var(--color-element-${ELEMENT_TOKEN[element]})`;
}

export function SajuPillarsCard({ saju }: { saju: SajuJson }) {
  const columns = buildPillarColumns(saju);
  const hourUnknown = columns.some((c) => c.empty);

  return (
    <div>
      <div
        className="grid grid-cols-4 divide-x divide-[var(--color-line)] overflow-hidden rounded-xl"
        style={{ border: "1px solid var(--color-line)", backgroundColor: "var(--color-paper-soft)" }}
      >
        {columns.map((c) => (
          <div key={c.key} role="group" aria-label={`${c.label}`} className="px-1 py-3.5 text-center">
            <div className="section-label mb-2">{c.label}</div>

            {c.empty || !c.stem || !c.branch ? (
              <div className="flex min-h-[190px] items-center justify-center px-1 text-xs leading-relaxed" style={{ color: "var(--color-ink-faint)" }}>
                시간
                <br />
                모름
              </div>
            ) : (
              <>
                {/* 천간 */}
                <div className="h-4 text-[11px]" style={{ color: c.key === "day" ? "var(--color-accent)" : "var(--color-ink-faint)", fontWeight: c.key === "day" ? 700 : 400 }}>
                  {c.stem.tenGod}
                </div>
                <div className="text-[32px] font-bold leading-tight" style={{ fontFamily: "var(--font-serif)", color: colorOf(c.stem.element) }}>
                  {c.stem.hanja}
                </div>
                <div className="mb-2 text-[11px] font-semibold" style={{ color: colorOf(c.stem.element) }}>
                  {c.stem.hangul}
                </div>

                {/* 지지 */}
                <div className="text-[32px] font-bold leading-tight" style={{ fontFamily: "var(--font-serif)", color: colorOf(c.branch.element) }}>
                  {c.branch.hanja}
                </div>
                <div className="mb-1.5 text-[11px] font-semibold" style={{ color: colorOf(c.branch.element) }}>
                  {c.branch.hangul}
                </div>
                <div className="h-4 text-[11px]" style={{ color: "var(--color-ink-faint)" }}>
                  {c.branch.tenGod}
                </div>
                <div className="text-[10px]" style={{ color: "var(--color-ink-faint)" }} title="지장간">
                  {c.hiddenStems.join("")}
                </div>
                {c.twelveStage && (
                  <div
                    className="mx-auto mt-1.5 w-fit rounded px-1.5 py-0.5 text-[10px]"
                    style={{ backgroundColor: "var(--color-paper)", color: "var(--color-ink-soft)" }}
                    title="12운성"
                  >
                    {c.twelveStage}
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </div>

      <p className="mt-2 text-[11px]" style={{ color: "var(--color-ink-faint)" }}>
        글자 위·아래 작은 글씨는 십신, 맨 아래는 지장간과 12운성이에요.
      </p>

      {hourUnknown && (
        <p className="mt-2 text-xs leading-relaxed" style={{ color: "var(--color-ink-faint)" }}>
          태어난 시간을 입력하지 않아 시주(時柱)는 비워두었어요. 시간을 알면 시주까지 볼 수 있어요.
        </p>
      )}
    </div>
  );
}
