import { NextRequest } from "next/server";
import { memberRoute } from "@/server/routeHelpers";
import { handleOpened } from "@/server/pay/payHandlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 결제 완료 화면 [지금 풀이 열기] - 연 시각 기록 (2026-11-12 유샘) */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  return memberRoute(request, "풀이 열람 기록", (token) => handleOpened(token, body));
}
