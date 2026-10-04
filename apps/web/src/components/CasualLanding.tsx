import { LoginButtons } from "@/components/LoginButtons";

/**
 * "류결의사주" — 청월당 벤치마킹(구조만 차용: 이모지 제목 + 색깔 카드 +
 * 친근한 말투 + 테마별 묶음). 캐릭터 일러스트, 실제 협업 주장, 가짜 리뷰
 * 피드는 넣지 않았다. 가격은 실제 승인된 가격만 쓴다.
 *
 * "검색", "보관함"(저장 이력) 같은 청월당 UI 요소는 의도적으로 안 넣었다 -
 * 우리 서비스엔 아직 그 기능이 없어서, 있는 것처럼 보이면 안 된다.
 *
 * 이 컴포넌트는 두 곳에서 쓰인다:
 *   1) /v/casual - 항상 이 화면을 보여주는 미리보기 경로
 *   2) / - NEXT_PUBLIC_LANDING_VARIANT=casual로 배포된 사이트(별도 Vercel
 *      프로젝트, 예: saju-web2)에서는 메인 화면 자체가 이걸로 바뀐다.
 *      (같은 레포·같은 코드를 두 Vercel 프로젝트가 공유하므로, 어느 쪽을
 *      보여줄지는 코드 분기가 아니라 "배포 시점의 환경변수"로 결정한다.)
 */

const FREE_ROW = [
  { emoji: "🔮", name: "사주 맛보기", desc: "오행·십신이 한눈에", href: "/start" },
  { emoji: "☀️", name: "오늘의 운세", desc: "매일 바뀌는 일진", href: "/start" },
  { emoji: "🪞", name: "관상 보기", desc: "사진으로 보는 관상", href: "/face" },
];

const THEME_ROWS = [
  {
    emoji: "💌",
    title: "연애가 궁금하다면",
    blurb: "올해 연애운, 어울리는 인연까지",
    items: [
      { name: "베이직 심층 분석", price: "3,900원", href: "/start" },
      { name: "인연 관상 궁합", price: "4,900원", href: "/face" },
    ],
  },
  {
    emoji: "💰",
    title: "재물이 궁금하다면",
    blurb: "올해 재물 흐름과 커리어 방향",
    items: [
      { name: "베이직 심층 분석", price: "3,900원", href: "/start" },
      { name: "프리미엄 종합 리포트", price: "9,900원", href: "/start" },
    ],
  },
  {
    emoji: "🪞",
    title: "내 얼굴이 궁금하다면",
    blurb: "관상 심층 해석과 어울리는 인연의 특징까지",
    items: [{ name: "관상 심층 해석 · 인연 궁합", price: "4,900원", href: "/face" }],
  },
];

export function CasualLanding() {
  return (
    <>
      <main className="mx-auto min-h-screen max-w-xl px-5 pb-16 pt-10 sm:pt-14">
        <div className="mb-7 flex items-center justify-between">
          <p className="text-lg font-bold" style={{ fontFamily: "var(--font-serif)", color: "var(--color-accent)" }}>
            류결의사주
          </p>
        </div>
        <LoginButtons />

        <div className="mt-8 mb-9 text-center">
          <h1 className="mb-2 text-[26px] font-bold leading-snug">오늘 나는, 어떤 하루일까?</h1>
          <p className="mb-6 text-sm leading-relaxed" style={{ color: "var(--color-ink-soft)" }}>
            생년월일 하나로 사주·오늘의 운세·관상까지, 가볍게 시작해봐요.
          </p>
          <a href="/start" className="btn-primary block text-center">
            지금 바로 시작하기
          </a>
        </div>

        <section className="mb-10">
          <h2 className="mb-3 flex items-center gap-1.5 text-base font-bold">
            <span>😮</span>이게 진짜 무료라고?!
          </h2>
          <div className="grid grid-cols-3 gap-2.5">
            {FREE_ROW.map((item) => (
              <a
                key={item.name}
                href={item.href}
                className="flex flex-col items-center rounded-2xl p-3 text-center transition-transform active:scale-95"
                style={{ backgroundColor: "var(--color-paper-soft)", border: "1px solid var(--color-line)" }}
              >
                <span className="mb-1.5 text-2xl">{item.emoji}</span>
                <p className="text-[13px] font-semibold leading-snug">{item.name}</p>
                <p className="mt-0.5 text-[11px] leading-snug" style={{ color: "var(--color-ink-faint)" }}>
                  {item.desc}
                </p>
              </a>
            ))}
          </div>
        </section>

        {THEME_ROWS.map((row) => (
          <section key={row.title} className="mb-9">
            <h2 className="mb-1 flex items-center gap-1.5 text-base font-bold">
              <span>{row.emoji}</span>
              {row.title}
            </h2>
            <p className="mb-3 text-xs" style={{ color: "var(--color-ink-faint)" }}>
              {row.blurb}
            </p>
            <div className="flex gap-2.5 overflow-x-auto pb-1">
              {row.items.map((item) => (
                <a
                  key={item.name}
                  href={item.href}
                  className="flex min-w-[160px] shrink-0 flex-col justify-between rounded-2xl p-3.5"
                  style={{ backgroundColor: "var(--color-accent-soft)" }}
                >
                  <p className="text-sm font-semibold leading-snug">{item.name}</p>
                  <p className="mt-3 text-sm font-bold" style={{ color: "var(--color-accent)" }}>
                    {item.price}
                  </p>
                </a>
              ))}
            </div>
          </section>
        ))}

        <a href="/start" className="btn-secondary block text-center">
          전체 서비스 보러가기
        </a>

        <p className="mt-6 text-xs leading-relaxed" style={{ color: "var(--color-ink-faint)" }}>
          모든 사주·운세·관상 콘텐츠는 전통 문화·오락 목적의 참고 정보이며, 성격·재물·건강·연애 등을
          과학적으로 확정하지 않습니다.
        </p>
      </main>
    </>
  );
}
