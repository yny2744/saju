import type { ElementKo } from "@/lib/pillarView";
import { FILL_COLOR, FILL_COLOR_ON_LIGHT, FILL_GAP_MAX, FILL_GAP_MIN, fillLine, fillNames } from "@/lib/fillGauge";

/**
 * "남은 작은 빈자리" 게이지 (2026-10-31 유샘) - 설명은 lib/fillGauge.ts.
 *   ① 앞의 여섯 칸이 왼쪽부터 차례로 금빛으로 차오른다 (한 칸에 0.15초)
 *   ② 마지막 칸은 (100 - gap)% 까지만 차오른다
 *   ③ 비어 있는 부분은 필요한 기운의 색(가는 빗금 + 테두리)으로 숨 쉬듯 은은하게 깜빡인다
 * 화면에 그려질 때 한 번 차오른다 (CSS 애니메이션 - 서버에서 그려도 같은 모양). 움직임을 줄인 기기에서는 바로 찬 모양.
 * gap 이 없으면(예전에 만든 풀이) 50%.
 */

const CSS = `
.fg{display:flex;gap:6px}
.fg-c{position:relative;flex:1;height:16px;border-radius:3px;overflow:hidden;background:rgba(128,128,128,.14)}
.fg-dark .fg-c{background:rgba(255,255,255,.07)}
.fg-f{position:absolute;left:0;top:0;bottom:0;width:100%;transform-origin:left;transform:scaleX(0);
  background:linear-gradient(180deg,#f7e7b4,#d9b25a 60%,#b8862e);box-shadow:0 0 8px rgba(244,226,184,.45);
  animation:fg-fill .15s ease-out forwards}
.fg-gap{position:absolute;top:0;bottom:0;right:0;opacity:0;border-radius:0 3px 3px 0;
  background:repeating-linear-gradient(135deg,var(--gc) 0 3px,transparent 3px 6px);box-shadow:inset 0 0 0 1.5px var(--gc),0 0 10px var(--gc);
  animation:fg-breathe 2.4s ease-in-out infinite}
@keyframes fg-fill{to{transform:scaleX(1)}}
@keyframes fg-breathe{0%,100%{opacity:.35}50%{opacity:1}}
@media (prefers-reduced-motion:reduce){.fg-f{animation:none;transform:scaleX(1)}.fg-gap{animation:none;opacity:.6}}
`;

export function FillGauge({
  elements,
  gap,
  tone = "light",
  showLine = true,
  lineClassName,
  lineColor,
}: {
  elements: ElementKo[];
  /** 마지막 칸의 빈 곳 (%), 40~60 */
  gap?: number;
  tone?: "light" | "dark";
  showLine?: boolean;
  lineClassName?: string;
  lineColor?: string;
}) {
  const g = Math.min(FILL_GAP_MAX, Math.max(FILL_GAP_MIN, Math.round(gap ?? 50)));
  // 밝은 바탕에서는 쇠(은백)·흙이 금빛과 섞여 보이지 않게 조금 짙은 색 (여러 기운이면 첫 기운 색)
  const gapColor = (tone === "dark" ? FILL_COLOR : FILL_COLOR_ON_LIGHT)[elements[0]];
  return (
    <div>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div
        className={`fg mx-auto max-w-[300px]${tone === "dark" ? " fg-dark" : ""}`}
        role="img"
        aria-label={`일곱 칸 중 여섯 칸이 금빛으로 차 있고, 마지막 칸은 ${100 - g}%까지 차 있어요. 남은 작은 빈자리는 ${fillNames(elements)}의 기운`}
      >
        {Array.from({ length: 7 }, (_, i) => (
          <span key={i} className="fg-c">
            <span className="fg-f" style={{ animationDelay: `${i * 0.15}s`, width: i < 6 ? "100%" : `${100 - g}%` }} />
            {i === 6 && <span className="fg-gap" style={{ width: `${g}%`, ["--gc" as string]: gapColor, animationDelay: "1.05s" } as React.CSSProperties} />}
          </span>
        ))}
      </div>
      {showLine && (
        <p className={lineClassName ?? "mt-3 text-center text-[15px] font-semibold"} style={{ color: lineColor, wordBreak: "keep-all" }}>
          {fillLine(elements)}
        </p>
      )}
    </div>
  );
}
