const SIZE = 140;
const STROKE = 12;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function CircularGauge({ value, label }: { value: number; label: string }) {
  const clamped = Math.max(0, Math.min(100, value));
  const offset = CIRCUMFERENCE * (1 - clamped / 100);

  return (
    <div className="flex flex-col items-center">
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label={`${label} ${clamped}퍼센트`}>
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="var(--color-line)"
          strokeWidth={STROKE}
        />
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
        />
        <text x={SIZE / 2} y={SIZE / 2 - 4} textAnchor="middle" fontSize={28} fontWeight={700} fill="var(--color-ink)">
          {clamped}
        </text>
        <text x={SIZE / 2} y={SIZE / 2 + 18} textAnchor="middle" fontSize={12} fill="var(--color-ink-faint)">
          기운 지수
        </text>
      </svg>
      <p className="mt-1 text-xs" style={{ color: "var(--color-ink-faint)" }}>
        {label}
      </p>
    </div>
  );
}
