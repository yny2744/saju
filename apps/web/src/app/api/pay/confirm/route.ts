import { NextRequest } from "next/server";
import { memberRoute } from "@/server/routeHelpers";
import { handleConfirm } from "@/server/pay/payHandlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 결제 승인 → 운세 열기 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  return memberRoute(request, "결제 승인", (token) => handleConfirm(token, body));
}
