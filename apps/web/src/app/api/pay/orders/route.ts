import { NextRequest } from "next/server";
import { memberRoute } from "@/server/routeHelpers";
import { handleMyOrders } from "@/server/pay/payHandlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 내 결제 내역 (2026-11-13 유샘) */
export async function GET(request: NextRequest) {
  return memberRoute(request, "내 결제 내역", (token) => handleMyOrders(token));
}
