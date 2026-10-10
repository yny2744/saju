import { NextRequest } from "next/server";
import { memberRoute } from "@/server/routeHelpers";
import { handleAdminDecideCharge } from "@/server/admin/adminHandlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 충전 신청 승인(엽전 지급) / 거절 */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const body = await request.json().catch(() => null);
  return memberRoute(request, "충전 승인", (token) => handleAdminDecideCharge(token, params.id, body));
}
