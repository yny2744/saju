import { NextRequest } from "next/server";
import { memberRoute } from "@/server/routeHelpers";
import { handleAdminMemberLedger } from "@/server/admin/adminHandlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  return memberRoute(request, "관리자 회원 이용내역", (token) => handleAdminMemberLedger(token, params.id));
}
