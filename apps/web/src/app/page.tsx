import { BRAND, TENANT } from "@/tenants";
import { CasualLanding } from "@/components/CasualLanding";
import { ReviewStrip } from "@/components/reviews/ReviewStrip";
import { ProductIcon, type Kind } from "@/components/landing/ProductIcon";
import { BUSINESS_INFO } from "@/lib/businessInfo";
import { TOPICS, TOPIC_KEYS } from "@/lib/topics";
import { CURRENCY_NAME, INVITEE_GIFT, INVITE_REWARD, PRICE, formatNyang, saleNote } from "@/lib/yeopjeon";
import { ScrollTopButton } from "@/components/ScrollTop";
import { SuneungHero } from "@/components/landing/SuneungHero";
import { isSuneungOn } from "@/lib/launchMode";
import { FUN_KINDS, FUN_META, type FunKind } from "@/lib/fun/types";
import type { TenantGate } from "@/tenants/types";
import { GateHero } from "@/components/gate/GateHero";
import { GateRooms } from "@/components/gate/GateRooms";
import { IntroCards } from "@/components/landing/IntroCards";

/**
 * 류결사주 대문 (2026-10-08 수정안 13번 재구성, 유샘 확정 순서).
 *
 *   2026-10-13 수정안 61: 맨 위를 대문 영상(20대→70대 함께 나이 드는 두 사람, 소리 없이 반복)으로 바꾸고 "왜 류결사주인가"를 뺐다.
 *   2026-10-10 수정안 28·29:
 *   (머리줄은 모든 화면 공통 SiteHeader) → 문양(고리에 "류결의 명견만리") + 대표 슬로건
 *   → 무료로 시작하기 + 가입 선물 엽전 → 엽전으로 보는 12가지 운세 (운세 보기 990만 표시)
 *   → 왜 류결사주인가(3줄 + 一~五) → 친구 초대 → 맨 위로
 *   대문에는 큰 금액(깊게 보기 4,900·몰아보기·전부 보기)을 두지 않는다 - 깊게 본 손님에게 운세 화면에서 보여 준다.
 *   2026-10-09 수정안 20~25: 운세 하나 990, 가입 배너 가운데, 묶음 정가·할인 표시, 누르면 구매로(/go), 맨 위로.
 *   2026-10-09: 섹션 번호(①~⑤) 삭제(수정안 17), 감청 금장 배색(18), 추천 4묶음(16).
 *
 * 지키는 원칙:
 *   - 후기 칸 없음: 실제 후기가 쌓이면 그때 붙인다 (지어낸 후기 금지).
 *   - 우리 엔진이 실제로 하는 것만 적는다.
 *   - 가격·보상 숫자는 lib/yeopjeon.ts 한 곳에서 온다.
 *   - 로고는 유샘이 만든다 - 그 전까지 머리줄은 글자 "류결사주".
 */

const FREE: Array<{ icon: Kind; name: string; desc: string; href: string }> = [
  { icon: "manse", name: "만세력", desc: "여덟 글자 · 오행 · 신강신약 · 대운", href: "/start" },
  { icon: "today", name: "오늘·내일의 운세", desc: "내 사주와 그날 기운의 만남", href: "/start?next=fortune" },
  { icon: "tti", name: "띠별 운세", desc: "생년월일 없이 띠만 골라 보는 오늘·내일 운세", href: "/tti" },
  { icon: "match", name: "연인 궁합", desc: "두 사람의 사주로 보는 끌림과 인연 · 궁합 점수 미리보기", href: "/couple" },
  { icon: "name", name: "이름 풀이 · 개명 · 작명", desc: "내 이름 풀이는 무료 · 개명 · 작명", href: "/name" },
];

/** 무료 묶음 카드 동그라미 글자 (2026-10-26) */
const FUN_BADGE: Record<FunKind, string> = { numerology: "數", zodiac: "★", blood: "AB", flower: "花" };

const GOLD = "var(--color-gold)";
/** 금색 이중 테두리 카드 */
const CARD = {
  border: "1px solid var(--color-gold-line)",
  backgroundColor: "var(--color-card)",
  boxShadow: "inset 0 0 0 3px var(--color-card), inset 0 0 0 4px var(--color-gold-soft)",
} as const;

function SectionTitle({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-5 text-center">
      <div className="gold-ornament" aria-hidden>
        <i />
      </div>
      <h2 className="mt-2 text-[23px] font-bold leading-snug" style={{ fontFamily: "var(--font-serif)" }}>
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

/** 가입하면 운세 하나 무료 (대문 공통) */
function JoinBanner() {
  return (
    <>
      {/* 로그인 혜택 (2026-10-23: 가입 선물 990냥으로 운세 하나 무료 - 12가지 모두 무료였던 수정안 10을 대체) */}
      <a
        href="/login"
        className="mt-6 block rounded-2xl px-5 py-6 text-center"
        style={{ backgroundColor: "#16213a", border: "1px solid var(--color-gold-line)", boxShadow: "inset 0 0 0 3px #16213a, inset 0 0 0 4px rgba(212,178,101,0.55)" }}
      >
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full text-[19px] font-bold" style={{ border: "1.5px solid #d4b265", color: "#d4b265", fontFamily: "var(--font-serif)" }}>
          錢
        </span>
        <span className="mt-3 block text-[19px] font-bold" style={{ color: "#f3e7c6", fontFamily: "var(--font-serif)" }}>
          가입하면 운세 하나가 무료
        </span>
        <span className="mt-1 block text-[14px]" style={{ color: "#c9cfda" }}>
          가입 선물 엽전 990냥으로 위 운세 중 하나를 바로 볼 수 있어요
        </span>
        <span className="mx-auto mt-4 block max-w-[240px] rounded-xl py-3 text-[15px] font-bold" style={{ background: "linear-gradient(180deg,#e2c47e,#c9a55a)", color: "#16213a" }}>
          가입하고 운세 보기
        </span>
      </a>
    </>
  );
}

/** 친구 초대 (대문 공통) */
function InviteSection({ suneung }: { suneung: boolean }) {
  return (
    <>
      {/* 친구 초대 */}
      <section className="py-12">
        <SectionTitle title={`친구 초대하고 ${CURRENCY_NAME} 받기`} sub="친구 한 명마다, 나도 친구도 함께 받아요" />
        <div className="grid grid-cols-2 gap-2 text-center">
          {[
            { who: "초대한 나", amt: INVITE_REWARD },
            { who: "초대받은 친구", amt: INVITEE_GIFT },
          ].map((x) => (
            <div key={x.who} className="rounded-2xl px-2 py-4" style={CARD}>
              <p className="text-[13px]" style={{ color: "var(--color-ink-soft)" }}>
                {x.who}
              </p>
              <p className="mt-1 text-[19px] font-bold" style={{ color: GOLD }}>
                {formatNyang(x.amt)}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-center text-[13px]" style={{ color: "var(--color-ink-faint)" }}>
          {suneung ? `${formatNyang(INVITE_REWARD)}이면 수능대박운 가볍게 보기 한 번 · 인원 제한 없이 계속 쌓여요` : "인원 제한 없이 한 명마다 계속 쌓여요"}
        </p>
        <a href="/mypage" className="mt-5 block rounded-2xl py-4 text-center text-[16px] font-bold" style={{ backgroundColor: "#16213a", color: "#f3e7c6", border: "1px solid var(--color-gold-line)", fontFamily: "var(--font-serif)" }}>
          내 초대 링크 받기
        </a>
      </section>
    </>
  );
}

/** 맨 아래 - 맨 위로 · 안내 · 문의 (대문 공통) */
function BottomSection() {
  return (
    <>
      {/* 아래쪽 (수정안 25: 무료 만세력 버튼 대신 맨 위로) */}
      <section className="pt-4 text-center">
        <ScrollTopButton className="btn-secondary mx-auto block max-w-xs" />
        <p className="foil-text mt-8 text-[20px] font-black" style={{ fontFamily: "var(--font-serif)" }}>
          {BRAND}
        </p>
        <p className="mt-2 text-[13px] leading-relaxed" style={{ color: "var(--color-ink-faint)" }}>
          본 서비스는 오락·참고 목적이며
          <br />
          중요한 결정의 근거로 삼지 마십시오.
        </p>
        <a href={`mailto:${BUSINESS_INFO.csEmail}?subject=${encodeURIComponent(`[${BRAND} 문의]`)}`} className="mt-4 inline-block text-[13px] underline underline-offset-4" style={{ color: "var(--color-ink-soft)" }}>
          문의하기
        </a>
      </section>
    </>
  );
}

/**
 * 세 길·일곱 운 대문 (2026-10-28 mgml) - 고객사 설정에 gate 가 있을 때만.
 * 대문(모션) → 소개글 → 세 길·일곱 운의 관 → 가입 혜택 → 후기 → 친구 초대 → 맨 아래
 */
function GateLanding({ gate, suneung }: { gate: TenantGate; suneung: boolean }) {
  return (
    <main className="min-h-screen pb-10">
      <GateHero gate={gate} brand={BRAND} />
      {/* 2026-10-30 대문 아래 카드 칸은 뺌 - 카드 9장은 대문 장면 안에서 돈다 (유샘) */}
      <div className="mx-auto max-w-xl px-5">
        <GateRooms gate={gate} />
        <div className="hairline" />
        <section className="py-12">
          <JoinBanner />
        </section>
        <div className="hairline" />
        <ReviewStrip />
        <div className="hairline mt-12" />
        <InviteSection suneung={suneung} />
        <BottomSection />
      </div>
    </main>
  );
}

export default function LandingPage() {
  if (process.env.NEXT_PUBLIC_LANDING_VARIANT === "casual") {
    return <CasualLanding />;
  }
  const suneung = isSuneungOn();
  if (TENANT.gate) return <GateLanding gate={TENANT.gate} suneung={suneung} />;

  return (
    <main className="min-h-screen pb-10">
      <div className="mx-auto max-w-xl px-5">
        {/* 2026-10-17 수정안 17: 맨 위 수능대박운 영상 (수능이 끝나면 합격운·새 출발운 카드) */}
        {/* 2026-10-19: 결제 심사 동안 숨김 (isSuneungOn - NEXT_PUBLIC_SUNEUNG=on 일 때만 보임) */}
        {suneung ? (
          <section className="pb-6 pt-5">
            <h1 className="sr-only">{`수능대박운 · ${TENANT.brand.heroTagline} · ${BRAND}`}</h1>
            <SuneungHero />
          </section>
        ) : (
          <h1 className="sr-only">{`${TENANT.brand.heroTagline} · ${BRAND}`}</h1>
        )}

        {/* 2026-10-17 수정안 17: 대문 순서 - 수능대박운 → 인연(관상·궁합) → 20대→70대 영상 → 무료로 시작하기 */}
        <section className={suneung ? "pb-6" : "pb-6 pt-5"}>
          <a href="/face" className="block overflow-hidden rounded-2xl transition-transform active:scale-[0.98]" style={CARD}>
            {/* eslint-disable-next-line @next/next/no-img-element -- 정적 그림 */}
            <img src="/landing/face-ideal.jpg" alt="당신의 이상형 관상 - 눈·코·입·턱선으로 보는 인연의 얼굴 (AI로 만든 예시 그림)" className="block w-full" />
            <span className="flex items-center gap-3 px-4 py-4">
              <span className="min-w-0 flex-1">
                <span className="block text-[17px] font-bold" style={{ fontFamily: "var(--font-serif)" }}>
                  관상 · 인연의 관상
                </span>
                <span className="mt-0.5 block text-[13px]" style={{ color: "var(--color-ink-soft)", wordBreak: "keep-all" }}>
                  내 얼굴의 타고난 기질, 그리고 나와 맞는 인연은 어떤 얼굴일까?
                </span>
              </span>
              <span className="shrink-0 rounded-full px-2.5 py-0.5 text-[13px] font-bold" style={{ color: "var(--color-accent)", border: "1px solid var(--color-gold-line)" }}>
                무료
              </span>
            </span>
          </a>
        </section>

        {/* 수정안 61: 대문 영상 - 나를 알고, 인연과 복을 잇다 (소리 없이 반복, 영상이 뜨기 전엔 같은 장면 그림) */}
        {/* 2026-10-19: 인연(관상·궁합) 카드 아래로 다시 넣음 */}
        <section className="pb-8">
          <video
            className="block w-full rounded-2xl motion-reduce:hidden"
            style={{ aspectRatio: "3 / 4", boxShadow: "0 6px 24px rgba(14,22,40,0.25)" }}
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            poster="/landing/hero-poster.jpg"
            aria-label={`20대부터 70대까지 함께 나이 들어 가는 두 사람 - ${TENANT.brand.heroTagline}`}
          >
            <source src="/landing/hero.webm" type="video/webm" />
            <source src="/landing/hero.mp4" type="video/mp4" />
          </video>
          {/* 움직임 줄이기를 켠 기기: 그림만 */}
          {/* eslint-disable-next-line @next/next/no-img-element -- 정적 그림 */}
          <img src="/landing/hero-poster.jpg" alt={`${TENANT.brand.heroTagline} · ${BRAND}`} className="hidden w-full rounded-2xl motion-reduce:block" />
        </section>

        {/* 2026-10-29 류결의 명견만리 소개 카드 9장 - 옆으로 넘겨 보기 */}
        <div className="pb-10">
          <IntroCards />
        </div>

        {/* 무료로 시작하기 - 첫 화면에 바로 보이게 */}
        <section className="pb-12">
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
                  <span className="mt-0.5 block text-[13px]" style={{ color: "var(--color-ink-soft)", wordBreak: "keep-all" }}>
                    {p.desc}
                  </span>
                </span>
                <span className="shrink-0 rounded-full px-2.5 py-0.5 text-[13px] font-bold" style={{ color: "var(--color-accent)", border: "1px solid var(--color-gold-line)" }}>
                  무료
                </span>
              </a>
            ))}
          </div>

          {/* 2026-10-26 무료 묶음: 가볍게 보고 사주로 이어지는 입구 (AI 없음) */}
          <p className="mb-2 mt-6 text-center text-[14px] font-semibold" style={{ color: "var(--color-ink-soft)" }}>
            재미로 보고, 사주와 겹쳐 보기
          </p>
          <div className="grid grid-cols-2 gap-2.5">
            {FUN_KINDS.map((k) => (
              <a key={k} href={`/fun/${k}`} className="flex items-center gap-3 rounded-2xl px-3 py-3 transition-transform active:scale-[0.98]" style={CARD}>
                <span
                  aria-hidden
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[15px] font-bold"
                  style={{ backgroundColor: "var(--color-band)", color: "var(--color-gold-light)", boxShadow: `0 0 0 1px ${GOLD}`, fontFamily: "var(--font-serif)" }}
                >
                  {FUN_BADGE[k]}
                </span>
                <span className="min-w-0">
                  <span className="block text-[15px] font-bold leading-tight" style={{ fontFamily: "var(--font-serif)" }}>
                    {FUN_META[k].title.split(" · ")[0]}
                  </span>
                  <span className="block text-[11.5px]" style={{ color: "var(--color-ink-faint)" }}>
                    무료 · 사주와 함께
                  </span>
                </span>
              </a>
            ))}
          </div>

        </section>

        <div className="hairline" />

        {/* 엽전으로 보는 12가지 운세 (수정안 29: 깊게 보기 4,900 표시 없음) */}
        <section id="fortunes" className="scroll-mt-4 py-12">
          <SectionTitle title="12가지 운세" sub="궁금한 운세를 골라 보세요" />
          <div className="mb-5 flex justify-center">
            <span className="rounded-full px-3 py-1.5 text-[12.5px] font-semibold" style={{ backgroundColor: "var(--color-accent-soft)", color: "var(--color-accent)" }}>
              가입하면 운세 하나 무료 · {saleNote("BASIC") ? `${saleNote("BASIC")} ` : ""}하나에 {formatNyang(PRICE.BASIC)} (1냥 = 1원)
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

          <JoinBanner />
        </section>

        <div className="hairline" />

        {/* 1004 천사의 한마디 (수정안 47: 관리자가 올린 후기만, 없으면 안 보임) */}
        <ReviewStrip />

        <div className="hairline mt-12" />

        <InviteSection suneung={suneung} />

        <BottomSection />
      </div>
    </main>
  );
}
