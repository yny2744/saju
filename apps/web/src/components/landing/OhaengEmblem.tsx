/**
 * 류결사주 대문 중앙 문양 (2026-10-06, 용사주 대문의 "가운데 큰 그림" 자리).
 * 용 그림은 따라 하지 않고, 팔괘(八卦) 고리 + 오행 다섯 점 + 가운데 命 자로 새로 그린 오리지널 SVG.
 * 로고는 유샘이 따로 만든다 - 이 문양은 로고가 아니라 대문 장식이다.
 */

// 선천팔괘 순서, 아래 효부터 위 효 (1 = 양효 ━, 0 = 음효 ╍)
const TRIGRAMS: Array<[number, number, number]> = [
  [1, 1, 1], // 乾
  [1, 1, 0], // 兌
  [1, 0, 1], // 離
  [1, 0, 0], // 震
  [0, 1, 1], // 巽
  [0, 1, 0], // 坎
  [0, 0, 1], // 艮
  [0, 0, 0], // 坤
];

const ELEMENTS = [
  { ko: "木", color: "var(--color-element-wood)" },
  { ko: "火", color: "var(--color-element-fire)" },
  { ko: "土", color: "var(--color-element-earth)" },
  { ko: "金", color: "var(--color-element-metal)" },
  { ko: "水", color: "var(--color-element-water)" },
];

const GOLD = "#b08d57";

export function OhaengEmblem() {
  return (
    <svg viewBox="0 0 240 240" width="100%" height="100%" role="img" aria-label="팔괘와 오행을 담은 류결사주 문양">
      <circle cx="120" cy="120" r="114" fill="none" stroke={GOLD} strokeWidth="1.5" />
      <circle cx="120" cy="120" r="108" fill="none" stroke={GOLD} strokeWidth="0.6" strokeDasharray="2 4" />

      {/* 팔괘 고리 */}
      {TRIGRAMS.map((lines, i) => (
        <g key={i} transform={`rotate(${i * 45} 120 120)`}>
          {lines.map((yang, j) => {
            const y = 26 + (2 - j) * 7; // 바깥쪽이 위 효
            return yang ? (
              <rect key={j} x="106" y={y} width="28" height="4" rx="1" fill={GOLD} />
            ) : (
              <g key={j}>
                <rect x="106" y={y} width="11.5" height="4" rx="1" fill={GOLD} />
                <rect x="122.5" y={y} width="11.5" height="4" rx="1" fill={GOLD} />
              </g>
            );
          })}
        </g>
      ))}

      <circle cx="120" cy="120" r="70" fill="none" stroke={GOLD} strokeWidth="1" />

      {/* 오행 상생 고리 */}
      {ELEMENTS.map((el, i) => {
        const a = ((-90 + i * 72) * Math.PI) / 180;
        const x = 120 + Math.cos(a) * 52;
        const y = 120 + Math.sin(a) * 52;
        return (
          <g key={el.ko}>
            <circle cx={x} cy={y} r="13" fill={el.color} />
            <text x={x} y={y + 5} textAnchor="middle" fontSize="14" fill="#fff" style={{ fontFamily: "var(--font-serif)" }}>
              {el.ko}
            </text>
          </g>
        );
      })}

      <circle cx="120" cy="120" r="27" fill="var(--color-paper)" stroke={GOLD} strokeWidth="1.2" />
      <text x="120" y="131" textAnchor="middle" fontSize="30" fontWeight="700" fill="var(--color-accent)" style={{ fontFamily: "var(--font-serif)" }}>
        命
      </text>
    </svg>
  );
}
