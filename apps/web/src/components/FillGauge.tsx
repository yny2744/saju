import type { ElementKo } from "@/lib/pillarView";
import { FILL_GAP_MAX, FILL_GAP_MIN, fillLine, fillNames } from "@/lib/fillGauge";

/**
 * "남은 작은 빈자리" 게이지 (2026-10-31 유샘) - 설명은 lib/fillGauge.ts.
 *   ① 일곱 칸이 왼쪽부터 차례로 금빛으로 차오른다 (한 칸에 0.15초)
 *   ② 마지막 칸은 "다 채워졌다가 ⇄ 덜 채워졌다가"를 약 3초에 한 번 숨 쉬듯 오간다 (같은 날 유샘 B안)
 *      덜 채워질 때 남는 빈 곳이 gap% - 빈 곳에는 색·빗금을 칠하지 않고 금빛만 쓴다 (기운 이름은 아래 문구로만)
 * 화면에 그려질 때 CSS 애니메이션으로 움직인다 (서버에서 그려도 같은 모양). 움직임을 줄인 기기에서는 덜 채워진 모양으로 멈춰 있다.
 * gap 이 없으면(예전에 만든 풀이) 50%.
 */

const CSS = `
.fg{display:flex;gap:6px}
.fg-c{position:relative;flex:1;height:16px;border-radius:3px;overflow:hidden;background:rgba(128,128,128,.14)}
.fg-dark .fg-c{background:rgba(255,255,255,.07)}
.fg-f{position:absolute;left:0;top:0;bottom:0;width:100%;transform-origin:left;transform:scaleX(0);
  background:linear-gradient(180deg,#f7e7b4,#d9b25a 60%,#b8862e);box-shadow:0 0 8px rgba(244,226,184,.45);
  animation:fg-fill .15s ease-out forwards}
.fg-last{animation:fg-fill .15s ease-out .9s forwards,fg-breath 3s ease-in-out 1.05s infinite}
@keyframes fg-fill{to{transform:scaleX(1)}}
@keyframes fg-breath{0%,100%{transform:scaleX(1)}50%{transform:scaleX(var(--lo))}}
@media (prefers-reduced-motion:reduce){.fg-f{animation:none;transform:scaleX(1)}.fg-last{transform:scaleX(var(--lo))}}
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
  /** 마지막 칸이 덜 채워질 때의 빈 곳 (%), 40~60 */
  gap?: number;
  tone?: "light" | "dark";
  showLine?: boolean;
  lineClassName?: string;
  lineColor?: string;
}) {
  const g = Math.min(FILL_GAP_MAX, Math.max(FILL_GAP_MIN, Math.round(gap ?? 50)));
  return (
    <div>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div
        className={`fg mx-auto max-w-[300px]${tone === "dark" ? " fg-dark" : ""}`}
        role="img"
        aria-label={`일곱 칸 중 여섯 칸이 금빛으로 차 있고, 마지막 칸은 ${100 - g}%와 가득 사이를 오가요. 남은 작은 빈자리는 ${fillNames(elements)}의 기운`}
      >
        {Array.from({ length: 7 }, (_, i) =>
          i < 6 ? (
            <span key={i} className="fg-c">
              <span className="fg-f" style={{ animationDelay: `${i * 0.15}s` }} />
            </span>
          ) : (
            <span key={i} className="fg-c">
              <span className="fg-f fg-last" style={{ ["--lo" as string]: String((100 - g) / 100) } as React.CSSProperties} />
            </span>
          )
        )}
      </div>
      {showLine && (
        <p className={lineClassName ?? "mt-3 text-center text-[15px] font-semibold"} style={{ color: lineColor, wordBreak: "keep-all" }}>
          {fillLine(elements)}
        </p>
      )}
    </div>
  );
}
