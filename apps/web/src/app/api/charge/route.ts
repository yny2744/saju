import { NextRequest } from "next/server";
import { memberRoute } from "@/server/routeHelpers";
import { handleChargeInfo, handleCreateCharge } from "@/server/admin/chargeHandlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return memberRoute(request, "충전 화면", (token) => handleChargeInfo(token));
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  return memberRoute(request, "충전 신청", (token) => handleCreateCharge(token, body));
}
