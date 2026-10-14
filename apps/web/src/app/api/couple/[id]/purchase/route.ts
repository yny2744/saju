import { NextRequest } from "next/server";
import { memberRoute } from "@/server/routeHelpers";
import { handlePurchase } from "@/server/readings/readingHandlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 연인 궁합 열기 (19,900냥) - 사주 상품과 같은 구매 길, 상품 종류만 "couple" */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  return memberRoute(request, "연인 궁합 열기", (token) => handlePurchase(token, params.id, { mode: "couple", topics: [] }));
}
