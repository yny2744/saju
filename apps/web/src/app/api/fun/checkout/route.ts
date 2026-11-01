import { NextRequest } from "next/server";
import { memberRoute } from "@/server/routeHelpers";
import { handleFunCheckout } from "@/server/fun/funUnlock";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 사주 겹쳐 보기 - 엽전이 모자랄 때 결제 주문 (2026-11-01) */
export async function POST(request: NextRequest) {
  const raw = await request.json().catch(() => null);
  return memberRoute(request, "겹쳐 보기 결제", (token) => handleFunCheckout(token, raw));
}
