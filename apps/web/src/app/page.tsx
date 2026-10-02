import { Footer } from "@/components/Footer";
import { LoginButtons } from "@/components/LoginButtons";

/**
 * 믹스 랜딩페이지 (Phase 10.5, 2026-10).
 *
 * 용사주(정통·숫자·신뢰 중심)와 청월당(장 구조·친근한 톤)을 벤치마킹해서
 * "구조적 아이디어"만 가져왔다 - 색상·심볼·캐릭터·카피는 그대로 베끼지
 * 않았다 (이전 /v/yong 버전이 용사주를 너무 그대로 복제해서 지우고 다시
 * 만든 결과물이다):
 *   - 용사주에서: "왜 류결사주인가"라는 번호 매긴 신뢰 섹션 구조만 차용
 *     (용 엠블럼, 검정+금색, 一二三四五 한자 번호는 안 씀)
 *   - 청월당에서: 상품을 "장(章)" 단위로 묶어서 보여주는 구조만 차용
 *     (캐릭터 일러스트, 웹툰 말풍선, 가짜 카운트다운은 안 씀)
 *
 * 정직성 원칙 (반복해서 지킴):
 *   - 실이용자가 아직 0명이라 후기 섹션 없음
 *   - "국내 1위", "~협업" 같은 근거 없는 주장 없음
 *   - 관상/사주에 대해 우리가 실제로 구현하지 않은 고전 체계(마의상법 등)를
 *     인용하지 않음
 *   - 가격은 지금 실제 승인된 가격만 사용
 *
 * "류결의 명견만리"는 상표가 아니라 작은 슬로건 한 줄로만 사용한다 (상표
 * 충돌 우려로 전면에 크게 내세우지 않기로 함 - decisions.md 참고).
 *
 * 로그인(카카오/이메일) 버튼은 UI 진입점만 있고 아직 실제로 동작하지
 * 않는다 (LoginButtons.tsx 참고 - 회원 DB가 없어 Phase 11/12 선행 필요).
 */

const TRUST_POINTS = [
  {
    num: "1",
    title: "결정론적 명리학 계산 엔진",
    body: "60갑자 전체, 오행·십신 수치까지 정해진 계산식으로 산출합니다. 사주 자체를 AI가 추측하지 않습니다.",
  },
  {
    num: "2",
    title: "대운·세운까지 생략 없이",
    body: "평생의 10년 단위 흐름(대운)부터 올해의 흐름(세운)까지 계산합니다.",
  },
  {
    num: "3",
    title: "계산은 엔진이, 문장은 AI가",
    body: "유료 심층 해석은 이미 계산된 수치를 AI가 글로 풀어 쓰는 역할만 합니다.",
  },
  {
    num: "4",
    title: "사진은 기기 안에서만",
    body: "관상 분석은 촬영한 사진을 서버로 보내지 않고, 이용자의 기기 안에서만 분석합니다.",
  },
];

const CHAPTERS = [
  {
    label: "1장 · 무료로 보기",
    items: [
      { name: "만세력 · 사주 원국", desc: "오행·십신·신강신약", price: "무료" },
      { name: "오늘의 운세", desc: "매일 바뀌는 일진 풀이", price: "무료" },
      { name: "관상 분석", desc: "얼굴 사진으로 보는 관상", price: "무료" },
    ],
  },
  {
    label: "2장 · 더 깊은 해석",
    items: [
      { name: "베이직 심층 분석", desc: "연애·재물·직업·올해 운세", price: "3,900원" },
      { name: "프리미엄 종합 리포트", desc: "베이직 전체 + 월별 흐름", price: "9,900원" },
      { name: "관상 심층 해석 · 인연 궁합", desc: "얼굴 특징 상세 + 어울리는 인연", price: "4,900원" },
    ],
  },
];

export default function LandingPage() {
  return (
    <>
      <main className="mx-auto min-h-screen max-w-xl px-5 pb-16 pt-12 sm:pt-16">
        {/* 헤더 + 로그인 */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <p className="text-base font-bold" style={{ fontFamily: "var(--font-serif)", color: "var(--color-accent)" }}>
              류결사주
            </p>
            <p className="text-[11px]" style={{ color: "var(--color-ink-faint)" }}>
              류결의 명견만리
            </p>
          </div>
        </div>
        <LoginButtons />

        {/* 히어로 */}
        <div className="mt-10 mb-10">
          <div className="mb-3 flex flex-wrap gap-1.5">
            {["무료", "회원가입 불필요", "약 1분 소요"].map((badge) => (
              <span
                key={badge}
                className="rounded-full px-2.5 py-1 text-[11px] font-medium"
                style={{ backgroundColor: "var(--color-accent-soft)", color: "var(--color-accent)" }}
              >
                {badge}
              </span>
            ))}
          </div>
          <h1 className="mb-3 text-[28px] font-bold leading-snug">
            생년월일로 보는
            <br />
            나의 사주·운세·관상
          </h1>
          <p className="text-[15px] leading-relaxed" style={{ color: "var(--color-ink-soft)" }}>
            정해진 계산식으로 오행·십신·대운·세운을 산출하고, AI는 그 결과를 풀어 쓰는 역할만 합니다. 오늘의
            운세와 관상도 무료로 체험해보세요.
          </p>
          <a href="/start" className="btn-primary mt-6 block text-center">
            무료로 내 사주 보기
          </a>
        </div>

        {/* 왜 류결사주인가 */}
        <section className="mb-12">
          <h2 className="mb-5 text-lg font-bold" style={{ fontFamily: "var(--font-serif)" }}>
            왜 류결사주인가
          </h2>
          <div className="space-y-3">
            {TRUST_POINTS.map((p) => (
              <div key={p.num} className="rounded-xl p-3.5" style={{ backgroundColor: "var(--color-paper-soft)" }}>
                <div className="mb-1 flex items-center gap-2">
                  <span
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                    style={{ backgroundColor: "var(--color-accent-soft)", color: "var(--color-accent)" }}
                  >
                    {p.num}
                  </span>
                  <h3 className="text-sm font-semibold">{p.title}</h3>
                </div>
                <p className="pl-8 text-[13px] leading-relaxed" style={{ color: "var(--color-ink-soft)" }}>
                  {p.body}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* 상품 - 장 구조 */}
        <section className="mb-10">
          {CHAPTERS.map((ch) => (
            <div key={ch.label} className="mb-7">
              <h2 className="mb-3 text-sm font-semibold" style={{ color: "var(--color-ink-faint)" }}>
                {ch.label}
              </h2>
              <div className="space-y-2">
                {ch.items.map((item) => (
                  <div
                    key={item.name}
                    className="flex items-center justify-between rounded-xl px-4 py-3"
                    style={{ border: "1px solid var(--color-line)" }}
                  >
                    <div>
                      <p className="text-[14px] font-medium">{item.name}</p>
                      <p className="mt-0.5 text-xs" style={{ color: "var(--color-ink-faint)" }}>
                        {item.desc}
                      </p>
                    </div>
                    <span
                      className="shrink-0 pl-3 text-sm font-semibold"
                      style={{ color: item.price === "무료" ? "var(--color-ink-faint)" : "var(--color-accent)" }}
                    >
                      {item.price}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
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
