import { NextRequest } from "next/server";
import { memberRoute } from "@/server/routeHelpers";
import { handlePurchase } from "@/server/readings/readingHandlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 깊게 보기·몰아보기·전부 보기 (엽전 차감, 주제 열람권) */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const rawBody = await request.json().catch(() => null);
  return memberRoute(request, "운 열기", (token) => handlePurchase(token, params.id, rawBody));
}
