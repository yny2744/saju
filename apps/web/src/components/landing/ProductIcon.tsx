export type Kind = "report" | "basic" | "manse" | "face" | "match" | "today" | "tti" | "name";

/** 대문 상품 카드 왼쪽 아이콘 - 오리지널 SVG, 오행 색 재사용 */
export function ProductIcon({ kind }: { kind: Kind }) {
  const gold = "#b08d57";
  return (
    <svg viewBox="0 0 40 40" width="40" height="40" aria-hidden="true">
      {kind === "report" && (
        <>
          <rect x="9" y="6" width="22" height="28" rx="2" fill="var(--color-accent)" />
          <rect x="12" y="6" width="2" height="28" fill="#00000022" />
          <rect x="17" y="12" width="10" height="10" rx="1" fill="none" stroke={gold} strokeWidth="1.5" />
          <text x="22" y="20.5" textAnchor="middle" fontSize="8" fill={gold} style={{ fontFamily: "var(--font-serif)" }}>
            命
          </text>
        </>
      )}
      {kind === "basic" && (
        <>
          <circle cx="20" cy="20" r="14" fill="var(--color-ink)" />
          <path d="M20 6 A14 14 0 0 1 20 34 A7 7 0 0 1 20 20 A7 7 0 0 0 20 6Z" fill="var(--color-paper-soft)" />
          <circle cx="20" cy="13" r="2.2" fill="var(--color-ink)" />
          <circle cx="20" cy="27" r="2.2" fill="var(--color-paper-soft)" />
        </>
      )}
      {kind === "manse" && (
        <>
          {[0, 1, 2, 3].map((i) => (
            <g key={i}>
              <rect x={6 + i * 7.5} y="8" width="6" height="11" rx="1.5" fill={["var(--color-element-water)", "var(--color-element-wood)", "var(--color-element-fire)", "var(--color-element-earth)"][i]} />
              <rect x={6 + i * 7.5} y="21" width="6" height="11" rx="1.5" fill="var(--color-paper-soft)" stroke="var(--color-line)" />
            </g>
          ))}
        </>
      )}
      {kind === "face" && (
        <>
          <ellipse cx="20" cy="20" rx="11" ry="14" fill="var(--color-paper-soft)" stroke="var(--color-ink-soft)" strokeWidth="1.3" />
          <line x1="9" y1="15" x2="31" y2="15" stroke={gold} strokeWidth="0.8" strokeDasharray="1.5 1.5" />
          <line x1="9" y1="24" x2="31" y2="24" stroke={gold} strokeWidth="0.8" strokeDasharray="1.5 1.5" />
          <circle cx="15.5" cy="17.5" r="1.4" fill="var(--color-ink)" />
          <circle cx="24.5" cy="17.5" r="1.4" fill="var(--color-ink)" />
          <path d="M16 28 Q20 30 24 28" fill="none" stroke="var(--color-ink)" strokeWidth="1.2" strokeLinecap="round" />
        </>
      )}
      {kind === "match" && (
        <>
          <circle cx="15" cy="20" r="10" fill="var(--color-element-fire)" fillOpacity="0.85" />
          <circle cx="25" cy="20" r="10" fill="var(--color-element-water)" fillOpacity="0.85" />
          <path d="M20 11.3 A10 10 0 0 1 20 28.7 A10 10 0 0 1 20 11.3Z" fill="var(--color-element-earth)" />
        </>
      )}
      {kind === "tti" && (
        <>
          <circle cx="20" cy="20" r="14" fill="none" stroke={gold} strokeWidth="1.5" />
          {Array.from({ length: 12 }).map((_, i) => {
            const a = (i * Math.PI) / 6 - Math.PI / 2;
            return <circle key={i} cx={20 + Math.cos(a) * 14} cy={20 + Math.sin(a) * 14} r="2.2" fill={i % 3 === 0 ? "var(--color-accent)" : gold} />;
          })}
          <text x="20" y="24.5" textAnchor="middle" fontSize="12" fill="var(--color-ink)" style={{ fontFamily: "var(--font-serif)" }}>
            子
          </text>
        </>
      )}
      {kind === "name" && (
        <>
          <rect x="8" y="6" width="24" height="28" rx="3" fill="var(--color-paper-soft)" stroke="var(--color-ink-soft)" strokeWidth="1.2" />
          <text x="20" y="18" textAnchor="middle" fontSize="10" fill="var(--color-accent)" style={{ fontFamily: "var(--font-serif)" }}>
            名
          </text>
          <line x1="12" y1="23" x2="28" y2="23" stroke={gold} strokeWidth="1.2" />
          <line x1="12" y1="27.5" x2="24" y2="27.5" stroke={gold} strokeWidth="1.2" />
        </>
      )}
      {kind === "today" && (
        <>
          <circle cx="20" cy="20" r="8" fill={gold} />
          {Array.from({ length: 8 }).map((_, i) => {
            const a = (i * Math.PI) / 4;
            return (
              <line key={i} x1={20 + Math.cos(a) * 11} y1={20 + Math.sin(a) * 11} x2={20 + Math.cos(a) * 15} y2={20 + Math.sin(a) * 15} stroke={gold} strokeWidth="2" strokeLinecap="round" />
            );
          })}
        </>
      )}
    </svg>
  );
}
