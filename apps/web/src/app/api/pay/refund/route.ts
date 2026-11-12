import { NextRequest } from "next/server";
import { memberRoute } from "@/server/routeHelpers";
import { handleRefundRequest } from "@/server/pay/payHandlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 환불 신청 (2026-11-13 유샘) */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  return memberRoute(request, "환불 신청", (token) => handleRefundRequest(token, body));
}
