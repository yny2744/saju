import { CasualLanding } from "@/components/CasualLanding";
import { OhaengEmblem } from "@/components/landing/OhaengEmblem";
import { ProductIcon, type Kind } from "@/components/landing/ProductIcon";
import { HeaderAuth } from "@/components/landing/HeaderAuth";
import { BUSINESS_INFO } from "@/lib/businessInfo";
import { BUNDLE_SUGGESTIONS, EXTRA_KEYS, TOPICS, TOPIC_KEYS } from "@/lib/topics";
import { CURRENCY_NAME, INVITE_CUMULATIVE, PRICE, WELCOME_GIFT, formatNyang } from "@/lib/yeopjeon";

/**
 * 류결사주 대문 (2026-10-08 수정안 13번 재구성, 유샘 확정 순서).
 *
 *   머리줄 → 문양 + 한 줄 소개 → 왜 류결사주인가(一~五) → ① 무료로 시작하기 + 가입 선물 엽전
 *   → ② 엽전으로 보는 12가지 운 (맛보기 990 → 깊게 보기 4,900) → ③ 3가지 몰아보기 9,900
 *   → ④ 12가지 전부 보기 29,500 → ⑤ 친구 초대 → 아래쪽
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

const GOLD = "#9a7a45";
const CARD = { border: "1px solid #d8c49a", backgroundColor: "#fffdf8" } as const;

function SectionTitle({ no, title, sub }: { no: string; title: string; sub?: string }) {
  return (
    <div className="mb-5 text-center">
      <p className="text-[13px] tracking-[0.15em]" style={{ color: GOLD }}>
        {no}
      </p>
      <h2 className="mt-1 text-[23px] font-bold leading-snug" style={{ fontFamily: "var(--font-serif)" }}>
        {title}
      </h2>
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
      {/* 머리줄 */}
      <header className="mx-auto flex max-w-xl items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid var(--color-line)" }}>
        <a href="/" className="text-[20px] font-bold" style={{ fontFamily: "var(--font-serif)", color: GOLD }}>
          류결사주
        </a>
        <HeaderAuth />
      </header>

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
            className="mx-auto mt-8 block max-w-xs rounded-2xl py-4 text-[18px] font-bold"
            style={{ fontFamily: "var(--font-serif)", backgroundColor: "var(--color-accent)", color: "#fff", boxShadow: "0 6px 20px rgba(156,59,59,0.22)" }}
          >
            무료 만세력 보기
          </a>
        </section>

        {/* 왜 류결사주인가 */}
        <section className="pb-12">
          <div className="rounded-2xl px-5 py-8" style={{ backgroundColor: "#fffdf8", boxShadow: "0 4px 18px rgba(0,0,0,0.07)" }}>
            <h2 className="text-center text-[24px] font-bold" style={{ fontFamily: "var(--font-serif)", color: GOLD }}>
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

        <div className="hairline" />

        {/* ① 무료로 시작하기 */}
        <section className="py-12">
          <SectionTitle no="①" title="무료로 시작하기" sub="로그인 없이 바로 볼 수 있어요" />
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
                <span className="shrink-0 text-[17px] font-bold" style={{ fontFamily: "var(--font-serif)", color: "var(--color-element-wood)" }}>
                  무료
                </span>
              </a>
            ))}
          </div>

          {/* 가입 선물 */}
          <a href="/login" className="mt-5 flex items-center gap-3 rounded-2xl px-5 py-4" style={{ backgroundColor: "#fee500", color: "#191600" }}>
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[15px] font-bold" style={{ backgroundColor: "#fff6b3", fontFamily: "var(--font-serif)" }}>
              錢
            </span>
            <span className="min-w-0">
              <span className="block text-[16px] font-bold">
                카카오로 가입하면 {CURRENCY_NAME} {formatNyang(WELCOME_GIFT)} 선물
              </span>
              <span className="block text-[13px]">12가지 운 맛보기를 첫 회 무료로 보세요</span>
            </span>
          </a>
        </section>

        <div className="hairline" />

        {/* ② 엽전으로 보는 12가지 운 */}
        <section className="py-12">
          <SectionTitle no="②" title={`${CURRENCY_NAME}으로 보는 12가지 운`} sub="먼저 12가지를 짧게 맛보고, 마음에 걸리는 운은 깊게 풀어 드려요" />
          <div className="mb-5 flex flex-wrap items-center justify-center gap-1.5 whitespace-nowrap text-[12px]">
            <span className="rounded-full px-2.5 py-1.5" style={{ backgroundColor: "var(--color-paper-soft)" }}>
              무료 만세력
            </span>
            <span style={{ color: GOLD }}>→</span>
            <span className="rounded-full px-2.5 py-1.5 font-semibold" style={{ backgroundColor: "var(--color-accent-soft)", color: "var(--color-accent)" }}>
              맛보기 {formatNyang(PRICE.TASTE)}
            </span>
            <span style={{ color: GOLD }}>→</span>
            <span className="rounded-full px-2.5 py-1.5 font-semibold" style={{ backgroundColor: "var(--color-accent-soft)", color: "var(--color-accent)" }}>
              깊게 보기 {formatNyang(PRICE.DEEP)}
            </span>
          </div>
          <ul className="grid grid-cols-3 gap-2">
            {TOPIC_KEYS.map((k) => (
              <li key={k}>
                <a href="/start" className="block rounded-xl px-2 py-3 text-center" style={CARD}>
                  <span className="block text-[22px] leading-tight" style={{ fontFamily: "var(--font-serif)", color: GOLD }}>
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
          <p className="mt-4 text-center text-[13px]" style={{ color: "var(--color-ink-faint)" }}>
            무료 만세력을 본 뒤 결과 끝의 &quot;이어서 보기&quot;에서 시작해요
          </p>
        </section>

        <div className="hairline" />

        {/* ③ 3가지 몰아보기 */}
        <section className="py-12">
          <SectionTitle no="③" title={`3가지 운 몰아보기 · ${formatNyang(PRICE.BUNDLE3)}`} sub="가장 궁금한 세 가지만 골라 깊게 보세요" />
          <div className="space-y-2.5">
            {BUNDLE_SUGGESTIONS.map((b) => (
              <div key={b.title} className="flex items-center justify-between gap-3 rounded-2xl px-4 py-4" style={CARD}>
                <span className="text-[15px] font-bold" style={{ fontFamily: "var(--font-serif)" }}>
                  {b.title}
                </span>
                <span className="text-[14px]" style={{ color: "var(--color-ink-soft)" }}>
                  {b.topics.map((t) => TOPICS[t].title).join(", ")}
                </span>
              </div>
            ))}
          </div>
          <p className="mt-4 text-center text-[15px]">
            따로 보면 <s style={{ color: "var(--color-ink-faint)" }}>{formatNyang(PRICE.DEEP * 3)}</s> →{" "}
            <b style={{ color: "var(--color-accent)" }}>몰아보면 {formatNyang(PRICE.BUNDLE3)}</b>
          </p>
          <p className="mt-1 text-center text-[13px]" style={{ color: "var(--color-ink-faint)" }}>
            12가지 중 어떤 세 가지든 고를 수 있어요
          </p>
        </section>

        <div className="hairline" />

        {/* ④ 12가지 전부 보기 */}
        <section className="py-12">
          <SectionTitle no="④" title={`12가지 전부 보기 · ${formatNyang(PRICE.BUNDLE12)}`} sub="한 사람의 평생을 한 번에" />
          <div className="rounded-2xl p-5" style={CARD}>
            <p className="text-center text-[14px] leading-relaxed">
              {TOPIC_KEYS.map((k) => TOPICS[k].title).join(", ")}
            </p>
            <p className="mt-3 text-center text-[14px] font-bold" style={{ color: GOLD }}>
              + 전부 보기에만 있는 {EXTRA_KEYS.map((k) => TOPICS[k].title).join(", ")}
            </p>
          </div>
          <p className="mt-4 text-center text-[15px]">
            따로 보면 <s style={{ color: "var(--color-ink-faint)" }}>{formatNyang(PRICE.DEEP * TOPIC_KEYS.length)}</s> →{" "}
            <b style={{ color: "var(--color-accent)" }}>전부 보기 {formatNyang(PRICE.BUNDLE12)}</b>
          </p>
        </section>

        <div className="hairline" />

        {/* ⑤ 친구 초대 */}
        <section className="py-12">
          <SectionTitle no="⑤" title={`친구 초대하고 ${CURRENCY_NAME} 받기`} sub="친구도 가입 선물을 받아요" />
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              { n: 1, label: "맛보기 1회" },
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

        {/* 아래쪽 */}
        <section className="pt-4 text-center">
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
          <a href={`mailto:${BUSINESS_INFO.csEmail}?subject=${encodeURIComponent("[류결사주 문의]")}`} className="mt-4 inline-block text-[13px] underline underline-offset-4" style={{ color: "var(--color-ink-soft)" }}>
            문의하기
          </a>
        </section>
      </div>
    </main>
  );
}
