import { NextRequest } from "next/server";
import { memberRoute } from "@/server/routeHelpers";
import { handleGetPerson } from "@/server/readings/readingHandlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 풀이 대상 + 연 운 목록 + 잔액 */
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  return memberRoute(request, "풀이 대상 보기", (token) => handleGetPerson(token, params.id));
}
