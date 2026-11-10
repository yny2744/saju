import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BRAND, TENANT } from "@/tenants";
import { isSuneungOn } from "@/lib/launchMode";
import { SEASON_INFO, examSeason } from "@/lib/suneung";
import { SuneungHero } from "@/components/landing/SuneungHero";
import { ExamFreeStart } from "@/components/suneung/ExamFreeStart";
import { CURRENCY_NAME, PRICE, formatNyang } from "@/lib/yeopjeon";
import { formatWon } from "@/lib/pricingList";
import { PromoBelow, PromoReveal, PromoTop } from "@/components/promo/PromoTop";

/**
 * 콘텐츠별 입구 ① 수능대박운 (2026-10-27 유샘 요청: 홍보 영상 주제에 맞춰 첫 화면이 그 콘텐츠로 시작하는 입구).
 *   주소: /suneung  - 릴스·틱톡·네이버 클립 수능 영상의 프로필 링크로 건다.
 *   이름: 로고 큰 글자 + "수능대박운" (류결사주 → "류결수능대박운", 고객사마다 자동).
 *   첫 화면에는 수능대박운 하나만 (영상 · D-day · 버튼 하나), 아래쪽에만 본 사이트의 다른 운세로 잇는다.
 *   수능 스위치(NEXT_PUBLIC_SUNEUNG)가 꺼져 있으면 대문으로 보낸다 - 옛 영상 링크를 눌러도 빈 화면이 나오지 않게.
 *   수능이 끝나면(11/20~) SuneungHero 가 합격운 → 새 출발운 카드로 바뀌고, 제목·공유 문구도 따라 바뀐다.
 */

export const revalidate = 3600;

const SUB_BRAND = `${TENANT.brand.logoText}수능대박운`;
/** 화면에 내세우는 이름 - 대문이 있는 고객사(명견만리)는 대문 이름 (2026-10-30) */
const SITE_NAME = TENANT.gate?.title ?? BRAND;

export function generateMetadata(): Metadata {
  const info = SEASON_INFO[examSeason()];
  const title = `${TENANT.gate ? SITE_NAME : SUB_BRAND} · ${info.title}`;
  const description =
    info.title === "수능대박운"
      ? `11월 19일 수능, 시험날 나의 기운은? 공부 체질 · 시험날 일진 · 행운 꾸러미까지 사주로 확인해 보세요. 로그인하면 무료 - ${BRAND}`
      : `${info.blurb} - 사주로 확인해 보세요. ${BRAND}`;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      siteName: BRAND,
      locale: "ko_KR",
      type: "website",
      url: `${TENANT.siteUrl}/suneung`,
      images: [{ url: `${TENANT.siteUrl}/landing/suneung-poster.jpg` }],
    },
    twitter: { card: "summary_large_image", title, description, images: [`${TENANT.siteUrl}/landing/suneung-poster.jpg`] },
  };
}

const CARD = {
  border: "1px solid var(--color-gold-line)",
  backgroundColor: "var(--color-card)",
  boxShadow: "inset 0 0 0 3px var(--color-card), inset 0 0 0 4px var(--color-gold-soft)",
} as const;

/** 수능대박운 풀이에 실제로 들어 있는 것 (lib/suneung.ts composeExam 의 칸 그대로) */
const INSIDE: Array<{ mark: string; title: string; desc: string }> = [
  { mark: "一", title: "나의 공부 체질", desc: "타고난 일간으로 보는 집중 방식과 조심할 점" },
  { mark: "二", title: "시험날 11월 19일의 기운", desc: "정유(丁酉)일 하늘의 기운이 나에게 어떻게 들어오는지" },
  { mark: "三", title: "남은 날, 나에게 맞는 공부 리듬", desc: "마지막 몇 주를 보내는 나만의 방법" },
  { mark: "四", title: "시험장 행운 꾸러미", desc: "행운의 색 · 간식 · 작은 물건" },
];

const MORE: Array<{ name: string; desc: string; href: string }> = [
  { name: "오늘·내일의 운세", desc: "내 사주와 그날 기운의 만남 · 무료", href: "/start?next=fortune" },
  { name: "만세력", desc: "여덟 글자 · 오행 · 대운 · 무료", href: "/start" },
  { name: "관상 · 인연의 관상", desc: "내 얼굴의 타고난 기질 · 무료", href: "/face" },
  { name: "이름 풀이 · 작명", desc: "내 이름 풀이는 무료", href: "/name" },
];

export default function SuneungLanding() {
  if (!isSuneungOn()) redirect("/");
  const season = examSeason();
  const info = SEASON_INFO[season];

  // 2026-11-10 유샘 확정 시안(landing3): 대문이 있는 고객사(명견만리)는 새 홍보 랜딩 틀로 - 1:1 영상 · 그림 카드 두 장 · 아래 세 단
  if (TENANT.gate && season === "suneung") {
    return (
      <main className="min-h-screen pb-10">
        <div className="mx-auto max-w-xl px-[14px]">
          <PromoTop
            title={info.title}
            video="/promo/suneung.mp4"
            poster="/promo/suneung-poster.jpg"
            question="시험날, 나의 기운은?"
            sub="수험생의 이름과 생년월일을 넣어 주세요"
            cards={[
              { img: "/promo/card-sn1.jpg", stamp: "試", title: "시험날 기운\n무료로 보기", desc: "공부 체질 · 시험날 일진 · 행운 꾸러미" },
              { img: "/promo/card-sn2.jpg", stamp: "深", title: "시험날\n깊게 보기", desc: "교시별 기운 · 긴장 처방 · 원서 방향", tag: formatWon(PRICE.EXAM_DEEP) },
            ]}
            foot="생년월일만 있으면 돼요"
          />
          <PromoReveal id="exam-free">
            <ExamFreeStart />
          </PromoReveal>
          <PromoBelow
            see={INSIDE.map((it) => [it.mark, it.title, it.desc] as [string, string, string])}
            prices={[
              ["만세력 · 시험날 기운 맛보기", "무료"],
              ["시험날 기운 보기 (가볍게)", "무료 · 로그인"],
              ["시험날 깊게 보기", formatWon(PRICE.EXAM_DEEP)],
            ]}
            fine="합격·불합격을 점치지 않아요. 깊게 보기 결제는 보호자(만 19세 이상)께 부탁해 주세요."
            others={[
              ["2027 신년운", "정미년 한 해의 흐름", "/go/newyear2027"],
              ["크리스마스 연애운", "이번 겨울 나의 인연", "/go/gunghap"],
              ["오늘·내일의 운세", "내 사주와 그날 기운 · 무료", "/start?next=fortune"],
              ["만세력", "여덟 글자 · 오행 · 대운 · 무료", "/start"],
            ]}
          />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen pb-10">
      <div className="mx-auto max-w-xl px-5">
        {TENANT.gate ? (
          // 2026-10-30 유샘: 머리줄에 이미 「류결의 명견만리」가 있으니 위 작은 줄은 빼고 제목만 (그만큼 위로)
          <h1 className="pt-4 text-center text-[28px] font-bold" style={{ fontFamily: "var(--font-serif)" }}>
            <span className="sr-only">{SITE_NAME} · </span>
            {info.title}
          </h1>
        ) : (
          <h1 className="pt-5 text-center">
            <span className="block text-[13px] tracking-[0.25em]" style={{ color: "var(--color-gold)" }}>
              {info.hanja} · {BRAND}
            </span>
            <span className="mt-1 block text-[26px] font-bold" style={{ fontFamily: "var(--font-serif)" }}>
              {SUB_BRAND}
            </span>
          </h1>
        )}

        {/* 첫 화면: 영상 · D-day (대문 맨 위와 같은 것) */}
        <section className="pb-4 pt-3">
          <SuneungHero inlineStart />
        </section>

        {/* 2026-10-30 유샘: 영상 바로 아래 - 로그인 없이 생년월일을 넣으면 만세력과 시험날 기운을 무료로 */}
        <section id="exam-free" className="scroll-mt-4 pb-8">
          <ExamFreeStart />
        </section>

        {season === "suneung" && (
          <section className="pb-8">
            <h2 className="mb-4 text-center text-[20px] font-bold" style={{ fontFamily: "var(--font-serif)" }}>
              수능대박운에서 볼 수 있는 것
            </h2>
            <ol className="space-y-2.5">
              {INSIDE.map((it) => (
                <li key={it.mark} className="flex items-start gap-3 rounded-2xl px-4 py-3.5" style={CARD}>
                  <span className="mt-0.5 shrink-0 text-[18px] font-bold" style={{ color: "var(--color-gold)", fontFamily: "var(--font-serif)" }} aria-hidden>
                    {it.mark}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[16px] font-bold">{it.title}</span>
                    <span className="mt-0.5 block text-[13px]" style={{ color: "var(--color-ink-soft)", wordBreak: "keep-all" }}>
                      {it.desc}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
            <p className="mt-3 text-center text-[12px] leading-relaxed" style={{ color: "var(--color-ink-faint)", wordBreak: "keep-all" }}>
              합격·불합격을 점치지 않아요. 사주로 보는 나의 흐름과 응원이에요.
            </p>
          </section>
        )}

        {/* 결제는 보호자 (2026-10-26 수능대박운 정책) */}
        <section className="pb-10">
          <div className="rounded-2xl px-4 py-4 text-[14px] leading-relaxed" style={{ backgroundColor: "var(--color-paper-soft)", wordBreak: "keep-all" }}>
            <p className="font-bold">이렇게 보세요</p>
            <ul className="mt-1.5 list-disc space-y-1 pl-5">
              <li>
                카카오로 로그인하면 받는 선물 {CURRENCY_NAME}으로 가볍게 보기({formatNyang(PRICE.EXAM)})를 바로 열 수 있어요.
              </li>
              <li>깊게 보기({formatNyang(PRICE.EXAM_DEEP)}) 결제는 보호자(만 19세 이상)께 부탁해 주세요.</li>
              <li>부모님·조부모님이 자녀·손주의 생년월일로 보고, 시험날 응원과 함께 건네셔도 좋아요.</li>
            </ul>
          </div>
        </section>

        {/* 아래쪽에만 본 사이트로 */}
        <section className="pb-6">
          <h2 className="mb-4 text-center text-[18px] font-bold" style={{ fontFamily: "var(--font-serif)" }}>
            {SITE_NAME}의 다른 운세
          </h2>
          <div className="grid grid-cols-2 gap-2.5">
            {MORE.map((m) => (
              <a key={m.name} href={m.href} className="block rounded-2xl px-3.5 py-3.5 transition-transform active:scale-[0.98]" style={CARD}>
                <span className="block text-[15px] font-bold" style={{ fontFamily: "var(--font-serif)" }}>
                  {m.name}
                </span>
                <span className="mt-0.5 block text-[12px]" style={{ color: "var(--color-ink-soft)", wordBreak: "keep-all" }}>
                  {m.desc}
                </span>
              </a>
            ))}
          </div>
          <a href="/" className="btn-secondary mt-4 block text-center">
            {SITE_NAME} 처음 화면으로
          </a>
        </section>
      </div>
    </main>
  );
}
