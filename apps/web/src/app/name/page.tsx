import { BRAND } from "@/tenants";
import type { Metadata } from "next";
import { CURRENCY_NAME, PREMIUM_ON, PRICE, formatNyang, saleSuffix } from "@/lib/yeopjeon";
import { ReviewStrip } from "@/components/reviews/ReviewStrip";

export const metadata: Metadata = {
  title: `이름 풀이 · 개명 · 작명 · ${BRAND}`,
  description: "내 이름이 사주와 맞는지 무료로 풀어 보고, 사주에 맞춘 개명·신생아 작명·상호 작명·기업 작명·브랜딩 작명을 받아 보세요.",
};

const CARD = {
  border: "1px solid var(--color-gold-line)",
  backgroundColor: "var(--color-card)",
  boxShadow: "inset 0 0 0 3px var(--color-card), inset 0 0 0 4px var(--color-gold-soft)",
} as const;

/**
 * 이름 풀이 · 개명 · 작명 (2026-10-12 수정안 45·46 → 2026-10-14 수정안 15).
 *   사람 이름: 내 이름 풀이(무료) → 개명 추천 → 신생아 작명
 *   가게·회사·브랜드 이름: 상호 풀이(무료) → 상호 작명 → 기업 작명 → 브랜딩 작명
 *   설명은 넉넉하게: 누구에게 맞는지 · 어떻게 짓는지 · 받는 것
 */

interface Item {
  hanja: string;
  title: string;
  price: string;
  lead: string;
  body: string;
  gets: string[];
  href: string;
  cta: string;
}

const PEOPLE: Item[] = [
  {
    hanja: "名",
    title: "내 이름 풀이",
    price: "무료",
    lead: "내 이름은 내 사주와 잘 맞을까요?",
    body: "만세력으로 세운 내 사주를 바탕에 깔고, 이름 글자 하나하나가 그 위에 어떤 기운을 더하는지 풀어 드려요. 한자의 뜻과 획수, 부르는 소리, 음양의 짜임, 어린 시절부터 말년까지 이름의 수가 어떻게 흐르는지 도표와 그래프로 한눈에 보여 드려요.",
    gets: ["이름 점수와 다섯 가지 기준 그래프", "나의 바탕(일간)과 사주 오행 원형 도표", "이름이 사주에 더해 주는 기운 막대그래프", "수리 네 격 · 소리 흐름 · 음양 짜임 풀이", "이름이 다 채우지 못한 기운을 채우는 법"],
    href: "/start?next=name",
    cta: "무료로 내 이름 풀이 보기",
  },
  {
    hanja: "改",
    title: "개명 추천",
    price: `${CURRENCY_NAME} ${formatNyang(PRICE.RENAME)}${saleSuffix("RENAME")}`,
    lead: "지금 이름이 아쉽다면, 사주에 맞는 새 이름을.",
    body: "지금 이름을 먼저 진단하고, 사주에 아쉬운 기운을 채우는 한자로 새 이름을 골라 드려요. 수리 네 격이 모두 길하고, 성에서 이름으로 이어지는 소리가 부딪히지 않는 이름만 남겨요. 법적으로 바꾸기 전에 호(號)나 부르는 이름으로 먼저 써 볼 수도 있어요.",
    gets: ["지금 이름 진단", "새 이름 후보 5개 (한자 뜻 · 수리 · 소리 · 이름 이야기)", "개명 추천서 PDF", "7일 안에 1회 다시 추천"],
    href: "/go?name=rename",
    cta: "개명 추천 받기",
  },
  {
    hanja: "命",
    title: "신생아 작명",
    price: `${CURRENCY_NAME} ${formatNyang(PRICE.NAMING)}${saleSuffix("NAMING")}`,
    lead: "아기가 평생 불릴 첫 선물.",
    body: "아기의 태어난 날과 시로 사주를 세워 아쉬운 기운을 찾고, 그 기운을 품은 한자로 이름을 지어요. 집안의 돌림자도 반영하고, 성씨와 어울리는 소리와 획수까지 맞춰요. 후보마다 부모님께 드리는 이름 이야기를 담아 작명서로 엮어 드려요.",
    gets: ["이름 후보 7개 (돌림자 반영)", "후보마다 한자 뜻 · 수리 네 격 · 이름 이야기", "아기 사주 요약이 담긴 작명서 PDF", "7일 안에 1회 다시 추천", ...(PREMIUM_ON ? [`프리미엄: 아기의 12가지 운세 전부 보기와 함께 ${formatNyang(PRICE.PREMIUM_NAME)}`] : [])],
    href: "/start?name=naming",
    cta: "신생아 이름 지으러 가기",
  },
];

const BIZ: Item[] = [
  {
    hanja: "商",
    title: "상호 풀이",
    price: "무료",
    lead: "지금 쓰는 가게 이름, 업종과 맞을까요?",
    body: "가게·회사 이름이 업종의 오행과 어울리는지, 글자 사이 소리가 부딪히지 않는지, 한자 상호라면 총획이 길한지 풀어 드려요. 저장해 둔 대표자 사주를 고르면 대표님 사주와의 어울림까지 봐요.",
    gets: ["업종 오행 · 소리 흐름 · 총획 수리", "대표자 사주와의 어울림", "영문 표기"],
    href: "/name/business",
    cta: "무료로 상호 풀이 보기",
  },
  {
    hanja: "號",
    title: "상호 작명",
    price: `${CURRENCY_NAME} ${formatNyang(PRICE.BUSINESS)}${saleSuffix("BUSINESS")}`,
    lead: "식당·카페·미용실·학원… 간판에 걸 가게 이름.",
    body: "대표자 사주에 아쉬운 기운과 업종의 오행을 함께 맞춰 가게 이름을 골라 드려요. 원하는 느낌(따뜻함·고급·전통 등)을 고르면 그 분위기에 맞는 한자 상호와 한글 상호를 고루 섞어 드려요.",
    gets: ["상호 후보 7개 (뜻 · 이름 이야기 · 영문 표기)", "업종 오행 · 소리 · 총획 풀이", "상호 작명서 PDF", "7일 안에 1회 다시 추천 (조건 바꿔도 돼요)", ...(PREMIUM_ON ? [`프리미엄: 대표님의 12가지 운세 전부 보기와 함께 ${formatNyang(PRICE.PREMIUM_NAME)}`] : [])],
    href: "/go?name=business",
    cta: "상호 작명 받기",
  },
  {
    hanja: "社",
    title: "기업 작명",
    price: `${CURRENCY_NAME} ${formatNyang(PRICE.CORP)}${saleSuffix("CORP")}`,
    lead: "법인·회사를 세울 때, 오래 갈 이름.",
    body: "회사의 얼굴이 될 이름이에요. 대표자 사주와 업종의 기운을 바탕으로, 무게 있고 뜻이 바른 한자 이름을 중심으로 골라 드려요. 영문으로 옮겨도 어색하지 않은지, 부를 때 또렷한지까지 살펴요.",
    gets: ["회사 이름 후보 7개 (한자 · 한글 · 영문 표기)", "후보마다 뜻 · 이름 이야기 · 업종 오행 풀이", "기업 작명서 PDF", "7일 안에 1회 다시 추천", ...(PREMIUM_ON ? [`프리미엄: 대표님의 12가지 운세 전부 보기와 함께 ${formatNyang(PRICE.PREMIUM_BIZ)}`] : [])],
    href: "/go?name=corp",
    cta: "기업 작명 받기",
  },
  {
    hanja: "標",
    title: "브랜딩 작명",
    price: `${CURRENCY_NAME} ${formatNyang(PRICE.BRAND)}${saleSuffix("BRAND")}`,
    lead: "제품·서비스·쇼핑몰… 기억에 남는 브랜드 이름.",
    body: "부르기 쉽고 한 번 들으면 잊히지 않는 브랜드 이름을 지어요. 순우리말과 한글 조어를 중심으로, 영문 로고로 써도 예쁘게 읽히는 소리를 골라요. 소리의 오행이 업종과 대표자 사주를 돕는지도 함께 따져요.",
    gets: ["브랜드 이름 후보 7개 (뜻 · 영문 표기 · 이름 이야기)", "소리 오행 · 업종 · 대표자 사주 풀이", "브랜드 작명서 PDF", "7일 안에 1회 다시 추천", ...(PREMIUM_ON ? [`프리미엄: 대표님의 12가지 운세 전부 보기와 함께 ${formatNyang(PRICE.PREMIUM_BIZ)}`] : [])],
    href: "/go?name=brand",
    cta: "브랜딩 작명 받기",
  },
];

function Card({ it }: { it: Item }) {
  return (
    <section className="rounded-2xl p-5" style={CARD}>
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-[22px] font-bold text-white"
          style={{ fontFamily: "var(--font-serif)", backgroundColor: "var(--color-danger)" }}
        >
          {it.hanja}
        </span>
        <div>
          <h2 className="text-[18px] font-bold" style={{ fontFamily: "var(--font-serif)" }}>
            {it.title}
          </h2>
          <p className="text-[13px] font-semibold" style={{ color: "var(--color-gold)" }}>
            {it.price}
          </p>
        </div>
      </div>
      <p className="mt-3 text-[15px] font-bold leading-snug">{it.lead}</p>
      <p className="mt-2 text-[14px] leading-[1.8]" style={{ color: "var(--color-ink-soft)" }}>
        {it.body}
      </p>
      <ul className="mt-3 space-y-1 rounded-xl px-4 py-3 text-[13.5px]" style={{ backgroundColor: "var(--color-paper-soft)" }}>
        {it.gets.map((g) => (
          <li key={g} className="flex gap-2">
            <span style={{ color: "var(--color-gold)" }}>◆</span>
            <span>{g}</span>
          </li>
        ))}
      </ul>
      <a href={it.href} className="btn-primary mt-4 block text-center">
        {it.cta}
      </a>
    </section>
  );
}

export default function NamePage() {
  return (
    <main className="mx-auto min-h-screen max-w-xl px-5 pb-20 pt-12 sm:pt-16">
      <header className="mb-8 text-center">
        <div className="gold-ornament" aria-hidden>
          <i />
        </div>
        <h1 className="mt-3 text-[26px] font-bold leading-snug" style={{ fontFamily: "var(--font-serif)" }}>
          이름 풀이 · 개명 · 작명
        </h1>
        <p className="mt-2 text-[14px] leading-relaxed" style={{ color: "var(--color-ink-soft)" }}>
          이름은 평생 가장 많이 불리는 기운이에요.
          <br />
          사주에 아쉬운 하나를 이름에 담아 채워 드려요.
        </p>
      </header>
      <div className="space-y-4">
        {PEOPLE.map((it) => (
          <Card key={it.title} it={it} />
        ))}
      </div>
      <h2 className="mb-1 mt-12 text-center text-[20px] font-bold" style={{ fontFamily: "var(--font-serif)" }}>
        가게 · 회사 · 브랜드 이름
      </h2>
      <p className="mb-4 text-center text-[13.5px]" style={{ color: "var(--color-ink-soft)" }}>
        이름은 손님이 매일 듣는 첫인사예요.
      </p>
      <div className="space-y-4">
        {BIZ.map((it) => (
          <Card key={it.title} it={it} />
        ))}
      </div>
      <ReviewStrip naming variant="mini" title="작명을 받은 분들의 한마디" />
      <p className="mt-6 text-center text-[12px] leading-relaxed" style={{ color: "var(--color-ink-faint)" }}>
        전해 오는 작명 이론(수리·자원오행·소리오행)에 따른 참고용이에요. 학파마다 획수와 기준이 조금씩 다를 수 있어요.
        <br />
        가게·회사·브랜드 이름은 같은 이름의 상표가 있는지 특허청 키프리스에서 꼭 확인해 주세요.
      </p>
    </main>
  );
}
