/**
 * 랜딩페이지용 오리지널 SVG 일러스트 3장.
 *
 * 전부 이 파일 안에서 직접 그린 벡터 그림이다 - 사진도, AI 이미지 생성도,
 * 외부에서 가져온 그림도 아니다. 실존 인물·캐릭터와 무관해서 저작권/초상권
 * 문제가 없고, 색상은 전부 기존 오행 팔레트를 재사용해서 서비스 전체와
 * 톤이 일치한다.
 *
 * 1) SajuEmblemIllustration - 사주 원국(4기둥)을 추상화한 히어로 엠블럼
 * 2) FortuneSunMoonIllustration - 오늘의 운세 섹션용 해/달 모티프
 * 3) FaceReadingIllustration - 관상 섹션용 얼굴 윤곽 + 측정선 (실제 사진 아님)
 */

export function SajuEmblemIllustration() {
  return (
    <svg viewBox="0 0 200 200" width="100%" height="100%" role="img" aria-label="사주 원국을 형상화한 그림">
      <circle cx="100" cy="100" r="92" fill="none" stroke="var(--color-line)" strokeWidth="1" />
      {/* 4기둥(년주/월주/일주/시주)을 네 개의 꽃잎으로 추상화 */}
      {[
        { angle: -90, color: "#3d6b4c" },
        { angle: 0, color: "#b54a3f" },
        { angle: 90, color: "#b08d57" },
        { angle: 180, color: "#2f4a73" },
      ].map(({ angle, color }, i) => {
        const rad = (angle * Math.PI) / 180;
        const cx = 100 + Math.cos(rad) * 46;
        const cy = 100 + Math.sin(rad) * 46;
        return <circle key={i} cx={cx} cy={cy} r="30" fill={color} fillOpacity="0.16" stroke={color} strokeWidth="1.5" />;
      })}
      {/* 중심 - 일간(본인) */}
      <circle cx="100" cy="100" r="22" fill="var(--color-accent)" fillOpacity="0.14" stroke="var(--color-accent)" strokeWidth="1.5" />
      <text x="100" y="107" textAnchor="middle" fontSize="22" fontFamily="var(--font-serif)" fontWeight="700" fill="var(--color-accent)">
        命
      </text>
    </svg>
  );
}

export function FortuneSunMoonIllustration() {
  return (
    <svg viewBox="0 0 200 140" width="100%" height="100%" role="img" aria-label="오늘의 운세를 형상화한 해와 달 그림">
      <circle cx="68" cy="68" r="38" fill="#b54a3f" fillOpacity="0.16" stroke="#b54a3f" strokeWidth="1.5" />
      {Array.from({ length: 10 }).map((_, i) => {
        const a = (i / 10) * Math.PI * 2;
        const x1 = 68 + Math.cos(a) * 44;
        const y1 = 68 + Math.sin(a) * 44;
        const x2 = 68 + Math.cos(a) * 52;
        const y2 = 68 + Math.sin(a) * 52;
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#b54a3f" strokeWidth="1.5" opacity="0.5" />;
      })}
      <path
        d="M 132 40 A 28 28 0 1 0 150 90 A 22 22 0 1 1 132 40 Z"
        fill="#2f4a73"
        fillOpacity="0.18"
        stroke="#2f4a73"
        strokeWidth="1.5"
      />
    </svg>
  );
}

export function FaceReadingIllustration() {
  return (
    <svg viewBox="0 0 160 200" width="100%" height="100%" role="img" aria-label="관상 측정 부위를 형상화한 얼굴 윤곽 그림">
      {/* 추상화된 얼굴 윤곽 - 실제 사진이 아니라 기하학적 도형이다 */}
      <ellipse cx="80" cy="100" rx="52" ry="68" fill="var(--color-paper-soft)" stroke="var(--color-ink-faint)" strokeWidth="1.5" />
      {/* 측정선 */}
      <line x1="80" y1="36" x2="80" y2="164" stroke="var(--color-accent)" strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />
      <line x1="34" y1="90" x2="126" y2="90" stroke="var(--color-accent)" strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />
      {/* 이마 */}
      <line x1="48" y1="58" x2="112" y2="58" stroke="#b08d57" strokeWidth="1.5" />
      {/* 눈 */}
      <ellipse cx="62" cy="92" rx="7" ry="3.5" fill="none" stroke="#2f4a73" strokeWidth="1.5" />
      <ellipse cx="98" cy="92" rx="7" ry="3.5" fill="none" stroke="#2f4a73" strokeWidth="1.5" />
      {/* 코 */}
      <path d="M 80 88 L 76 118 L 84 118 Z" fill="none" stroke="#3d6b4c" strokeWidth="1.5" />
      {/* 입 */}
      <path d="M 66 140 Q 80 146 94 140" fill="none" stroke="#9c3b3b" strokeWidth="1.5" />
      {/* 턱선 */}
      <path d="M 44 120 Q 80 172 116 120" fill="none" stroke="var(--color-ink-faint)" strokeWidth="1.5" />
    </svg>
  );
}
