/**
 * 오행 분포를 레이더(오각형) 차트로 시각화한다.
 *
 * 새 라이브러리를 추가하지 않고 순수 SVG로 직접 그렸다 - 데이터 포인트가
 * 5개뿐인 단순한 차트라 차트 라이브러리를 통째로 번들에 넣을 이유가 없고,
 * `/result` 페이지는 이미 saju.elements.summary.counts(목화토금수 각각의
 * 실제 계산된 점수)를 갖고 있으므로 그 값을 그대로 그린다 - 새로 계산하지 않는다.
 */
const ELEMENT_ORDER = ["목", "화", "토", "금", "수"] as const;
type ElementKey = (typeof ELEMENT_ORDER)[number];

const ELEMENT_COLORS: Record<ElementKey, string> = {
  목: "#3d6b4c",
  화: "#b54a3f",
  토: "#b08d57",
  금: "#6e7075",
  수: "#2f4a73",
};

const SIZE = 240;
const CENTER = SIZE / 2;
const MAX_RADIUS = 86;
const RINGS = [0.25, 0.5, 0.75, 1];

function pointOnAxis(index: number, fraction: number): { x: number; y: number } {
  // 5개 축을 12시 방향부터 시계방향으로 72°씩 배치
  const angle = (Math.PI * 2 * index) / ELEMENT_ORDER.length - Math.PI / 2;
  return {
    x: CENTER + Math.cos(angle) * MAX_RADIUS * fraction,
    y: CENTER + Math.sin(angle) * MAX_RADIUS * fraction,
  };
}

export function ElementRadarChart({ counts }: { counts: Record<string, number> }) {
  const maxValue = Math.max(...ELEMENT_ORDER.map((el) => counts[el] ?? 0), 1e-6);

  const polygonPoints = ELEMENT_ORDER.map((el, i) => {
    const fraction = (counts[el] ?? 0) / maxValue;
    const p = pointOnAxis(i, Math.max(fraction, 0.04)); // 값이 0이어도 점이 중앙에 묻히지 않게 최소 여백
    return `${p.x},${p.y}`;
  }).join(" ");

  return (
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} width="100%" height="100%" role="img" aria-label="오행 분포 레이더 차트">
      {/* 배경 그리드 링 */}
      {RINGS.map((r) => {
        const ringPoints = ELEMENT_ORDER.map((_, i) => {
          const p = pointOnAxis(i, r);
          return `${p.x},${p.y}`;
        }).join(" ");
        return <polygon key={r} points={ringPoints} fill="none" stroke="var(--color-line)" strokeWidth={1} />;
      })}

      {/* 축 선 */}
      {ELEMENT_ORDER.map((_, i) => {
        const p = pointOnAxis(i, 1);
        return <line key={i} x1={CENTER} y1={CENTER} x2={p.x} y2={p.y} stroke="var(--color-line)" strokeWidth={1} />;
      })}

      {/* 실제 데이터 폴리곤 */}
      <polygon points={polygonPoints} fill="var(--color-accent)" fillOpacity={0.18} stroke="var(--color-accent)" strokeWidth={2} />

      {/* 각 꼭짓점 + 라벨 */}
      {ELEMENT_ORDER.map((el, i) => {
        const fraction = (counts[el] ?? 0) / maxValue;
        const dot = pointOnAxis(i, Math.max(fraction, 0.04));
        const label = pointOnAxis(i, 1.22);
        return (
          <g key={el}>
            <circle cx={dot.x} cy={dot.y} r={4} fill={ELEMENT_COLORS[el]} />
            <text
              x={label.x}
              y={label.y}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={13}
              fontWeight={700}
              fill={ELEMENT_COLORS[el]}
            >
              {el}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
