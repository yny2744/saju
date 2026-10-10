import { CasualLanding } from "@/components/CasualLanding";
import { OhaengEmblem } from "@/components/landing/OhaengEmblem";
import { ProductIcon, type Kind } from "@/components/landing/ProductIcon";
import { BUSINESS_INFO } from "@/lib/businessInfo";
import { BUNDLE_SUGGESTIONS, EXTRA_KEYS, TOPICS, TOPIC_KEYS } from "@/lib/topics";
import { CURRENCY_NAME, INVITE_CUMULATIVE, PRICE, WELCOME_GIFT, bundleDiscount, formatNyang } from "@/lib/yeopjeon";
import { ScrollTopButton } from "@/components/ScrollTop";

/**
 * 류결사주 대문 (2026-10-08 수정안 13번 재구성, 유샘 확정 순서).
 *
 *   (머리줄은 모든 화면 공통 SiteHeader) → 문양 + 한 줄 소개 → 왜 류결사주인가(一~五)
 *   → 무료로 시작하기 + 가입 선물 엽전 → 엽전으로 보는 12가지 운세 (하나 골라 990 → 깊게 보기 4,900)
 *   → 3가지 운세 몰아보기 9,900 (추천 4묶음) → 12가지 운세 전부 보기 29,500 → 친구 초대 → 맨 위로
 *   2026-10-09 수정안 20~25: 운세 하나 990, 가입 배너 가운데, 묶음 정가·할인 표시, 누르면 구매로(/go), 맨 위로.
 *   2026-10-09: 섹션 번호(①~⑤) 삭제(수정안 17), 감청 금장 배색(18), 추천 4묶음(16).
 *
 * 지키는 원칙:
 *   - 후기 칸 없음: 실제 후기가 쌓이면 그때 붙인다 (지어낸 후기 금지).
 *   - 우리 엔진이 실제로 하는 것만 적는다.
 *   - 가격·보상 숫자는 lib/yeopjeon.ts 한 곳에서 온다.
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
    body: "이름 소리에 맞는 한자를 뜻과 함께 골라 넣고, 그 이름의 획수·소리·오행이 사주와 맞는지 무료로 풀어 드립니다.",
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

const FREE: Array<{ icon: Kind; name: string; desc: string; href: string }> = [
  { icon: "manse", name: "만세력", desc: "여덟 글자 · 오행 · 신강신약 · 대운", href: "/start" },
  { icon: "today", name: "오늘·내일의 운세", desc: "내 사주와 그날 기운의 만남", href: "/start?next=fortune" },
  { icon: "tti", name: "띠별 운세", desc: "생년월일 없이 띠만 골라 오늘·내일", href: "/tti" },
  { icon: "name", name: "이름 풀이", desc: "내 이름의 획수·소리·오행이 사주와 맞는지", href: "/start" },
  { icon: "face", name: "관상", desc: "얼굴 사진으로 보는 타고난 기질", href: "/face" },
];

const GOLD = "var(--color-gold)";
/** 금색 이중 테두리 카드 */
const CARD = {
  border: "1px solid var(--color-gold-line)",
  backgroundColor: "var(--color-card)",
  boxShadow: "inset 0 0 0 3px var(--color-card), inset 0 0 0 4px var(--color-gold-soft)",
} as const;

/** 묶음 정가 → 할인가 + 할인 배지 (수정안 22·23) */
function PriceTag({ count, price }: { count: number; price: number }) {
  const d = bundleDiscount(count, price);
  return (
    <div className="mt-2">
      <p className="text-[15px]">
        <s style={{ color: "var(--color-ink-faint)" }}>{formatNyang(d.list)}</s>
        <span className="mx-1.5" style={{ color: GOLD }}>
          →
        </span>
        <b className="text-[22px]" style={{ fontFamily: "var(--font-serif)", color: "var(--color-accent)" }}>
          {formatNyang(price)}
        </b>
      </p>
      <span className="mt-1.5 inline-block rounded-full px-3 py-1 text-[13px] font-bold" style={{ border: "1px solid var(--color-gold-line)", backgroundColor: "var(--color-gold-soft)", color: "var(--color-ink)" }}>
        {formatNyang(d.off)} 할인 · {d.percent}%
      </span>
    </div>
  );
}

function SectionTitle({ title, sub, price }: { title: string; sub?: string; price?: React.ReactNode }) {
  return (
    <div className="mb-5 text-center">
      <div className="gold-ornament" aria-hidden>
        <i />
      </div>
      <h2 className="mt-2 text-[23px] font-bold leading-snug" style={{ fontFamily: "var(--font-serif)" }}>
        {title}
      </h2>
      {price}
      {sub && (
        <p className="mt-2 text-[14px] leading-relaxed" style={{ color: "var(--color-ink-soft)" }}>
          {sub}
        </p>
      )}
    </div>
  );
}

export default function LandingPage() {
  if (process.env.NEXT_PUBLIC_LANDING_VARIANT === "casual") {
    return <CasualLanding />;
  }

  return (
    <main className="min-h-screen pb-10">
      <div className="mx-auto max-w-xl px-5">
        {/* 문양 + 한 줄 소개 */}
        <section className="pb-10 pt-10 text-center">
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
            className="btn-band mx-auto mt-8 block max-w-xs rounded-2xl py-4 text-[18px] font-bold"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            무료 만세력 보기
          </a>
        </section>

        {/* 왜 류결사주인가 */}
        <section className="pb-12">
          <div className="rounded-2xl px-5 py-8" style={{ ...CARD, boxShadow: `${CARD.boxShadow}, 0 4px 18px rgba(22,41,74,0.07)` }}>
            <h2 className="text-center text-[24px] font-bold" style={{ fontFamily: "var(--font-serif)", color: "var(--color-accent)" }}>
              왜 류결사주인가
            </h2>
            <p className="mt-3 text-center text-[14px] leading-relaxed" style={{ color: "var(--color-ink-soft)" }}>
              사주는 태어난 순간의 하늘과 땅의 기록입니다.
              <br />
              점(占)이 아니라 풀이입니다.
            </p>
            <div className="mt-8 space-y-6">
              {WHY.map((w) => (
                <div key={w.num} className="flex gap-3">
                  <span className="foil-text w-6 shrink-0 text-[19px] font-bold" style={{ fontFamily: "var(--font-serif)" }}>
                    {w.num}
                  </span>
                  <div>
                    <h3 className="text-[16px] font-bold" style={{ fontFamily: "var(--font-serif)", color: "var(--color-accent)" }}>
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

        <div className="hairline" />

        {/* ① 무료로 시작하기 */}
        <section className="py-12">
          <SectionTitle title="무료로 시작하기" sub="로그인 없이 바로 볼 수 있어요" />
          <div className="space-y-3">
            {FREE.map((p) => (
              <a key={p.name} href={p.href} className="flex items-center gap-4 rounded-2xl px-4 py-4 transition-transform active:scale-[0.98]" style={CARD}>
                <span className="shrink-0">
                  <ProductIcon kind={p.icon} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[17px] font-bold" style={{ fontFamily: "var(--font-serif)" }}>
                    {p.name}
                  </span>
                  <span className="mt-0.5 block text-[13px]" style={{ color: "var(--color-ink-soft)" }}>
                    {p.desc}
                  </span>
                </span>
                <span className="shrink-0 rounded-full px-2.5 py-0.5 text-[13px] font-bold" style={{ color: "var(--color-accent)", border: "1px solid var(--color-gold-line)" }}>
                  무료
                </span>
              </a>
            ))}
          </div>

          {/* 가입 선물 (2026-10-09 수정안 21: 가운데 정렬) */}
          <a href="/login" className="mt-5 block rounded-2xl px-5 py-5 text-center" style={{ backgroundColor: "#fee500", color: "#191600" }}>
            <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full text-[16px] font-bold" style={{ backgroundColor: "#fff6b3", fontFamily: "var(--font-serif)" }}>
              錢
            </span>
            <span className="mt-2 block text-[17px] font-bold">
              카카오로 가입하면 {CURRENCY_NAME} {formatNyang(WELCOME_GIFT)} 선물
            </span>
            <span className="mt-0.5 block text-[14px]">12가지 운세 중 하나를 무료로 보세요</span>
          </a>
        </section>

        <div className="hairline" />

        {/* 엽전으로 보는 12가지 운세 (수정안 20: 하나 골라 990냥 → 깊게 보기 4,900냥) */}
        <section id="fortunes" className="scroll-mt-4 py-12">
          <SectionTitle title={`${CURRENCY_NAME}으로 보는 12가지 운세`} sub="궁금한 운세를 하나 골라 보세요. 더 알고 싶으면 깊게 풀어 드려요" />
          <div className="mb-5 flex flex-wrap items-center justify-center gap-1.5 whitespace-nowrap text-[12.5px]">
            <span className="rounded-full px-3 py-1.5 font-semibold" style={{ backgroundColor: "var(--color-accent-soft)", color: "var(--color-accent)" }}>
              운세 보기 {formatNyang(PRICE.BASIC)}
            </span>
            <span style={{ color: GOLD }}>→</span>
            <span className="rounded-full px-3 py-1.5 font-semibold" style={{ backgroundColor: "var(--color-accent-soft)", color: "var(--color-accent)" }}>
              깊게 보기 {formatNyang(PRICE.DEEP)}
            </span>
          </div>
          <ul className="grid grid-cols-3 gap-2">
            {TOPIC_KEYS.map((k) => (
              <li key={k}>
                <a href={`/go?topic=${k}`} className="block rounded-xl px-2 py-3 text-center transition-transform active:scale-[0.97]" style={CARD}>
                  <span className="foil-text block text-[23px] font-bold leading-tight" style={{ fontFamily: "var(--font-serif)" }}>
                    {TOPICS[k].hanja}
                  </span>
                  <span className="mt-0.5 block text-[14px] font-bold">{TOPICS[k].title}</span>
                  <span className="mt-0.5 block text-[11px] leading-snug" style={{ color: "var(--color-ink-faint)" }}>
                    {TOPICS[k].blurb}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </section>

        <div className="hairline" />

        {/* 3가지 운세 몰아보기 (수정안 22: 정가·할인 / 24: 누르면 구매로) */}
        <section className="py-12">
          <SectionTitle title="3가지 운세 몰아보기" sub="가장 궁금한 세 가지를 깊게 보세요" price={<PriceTag count={3} price={PRICE.BUNDLE3} />} />
          <div className="space-y-2.5">
            {BUNDLE_SUGGESTIONS.map((b, i) => (
              <a key={b.title} href={`/go?bundle=${i}`} className="flex items-center justify-between gap-3 rounded-2xl px-4 py-4 transition-transform active:scale-[0.98]" style={CARD}>
                <span className="min-w-0">
                  <span className="block text-[15px] font-bold" style={{ fontFamily: "var(--font-serif)" }}>
                    {b.title}
                  </span>
                  <span className="mt-0.5 block text-[13px]" style={{ color: "var(--color-ink-soft)" }}>
                    {b.topics.map((t) => TOPICS[t].title).join(", ")}
                  </span>
                </span>
                <span className="shrink-0 text-[13px] font-bold" style={{ color: "var(--color-accent)" }}>
                  {formatNyang(PRICE.BUNDLE3)} ›
                </span>
              </a>
            ))}
          </div>
          <p className="mt-4 text-center text-[14px]">
            네 묶음을 다 보면 <s style={{ color: "var(--color-ink-faint)" }}>{formatNyang(PRICE.BUNDLE3 * BUNDLE_SUGGESTIONS.length)}</s> →{" "}
            <b style={{ color: "var(--color-accent)" }}>전부 보기 {formatNyang(PRICE.BUNDLE12)}</b>
          </p>
          <p className="mt-1.5 text-center text-[13px]" style={{ color: "var(--color-ink-faint)" }}>
            묶음 말고도 12가지 중 어떤 세 가지든 고를 수 있어요
          </p>
        </section>

        <div className="hairline" />

        {/* 12가지 운세 전부 보기 (수정안 23: 정가·할인 / 24: 버튼) */}
        <section className="py-12">
          <SectionTitle title="12가지 운세 전부 보기" sub="한 사람의 평생을 한 번에" price={<PriceTag count={TOPIC_KEYS.length} price={PRICE.BUNDLE12} />} />
          <div className="rounded-2xl p-5" style={CARD}>
            <p className="text-center text-[14px] leading-relaxed">
              {TOPIC_KEYS.map((k) => TOPICS[k].title).join(", ")}
            </p>
            <p className="mt-3 text-center text-[14px] font-bold" style={{ color: GOLD }}>
              + 전부 보기에만 있는 {EXTRA_KEYS.map((k) => TOPICS[k].title).join(", ")}
            </p>
          </div>
          <a href="/go?all=1" className="btn-band mt-5 block rounded-2xl py-4 text-center text-[17px] font-bold" style={{ fontFamily: "var(--font-serif)" }}>
            12가지 운세 전부 보기 · {formatNyang(PRICE.BUNDLE12)}
          </a>
        </section>

        <div className="hairline" />

        {/* 친구 초대 */}
        <section className="py-12">
          <SectionTitle title={`친구 초대하고 ${CURRENCY_NAME} 받기`} sub="친구도 가입 선물을 받아요" />
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              { n: 1, label: "운세 보기 1회" },
              { n: 3, label: "깊게 보기 1회" },
              { n: 10, label: "전부 보기 1회" },
            ].map((x) => (
              <div key={x.n} className="rounded-2xl px-2 py-4" style={CARD}>
                <p className="text-[13px]" style={{ color: "var(--color-ink-soft)" }}>
                  친구 {x.n}명
                </p>
                <p className="mt-1 text-[17px] font-bold" style={{ color: GOLD }}>
                  {formatNyang(INVITE_CUMULATIVE[x.n - 1])}
                </p>
                <p className="mt-0.5 text-[11px]" style={{ color: "var(--color-ink-faint)" }}>
                  {x.label}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-center text-[13px]" style={{ color: "var(--color-ink-faint)" }}>
            10명이 넘으면 처음부터 다시 쌓여요
          </p>
          <a href="/mypage" className="mt-5 block rounded-2xl py-4 text-center text-[16px] font-bold" style={{ backgroundColor: "#fee500", color: "#191600" }}>
            내 초대 링크 받기
          </a>
        </section>

        {/* 아래쪽 (수정안 25: 무료 만세력 버튼 대신 맨 위로) */}
        <section className="pt-4 text-center">
          <ScrollTopButton className="btn-secondary mx-auto block max-w-xs" />
          <p className="foil-text mt-8 text-[20px] font-black" style={{ fontFamily: "var(--font-serif)" }}>
            류결사주
          </p>
          <p className="mt-2 text-[13px] leading-relaxed" style={{ color: "var(--color-ink-faint)" }}>
            본 서비스는 오락·참고 목적이며
            <br />
            중요한 결정의 근거로 삼지 마십시오.
          </p>
          <a href={`mailto:${BUSINESS_INFO.csEmail}?subject=${encodeURIComponent("[류결사주 문의]")}`} className="mt-4 inline-block text-[13px] underline underline-offset-4" style={{ color: "var(--color-ink-soft)" }}>
            문의하기
          </a>
        </section>
      </div>
    </main>
  );
}
