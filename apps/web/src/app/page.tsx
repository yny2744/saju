import { Footer } from "@/components/Footer";

/**
 * 지시서: "서비스 소개 + 가격 + 시작하기 버튼" 수준의 최소 랜딩 화면.
 * 특정 브랜드 톤(용사주식 정통 포지셔닝 / 청월당식 캐주얼 포지셔닝)을
 * 아직 정하지 않았으므로 중립적으로 작성했다 - 양동전략의 실제 랜딩은
 * Phase 15(랜딩페이지 생성기)에서 제대로 만든다. 이 화면은 Toss 가맹 심사와
 * 당장의 서비스 오픈을 위한 최소 버전이다.
 *
 * 서버 컴포넌트로 작성했다 - 입력 폼(상태/이벤트 필요)은 /start로 분리되어
 * 있어서 이 페이지는 정적 텍스트와 링크만 있으면 된다.
 */
export default function LandingPage() {
  return (
    <>
      <main className="mx-auto min-h-screen max-w-xl px-5 pb-16 pt-14 sm:pt-20">
        <p
          className="mb-3 text-sm font-semibold"
          style={{ fontFamily: "var(--font-serif)", color: "var(--color-accent)" }}
        >
          류결사주
        </p>
        <h1 className="mb-4 text-[32px] font-bold leading-snug">
          생년월일로 보는
          <br />
          나의 사주·운세·관상
        </h1>
        <p className="mb-8 text-[15px] leading-relaxed" style={{ color: "var(--color-ink-soft)" }}>
          전통 명리학을 바탕으로 사주 원국, 오행과 십신, 올해의 흐름을 풀어드려요. 오늘의 운세와 얼굴 사진
          기반 관상 풀이도 무료로 체험하실 수 있고, 더 깊은 해석은 결제 후 바로 확인하실 수 있어요.
        </p>

        <a href="/start" className="btn-primary mb-10 block text-center">
          무료로 내 사주 보기
        </a>

        <section className="mb-10 space-y-3">
          <h2 className="section-label">이런 걸 보실 수 있어요</h2>
          <ul className="space-y-2 text-sm" style={{ color: "var(--color-ink-soft)" }}>
            <li>· 사주 원국, 오행·십신 분포와 성향·재물·연애·직업 흐름 (무료)</li>
            <li>· 오늘의 운세와 일진 (무료)</li>
            <li>· 얼굴 사진으로 보는 관상 풀이 (무료, 사진은 기기 안에서만 분석)</li>
          </ul>
        </section>

        <section className="mb-10">
          <h2 className="section-label mb-3">더 깊은 해석이 필요하면</h2>
          <div className="space-y-2.5">
            <div className="flex items-center justify-between rounded-xl p-3.5" style={{ backgroundColor: "var(--color-paper-soft)" }}>
              <span className="text-sm">베이직 심층 분석</span>
              <span className="text-sm font-semibold">3,900원</span>
            </div>
            <div className="flex items-center justify-between rounded-xl p-3.5" style={{ backgroundColor: "var(--color-paper-soft)" }}>
              <span className="text-sm">프리미엄 종합 리포트</span>
              <span className="text-sm font-semibold">9,900원</span>
            </div>
            <div className="flex items-center justify-between rounded-xl p-3.5" style={{ backgroundColor: "var(--color-paper-soft)" }}>
              <span className="text-sm">관상 심층 해석 · 인연 궁합</span>
              <span className="text-sm font-semibold">4,900원</span>
            </div>
          </div>
        </section>

        <a href="/start" className="btn-secondary block text-center">
          시작하기
        </a>

        <p className="mt-6 text-xs leading-relaxed" style={{ color: "var(--color-ink-faint)" }}>
          모든 사주·운세·관상 콘텐츠는 전통 문화·오락 목적의 참고 정보이며, 성격·재물·건강·연애 등을
          과학적으로 확정하지 않습니다.
        </p>
      </main>
      <Footer />
    </>
  );
}
