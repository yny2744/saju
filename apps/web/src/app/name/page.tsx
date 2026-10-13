import type { Metadata } from "next";
import { CURRENCY_NAME, PRICE, formatNyang } from "@/lib/yeopjeon";
import { ReviewStrip } from "@/components/reviews/ReviewStrip";

export const metadata: Metadata = {
  title: "이름 풀이 · 개명 · 작명 · 류결사주",
  description: "내 이름이 사주와 맞는지 무료로 풀어 보고, 사주에 아쉬운 기운을 채우는 새 이름·아이 이름·가게 이름(상호)을 추천받으세요.",
};

const CARD = {
  border: "1px solid var(--color-gold-line)",
  backgroundColor: "var(--color-card)",
  boxShadow: "inset 0 0 0 3px var(--color-card), inset 0 0 0 4px var(--color-gold-soft)",
} as const;

/**
 * 이름 풀이 · 작명 (2026-10-12 수정안 45·46).
 *   무료 이름 풀이 → /start?next=name
 *   개명 추천 29,500냥 → /go?name=rename (저장한 사람 고르기 / 새로 입력)
 *   아이 작명 49,000냥 → /start?name=naming (아기의 성·생년월일시)
 *   2026-10-13 수정안 63: 순서 이름 풀이 → 개명 → 작명, 아래에 가게·회사 이름(상호 풀이 무료 → /name/business, 상호 작명 → /go?name=business)
 */
export default function NamePage() {
  const items = [
    {
      hanja: "名",
      title: "내 이름 풀이",
      price: "무료",
      body: "지금 이름의 한자 획수(수리 네 격)·소리·음양, 그리고 이름 글자가 사주에 아쉬운 기운을 채워 주는지 풀어 드려요.",
      href: "/start?next=name",
      cta: "무료로 내 이름 풀이 보기",
    },
    {
      hanja: "改",
      title: "개명 추천",
      price: `${CURRENCY_NAME} ${formatNyang(PRICE.RENAME)}`,
      body: "지금 이름을 진단하고, 사주에 아쉬운 기운을 채우면서 수리 네 격이 모두 길한 새 이름 후보 5개를 이름 이야기와 함께 골라 드려요. 개명 추천서 PDF를 받을 수 있어요.",
      href: "/go?name=rename",
      cta: "개명 추천 받기",
    },
    {
      hanja: "命",
      title: "아이 작명",
      price: `${CURRENCY_NAME} ${formatNyang(PRICE.NAMING)}`,
      body: "아기의 사주를 세워 아쉬운 기운을 찾고, 그 기운을 채우는 한자로 이름 후보 7개를 골라 드려요. 돌림자도 반영하고, 후보마다 이름 이야기와 작명서 PDF를 드려요.",
      href: "/start?name=naming",
      cta: "아이 이름 지으러 가기",
    },
  ];
  const business = [
    {
      hanja: "商",
      title: "상호 풀이",
      price: "무료",
      body: "지금 쓰는(또는 쓰려는) 가게·회사 이름이 업종의 기운과 맞는지, 소리가 부딪히지 않는지, 한자 총획이 길한지 풀어 드려요. 저장한 대표자 사주를 고르면 사주와의 어울림까지 봐요.",
      href: "/name/business",
      cta: "무료로 상호 풀이 보기",
    },
    {
      hanja: "號",
      title: "상호 작명",
      price: `${CURRENCY_NAME} ${formatNyang(PRICE.BUSINESS)}`,
      body: "대표자 사주에 아쉬운 기운과 업종의 오행을 함께 맞춰 한자·한글 상호 후보 7개를 골라 드려요. 후보마다 뜻·이름 이야기·영문 표기를 드리고, 상호 작명서 PDF를 받을 수 있어요.",
      href: "/go?name=business",
      cta: "상호 작명 받기",
    },
  ];
  const card = (it: (typeof items)[number]) => (
    <section key={it.title} className="rounded-2xl p-5" style={CARD}>
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
      <p className="mt-3 text-[14px] leading-relaxed" style={{ color: "var(--color-ink-soft)" }}>
        {it.body}
      </p>
      <a href={it.href} className="btn-primary mt-4 block text-center">
        {it.cta}
      </a>
    </section>
  );
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
      <div className="space-y-4">{items.map(card)}</div>
      <h2 className="mb-1 mt-12 text-center text-[20px] font-bold" style={{ fontFamily: "var(--font-serif)" }}>
        가게 · 회사 이름
      </h2>
      <p className="mb-4 text-center text-[13.5px]" style={{ color: "var(--color-ink-soft)" }}>
        상호는 가게가 매일 듣는 첫인사예요.
      </p>
      <div className="space-y-4">{business.map(card)}</div>
      <ReviewStrip naming variant="mini" title="작명·개명·상호를 받은 분들의 한마디" />
      <p className="mt-6 text-center text-[12px] leading-relaxed" style={{ color: "var(--color-ink-faint)" }}>
        전해 오는 작명 이론(수리·자원오행·소리오행)에 따른 참고용이에요. 학파마다 획수와 기준이 조금씩 다를 수 있어요.
        <br />
        후보가 마음에 들지 않으면 처음 받은 뒤 7일 안에 한 번 다시 추천받을 수 있어요.
      </p>
    </main>
  );
}
