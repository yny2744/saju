import { CasualLanding } from "@/components/CasualLanding";
import { OhaengEmblem } from "@/components/landing/OhaengEmblem";
import { ProductIcon } from "@/components/landing/ProductIcon";
import { HeaderAuth } from "@/components/landing/HeaderAuth";
import { LANDING_PRODUCTS } from "@/lib/landingProducts";
import { BUSINESS_INFO } from "@/lib/businessInfo";

/**
 * 류결사주 대문 (2026-10-06 개편, 유샘 승인).
 *
 * 구조는 용사주 대문을 따랐다: 머리줄 → 가운데 문양 → 한 줄 소개 + 큰 버튼 → 안내 문구 → 상품 카드 →
 * 질문 카드 → "왜 류결사주인가" 번호 목록 → 아래쪽 안내.
 * 그림·문구는 류결사주 것으로 새로 만들었다 (용 그림·카피는 쓰지 않음).
 *
 * 지키는 원칙:
 *   - 후기 칸 없음: 실제 후기가 쌓이면 그때 붙인다 (지어낸 후기 금지).
 *   - 우리 엔진이 실제로 하는 것만 적는다 (토정비결·자미두수·기문둔갑 등 하지 않는 계산은 안 적음).
 *   - 남을 깎는 문구 대신 우리 장점을 말한다.
 *   - 가격은 lib/landingProducts.ts 임시값 (결정 대기).
 *   - 로고는 유샘이 만든다 - 그 전까지 머리줄은 글자 "류결사주".
 */

const WHY = [
  {
    num: "一",
    title: "절기(節氣) 기준 정밀 만세력",
    body: "해(年)와 달(月)이 바뀌는 기준을 달력 날짜가 아닌 절입 시각으로 잡아 사주를 세웁니다. 음력과 윤달 생일도 그대로 넣을 수 있습니다.",
  },
  {
    num: "二",
    title: "태어난 곳의 시간까지",
    body: "출생 지역에 따라 실제 해의 시간을 보정하고, 자시(子時)를 어떻게 나눌지도 고를 수 있습니다.",
  },
  {
    num: "三",
    title: "한자 이름을 한 글자씩",
    body: "이름 소리에 맞는 한자를 뜻과 함께 보여 드려, 글자마다 직접 골라 넣을 수 있습니다.",
  },
  {
    num: "四",
    title: "명리학(命理學) 원국 분석",
    body: "천간·지지 여덟 글자에서 오행, 십신(十神), 신강신약, 대운·세운까지 정해진 계산식으로 풀어 냅니다.",
  },
  {
    num: "五",
    title: "사진이 밖으로 나가지 않는 관상",
    body: "얼굴의 비율과 이목구비를 이용자의 휴대폰 안에서 살핍니다. 사진은 서버로 보내지 않습니다.",
  },
];

const GOLD = "#9a7a45";

export default function LandingPage() {
  if (process.env.NEXT_PUBLIC_LANDING_VARIANT === "casual") {
    return <CasualLanding />;
  }

  return (
    <main className="min-h-screen pb-10">
      {/* 머리줄 */}
      <header className="mx-auto flex max-w-xl items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid var(--color-line)" }}>
        <a href="/" className="text-[20px] font-bold" style={{ fontFamily: "var(--font-serif)", color: GOLD }}>
          류결사주
        </a>
        <HeaderAuth />
      </header>

      <div className="mx-auto max-w-xl px-5">
        {/* 가운데 문양 + 소개 + 큰 버튼 */}
        <section className="pt-10 pb-12 text-center">
          <div className="mx-auto h-[200px] w-[200px]">
            <OhaengEmblem />
          </div>
          <p className="mt-8 text-[13px] tracking-[0.2em]" style={{ color: GOLD }}>
            류결의 명견만리
          </p>
          <h1 className="mt-2 text-[28px] font-bold leading-snug" style={{ fontFamily: "var(--font-serif)" }}>
            타고난 여덟 글자,
            <br />
            제대로 읽어 드립니다
          </h1>
          <p className="mt-4 text-[15px] leading-relaxed" style={{ color: "var(--color-ink-soft)" }}>
            절기로 세우고 한자 이름까지 살피는
            <br />
            정통 명리 사주, 류결사주입니다.
          </p>
          <a
            href="/start"
            className="mx-auto mt-8 block max-w-xs rounded-2xl py-4 text-[18px] font-bold"
            style={{ fontFamily: "var(--font-serif)", backgroundColor: "var(--color-accent)", color: "#fff", boxShadow: "0 6px 20px rgba(156,59,59,0.22)" }}
          >
            무료 만세력 보기
          </a>
        </section>

        <div className="hairline" />

        {/* 안내 문구 + 상품 카드 */}
        <section className="py-12">
          <p className="mb-8 text-center text-[15px] leading-loose" style={{ fontFamily: "var(--font-serif)", color: GOLD }}>
            사주는 태어난 순간의 하늘과 땅의 기록입니다.
            <br />
            점(占)이 아니라 풀이이니
            <br />
            편안한 마음으로 내 흐름을 살펴보세요.
          </p>

          <div className="space-y-3">
            {LANDING_PRODUCTS.map((p) => {
              const inner = (
                <>
                  <div className="shrink-0">
                    <ProductIcon kind={p.icon} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[17px] font-bold" style={{ fontFamily: "var(--font-serif)" }}>
                      {p.name}
                    </p>
                    <p className="mt-0.5 text-[13px]" style={{ color: "var(--color-ink-soft)" }}>
                      {p.desc}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    {p.soon ? (
                      <span className="rounded-full px-2.5 py-1 text-[12px] font-medium" style={{ backgroundColor: "var(--color-paper-soft)", color: "var(--color-ink-faint)" }}>
                        곧 열려요
                      </span>
                    ) : (
                      <span className="text-[19px] font-bold" style={{ fontFamily: "var(--font-serif)", color: p.price === "무료" ? "var(--color-element-wood)" : GOLD }}>
                        {p.price}
                      </span>
                    )}
                  </div>
                </>
              );
              const cls = "flex items-center gap-4 rounded-2xl px-4 py-5";
              const style = { border: `1px solid ${p.soon ? "var(--color-line)" : "#d8c49a"}`, backgroundColor: "#fffdf8", opacity: p.soon ? 0.75 : 1 };
              return p.soon || !p.href ? (
                <div key={p.name} className={cls} style={style}>
                  {inner}
                </div>
              ) : (
                <a key={p.name} href={p.href} className={`${cls} transition-transform active:scale-[0.98]`} style={style}>
                  {inner}
                </a>
              );
            })}
          </div>

          <p className="mt-5 text-center text-[13px]" style={{ color: "var(--color-ink-faint)" }}>
            입력한 정보는 내 사주함에 저장하거나
            <br />
            언제든 지울 수 있습니다.
          </p>
        </section>

        <div className="hairline" />

        {/* 질문 카드 */}
        <section className="py-12">
          <div className="rounded-2xl px-5 py-8 text-center" style={{ border: "1px solid #d8c49a", backgroundColor: "#fffdf8" }}>
            <p className="text-[16px] leading-loose" style={{ fontFamily: "var(--font-serif)", color: "var(--color-ink-soft)" }}>
              사주 볼 때, 양력 생일만 넣으셨나요?
              <br />
              이름 한자는 물어보던가요?
            </p>
            <p className="mt-5 text-[18px] font-bold leading-relaxed" style={{ fontFamily: "var(--font-serif)", color: GOLD }}>
              절기와 음력, 한자까지 살펴야
              <br />
              비로소 내 사주입니다
            </p>
          </div>
        </section>

        {/* 왜 류결사주인가 */}
        <section className="pb-12">
          <div className="rounded-2xl px-5 py-8" style={{ backgroundColor: "#fffdf8", boxShadow: "0 4px 18px rgba(0,0,0,0.07)" }}>
            <h2 className="text-center text-[24px] font-bold" style={{ fontFamily: "var(--font-serif)", color: GOLD }}>
              왜 류결사주인가
            </h2>
            <p className="mt-3 text-center text-[14px] leading-relaxed" style={{ color: "var(--color-ink-soft)" }}>
              · 절기 기준 계산 · 한자 이름 입력
              <br />
              흐트러짐 없이 세운 사주
            </p>
            <div className="mt-8 space-y-6">
              {WHY.map((w) => (
                <div key={w.num} className="flex gap-3">
                  <span className="w-6 shrink-0 text-[18px]" style={{ fontFamily: "var(--font-serif)", color: GOLD }}>
                    {w.num}
                  </span>
                  <div>
                    <h3 className="text-[16px] font-bold" style={{ fontFamily: "var(--font-serif)", color: GOLD }}>
                      {w.title}
                    </h3>
                    <p className="mt-1.5 text-[14px] leading-relaxed" style={{ color: "var(--color-ink-soft)" }}>
                      {w.body}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 아래쪽 */}
        <section className="text-center">
          <a href="/start" className="block rounded-2xl py-4 text-[17px] font-bold" style={{ fontFamily: "var(--font-serif)", backgroundColor: "var(--color-accent)", color: "#fff" }}>
            무료 만세력 보기
          </a>
          <p className="mt-8 text-[18px] font-bold" style={{ fontFamily: "var(--font-serif)", color: GOLD }}>
            류결사주
          </p>
          <p className="mt-2 text-[13px] leading-relaxed" style={{ color: "var(--color-ink-faint)" }}>
            본 서비스는 오락·참고 목적이며
            <br />
            중요한 결정의 근거로 삼지 마십시오.
          </p>
          <a href={`mailto:${BUSINESS_INFO.csEmail}`} className="mt-4 inline-block text-[13px] underline underline-offset-4" style={{ color: "var(--color-ink-soft)" }}>
            문의하기
          </a>
        </section>
      </div>
    </main>
  );
}
