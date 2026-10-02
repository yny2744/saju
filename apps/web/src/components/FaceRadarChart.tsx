import type { FaceFeatureBuckets, FeatureBucket } from "@/server/face/types";

/**
 * 관상 6개 특징 버킷(low/mid/high)을 육각형 레이더로 시각화한다.
 * 오행 레이더 차트(ElementRadarChart)와 같은 이유로 순수 SVG로 직접 그렸다 -
 * 데이터 포인트가 6개뿐이라 차트 라이브러리가 필요 없다.
 *
 * "강도"는 low/mid/high를 0~100 스케일로 균등 변환한 것뿐이다 - 좋고 나쁨을
 * 의미하지 않는다 (예: 얼굴형이 "high"라고 더 좋은 게 아니라 그냥 특징이
 * 다르다는 뜻). 실제 서버가 계산한 버킷 값만 그대로 시각화할 뿐, 새로
 * 판정하지 않는다.
 */
const AXES: Array<{ key: keyof FaceFeatureBuckets; label: string }> = [
  { key: "faceShape", label: "얼굴형" },
  { key: "forehead", label: "이마" },
  { key: "eyeSpacing", label: "눈" },
  { key: "nose", label: "코" },
  { key: "mouth", label: "입" },
  { key: "jaw", label: "턱선" },
];

const BUCKET_SCORE: Record<FeatureBucket, number> = { low: 35, mid: 65, high: 95 };

const SIZE = 240;
const CENTER = SIZE / 2;
const MAX_RADIUS = 86;
const RINGS = [0.25, 0.5, 0.75, 1];

function pointOnAxis(index: number, total: number, fraction: number): { x: number; y: number } {
  const angle = (Math.PI * 2 * index) / total - Math.PI / 2;
  return {
    x: CENTER + Math.cos(angle) * MAX_RADIUS * fraction,
    y: CENTER + Math.sin(angle) * MAX_RADIUS * fraction,
  };
}

export function FaceRadarChart({ buckets }: { buckets: FaceFeatureBuckets }) {
  const total = AXES.length;

  const polygonPoints = AXES.map(({ key }, i) => {
    const score = BUCKET_SCORE[buckets[key]] / 100;
    const p = pointOnAxis(i, total, score);
    return `${p.x},${p.y}`;
  }).join(" ");

  return (
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} width="100%" height="100%" role="img" aria-label="관상 특징 레이더 차트">
      {RINGS.map((r) => {
        const ringPoints = AXES.map((_, i) => {
          const p = pointOnAxis(i, total, r);
          return `${p.x},${p.y}`;
        }).join(" ");
        return <polygon key={r} points={ringPoints} fill="none" stroke="var(--color-line)" strokeWidth={1} />;
      })}

      {AXES.map((_, i) => {
        const p = pointOnAxis(i, total, 1);
        return <line key={i} x1={CENTER} y1={CENTER} x2={p.x} y2={p.y} stroke="var(--color-line)" strokeWidth={1} />;
      })}

      <polygon points={polygonPoints} fill="var(--color-accent)" fillOpacity={0.18} stroke="var(--color-accent)" strokeWidth={2} />

      {AXES.map(({ key, label }, i) => {
        const score = BUCKET_SCORE[buckets[key]] / 100;
        const dot = pointOnAxis(i, total, score);
        const labelPos = pointOnAxis(i, total, 1.22);
        return (
          <g key={key}>
            <circle cx={dot.x} cy={dot.y} r={4} fill="var(--color-accent)" />
            <text
              x={labelPos.x}
              y={labelPos.y}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={13}
              fontWeight={700}
              fill="var(--color-ink)"
            >
              {label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
