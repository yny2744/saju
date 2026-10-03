/**
 * 류결사주 로고 — "류결" 두 글자가 물결 곡선을 따라 흐르는 워드마크.
 * 전부 이 파일 안에서 직접 그린 SVG다 (폰트가 아니라 곡선 경로 위에 글자를
 * 얹은 것) - 사진도 외부 리소스도 아니라 저작권 걱정 없고, 다른 랜딩
 * 일러스트(LandingIllustrations.tsx)와 같은 원칙으로 만들었다.
 */
export function Logo({ height = 40 }: { height?: number }) {
  return (
    <svg height={height} viewBox="0 0 220 90" role="img" aria-label="류결사주 로고">
      <defs>
        <path id="logo-wave" d="M 8 48 C 42 20, 78 70, 112 48 C 136 32, 160 48, 196 34" fill="none" />
      </defs>
      <path
        d="M 8 48 C 42 20, 78 70, 112 48 C 136 32, 160 48, 196 34"
        fill="none"
        stroke="var(--color-accent)"
        strokeWidth="1"
        strokeDasharray="2 4"
        opacity="0.5"
      />
      <text fontFamily="var(--font-serif)" fontSize="30" fontWeight="700" letterSpacing="4" fill="var(--color-accent)">
        <textPath href="#logo-wave" startOffset="4">
          류결
        </textPath>
      </text>
      <path
        d="M 14 62 C 46 48, 78 76, 112 60 C 140 48, 168 62, 190 54"
        fill="none"
        stroke="var(--color-accent)"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.45"
      />
      <text x="110" y="86" textAnchor="middle" fontFamily="var(--font-serif)" fontSize="13" fontWeight="700" fill="var(--color-ink)">
        사주
      </text>
    </svg>
  );
}
