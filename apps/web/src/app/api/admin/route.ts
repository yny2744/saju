import { NextRequest } from "next/server";
import { memberRoute } from "@/server/routeHelpers";
import { handleAdminOverview } from "@/server/admin/adminHandlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 관리자: 숫자·충전 신청·최근 오류 */
export async function GET(request: NextRequest) {
  return memberRoute(request, "관리자 화면", (token) => handleAdminOverview(token));
}
