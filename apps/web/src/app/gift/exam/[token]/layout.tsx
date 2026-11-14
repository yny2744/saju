import type { Metadata } from "next";
import { BRAND, TENANT } from "@/tenants";
import { isSuneungOn } from "@/lib/launchMode";
import { formatWon } from "@/lib/pricingList";
import { getExamGift } from "@/server/exam/gift";

export const dynamic = "force-dynamic";

/**
 * 결제 부탁 링크 - 카톡 미리보기 (2026-11-14 유샘). 보낸 사람 이름·상품·가격이 카드에 보이게.
 * 생년월일 등은 넣지 않는다. 개인 링크라 검색에는 내보내지 않는다.
 */
export async function generateMetadata({ params }: { params: { token: string } }): Promise<Metadata> {
  let title = `${BRAND} · 수능대박운 결제 부탁`;
  let description = "링크를 열면 바로 결제할 수 있어요.";
  try {
    if (isSuneungOn()) {
      const g = await getExamGift(params.token, null);
      if (g) {
        title = `${g.nickname}님이 결제를 부탁했어요`;
        description = `${g.title} · ${formatWon(g.price)} · 링크를 열면 바로 결제할 수 있어요.`;
      }
    }
  } catch {
    /* 미리보기는 기본 문구로 */
  }
  return {
    title,
    description,
    robots: { index: false, follow: false },
    openGraph: {
      title,
      description,
      siteName: BRAND,
      locale: "ko_KR",
      type: "website",
      url: `${TENANT.siteUrl}/gift/exam/${encodeURIComponent(params.token)}`,
      images: [{ url: `${TENANT.siteUrl}/promo/suneung-poster.jpg`, width: 720, height: 720 }],
    },
  };
}

export default function GiftLayout({ children }: { children: React.ReactNode }) {
  return children;
}
