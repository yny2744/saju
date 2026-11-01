import { NextRequest } from "next/server";
import { memberRoute } from "@/server/routeHelpers";
import { handleFunUnlock } from "@/server/fun/funUnlock";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 사주 겹쳐 보기 열기 (2026-11-01) - 회원 엽전으로 */
export async function POST(request: NextRequest) {
  const raw = await request.json().catch(() => null);
  return memberRoute(request, "겹쳐 보기 열기", (token) => handleFunUnlock(token, raw));
}
