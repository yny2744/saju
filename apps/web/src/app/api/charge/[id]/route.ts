import { NextRequest } from "next/server";
import { memberRoute } from "@/server/routeHelpers";
import { handleCancelCharge } from "@/server/admin/chargeHandlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 확인 전 충전 신청 취소 */
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  return memberRoute(request, "충전 신청 취소", (token) => handleCancelCharge(token, params.id));
}
