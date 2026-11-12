import { NextRequest } from "next/server";
import { memberRoute } from "@/server/routeHelpers";
import { handleAdminRefund } from "@/server/pay/payHandlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 관리자 환불 처리 (2026-11-13 유샘) */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  return memberRoute(request, "관리자 환불", (token) => handleAdminRefund(token, body));
}
