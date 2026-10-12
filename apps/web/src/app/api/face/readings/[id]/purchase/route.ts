import { NextRequest } from "next/server";
import { memberRoute } from "@/server/routeHelpers";
import { handlePurchase } from "@/server/readings/readingHandlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 관상 심층 풀이 열기 (엽전 4,900냥) - 사주 상품과 같은 구매 길, 상품 종류만 "face" */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  return memberRoute(request, "관상 풀이 열기", (token) => handlePurchase(token, params.id, { mode: "face", topics: [] }));
}
