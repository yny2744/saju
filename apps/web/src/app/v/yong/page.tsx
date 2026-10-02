import { Footer } from "@/components/Footer";

/**
 * "용사주 스타일" 랜딩 미리보기 (Phase 10.5, 2026-10).
 *
 * ⚠️ 이건 당장 실제 메인(/)을 대체하는 게 아니라 별도 경로(/v/yong)의
 * 미리보기다 — 확인 후 괜찮으면 메인으로 승격시킨다.
 *
 * 디자인 원칙: 기존 Phase 8 "한지" 라이트 테마(globals.css)는 전혀 건드리지
 * 않았다. 이 페이지만 어두운 금색 톤을 쓰기 위해, 공용 .btn-primary 등
 * 전역 클래스는 쓰지 않고 이 파일 안에서 직접 색을 지정했다 (다른 페이지에
 * 영향 없음).
 *
 * 정직성 원칙 (용사주 벤치마킹 중 발견한 과장 요소는 의도적으로 뺐다):
 *   - "가짜 AI 사주 그만" 같은 비교 문구 대신, 우리가 실제로 하는 것
 *     (결정론적 계산 엔진 + AI는 해석만)을 그대로 설명한다 - 우리도 유료
 *     해석엔 AI를 쓰므로 "AI 아님"이라 쓰면 거짓이 된다.
 *   - 실이용자 후기가 아직 없어 리뷰 섹션을 넣지 않았다 - 허위 후기 금지.
 *   - "2,000년 역사의 마의상법" 같이 우리가 실제 구현하지 않은 고전 체계를
 *     인용하지 않는다 - 관상은 우리가 실제로 측정하는 6개 부위만 언급한다.
 *   - 가격은 지금 실제 승인된 가격(무료/3,900/9,900/4,900)만 쓴다.
 */

const DARK = {
  bg: "#120f0b",
  bgSoft: "#1c1712",
  gold: "#dcb15c",
  goldSoft: "rgba(220, 177, 92, 0.12)",
  cream: "#f4ecd8",
  creamSoft: "#b7ac93",
  line: "rgba(220, 177, 92, 0.22)",
};

const TRUST_POINTS = [
  {
    num: "一",
    title: "결정론적 명리학 계산 엔진",
    body: "60갑자 전체, 오행·십신 수치까지 정해진 계산식으로 산출합니다. AI가 추측하지 않습니다.",
  },
  {
    num: "二",
    title: "대운·세운까지",
    body: "평생의 10년 단위 흐름(대운)부터 올해의 흐름(세운)까지, 생략 없이 계산합니다.",
  },
  {
    num: "三",
    title: "계산은 엔진이, 문장은 AI가",
    body: "유료 심층 해석은 이미 계산된 수치를 AI가 글로 풀어 쓰는 역할만 합니다. 사주 자체를 AI가 지어내지 않습니다.",
  },
  {
    num: "四",
    title: "매일 바뀌는 오늘의 운세",
    body: "오늘의 일진과 사주 원국의 관계를 계산해, AI 호출 없이 매일 새로운 운세를 무료로 보여드립니다.",
  },
  {
    num: "五",
    title: "사진은 기기 안에서만",
    body: "관상 분석은 촬영한 사진을 서버로 보내지 않고, 이용자의 기기(브라우저) 안에서만 분석합니다.",
  },
];

const PRODUCTS = [
  { name: "만세력 · 사주 원국", price: "무료", desc: "오행·십신·신강신약" },
  { name: "오늘의 운세", price: "무료", desc: "매일 바뀌는 일진 풀이" },
  { name: "관상 분석", price: "무료", desc: "얼굴 사진으로 보는 관상" },
  { name: "베이직 심층 분석", price: "3,900원", desc: "연애·재물·직업·올해 운세" },
  { name: "프리미엄 종합 리포트", price: "9,900원", desc: "베이직 전체 + 월별 흐름" },
  { name: "관상 심층 해석 · 인연 궁합", price: "4,900원", desc: "얼굴 특징 상세 + 어울리는 인연" },
];

export default function YongStylePreviewPage() {
  return (
    <div style={{ backgroundColor: DARK.bg, color: DARK.cream }}>
      <main className="mx-auto min-h-screen max-w-xl px-5 pb-16 pt-14 sm:pt-20">
        {/* 헤더 */}
        <div className="mb-8 flex items-center justify-between">
          <p className="text-lg font-bold tracking-wide" style={{ fontFamily: "var(--font-serif)", color: DARK.gold }}>
            龍 류결사주
          </p>
          <a
            href="/start"
            className="rounded-full border px-4 py-1.5 text-xs font-medium"
            style={{ borderColor: DARK.line, color: DARK.gold }}
          >
            내 사주함
          </a>
        </div>

        {/* 히어로 */}
        <div className="mb-3 flex justify-center">
          <svg width="96" height="96" viewBox="0 0 96 96" fill="none" aria-hidden="true">
            <circle cx="48" cy="48" r="46" stroke={DARK.gold} strokeWidth="1.5" opacity="0.5" />
            <circle cx="48" cy="48" r="36" stroke={DARK.gold} strokeWidth="1" opacity="0.35" />
            <text x="48" y="60" textAnchor="middle" fontSize="40" fill={DARK.gold} fontFamily="var(--font-serif)">
              龍
            </text>
          </svg>
        </div>

        <h1 className="mb-3 text-center text-[30px] font-bold leading-snug" style={{ fontFamily: "var(--font-serif)" }}>
          생년월일로 보는
          <br />
          나의 사주·운세·관상
        </h1>
        <p className="mx-auto mb-2 max-w-sm text-center text-[15px] leading-relaxed" style={{ color: DARK.creamSoft }}>
          사주와 관상은 통계입니다. 정해진 계산식으로 오행·십신·대운·세운을 산출하고, AI는 그 결과를 풀어 쓰는
          역할만 합니다.
        </p>

        <div className="mt-8 space-y-2.5">
          <a
            href="/start"
            className="block rounded-full py-3.5 text-center text-sm font-semibold"
            style={{ backgroundColor: DARK.gold, color: "#1a1409" }}
          >
            무료로 내 사주 보기
          </a>
          <a
            href="#products"
            className="block py-2 text-center text-xs underline underline-offset-4"
            style={{ color: DARK.creamSoft }}
          >
            제공하는 서비스 보기
          </a>
        </div>

        {/* 왜 류결사주인가 */}
        <section className="mt-16">
          <h2 className="mb-1 text-center text-xl font-bold" style={{ fontFamily: "var(--font-serif)", color: DARK.gold }}>
            왜 류결사주인가
          </h2>
          <p className="mb-7 text-center text-xs" style={{ color: DARK.creamSoft }}>
            귀신을 부르는 신점이 아니라, 계산에 기반한 명리학입니다.
          </p>

          <div className="space-y-5">
            {TRUST_POINTS.map((p) => (
              <div
                key={p.num}
                className="rounded-2xl p-4"
                style={{ backgroundColor: DARK.bgSoft, border: `1px solid ${DARK.line}` }}
              >
                <div className="mb-1.5 flex items-center gap-2.5">
                  <span
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold"
                    style={{ backgroundColor: DARK.goldSoft, color: DARK.gold, fontFamily: "var(--font-serif)" }}
                  >
                    {p.num}
                  </span>
                  <h3 className="text-[15px] font-semibold">{p.title}</h3>
                </div>
                <p className="pl-9 text-sm leading-relaxed" style={{ color: DARK.creamSoft }}>
                  {p.body}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* 상품 목록 */}
        <section id="products" className="mt-16 scroll-mt-8">
          <h2 className="mb-5 text-center text-xl font-bold" style={{ fontFamily: "var(--font-serif)", color: DARK.gold }}>
            제공하는 서비스
          </h2>
          <div className="space-y-2.5">
            {PRODUCTS.map((p) => (
              <div
                key={p.name}
                className="flex items-center justify-between rounded-xl px-4 py-3.5"
                style={{ backgroundColor: DARK.bgSoft, border: `1px solid ${DARK.line}` }}
              >
                <div>
                  <p className="text-[15px] font-medium">{p.name}</p>
                  <p className="mt-0.5 text-xs" style={{ color: DARK.creamSoft }}>
                    {p.desc}
                  </p>
                </div>
                <span className="shrink-0 pl-3 text-sm font-semibold" style={{ color: p.price === "무료" ? DARK.creamSoft : DARK.gold }}>
                  {p.price}
                </span>
              </div>
            ))}
          </div>
        </section>

        <a
          href="/start"
          className="mt-10 block rounded-full py-3.5 text-center text-sm font-semibold"
          style={{ backgroundColor: DARK.gold, color: "#1a1409" }}
        >
          시작하기
        </a>

        <p className="mt-6 text-center text-xs leading-relaxed" style={{ color: DARK.creamSoft }}>
          모든 사주·운세·관상 콘텐츠는 전통 문화·오락 목적의 참고 정보이며, 성격·재물·건강·연애 등을
          과학적으로 확정하지 않습니다.
        </p>
      </main>

      {/* Footer는 공용 컴포넌트를 그대로 쓰되, 어두운 배경에 맞게 감싼다 */}
      <div style={{ backgroundColor: DARK.bg }}>
        <div
          className="mx-auto max-w-xl px-5"
          style={{
            // Footer 내부가 라이트 테마 CSS 변수를 쓰므로, 이 블록 안에서만 값을 덮어써서
            // 다른 페이지(라이트 테마)에는 전혀 영향 없이 이 페이지에서만 어둡게 보이게 한다.
            ["--color-line" as string]: DARK.line,
            ["--color-ink-faint" as string]: DARK.creamSoft,
          }}
        >
          <Footer />
        </div>
      </div>
    </div>
  );
}
