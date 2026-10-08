import { NextRequest } from "next/server";
import { memberRoute } from "@/server/routeHelpers";
import { handleCreatePerson } from "@/server/readings/readingHandlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 풀이 대상(사람) 만들기 - 결제 없음 */
export async function POST(request: NextRequest) {
  const rawBody = await request.json().catch(() => null);
  return memberRoute(request, "풀이 대상 만들기", (token) => handleCreatePerson(token, rawBody));
}
