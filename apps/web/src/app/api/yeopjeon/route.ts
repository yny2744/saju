import { NextRequest } from "next/server";
import { memberRoute } from "@/server/routeHelpers";
import { handleYeopjeonSummary } from "@/server/readings/readingHandlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 내 엽전 잔액·이용내역·초대 코드·풀이한 사람들 */
export async function GET(request: NextRequest) {
  return memberRoute(request, "엽전 요약", (token) => handleYeopjeonSummary(token));
}
