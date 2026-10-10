import { NextRequest } from "next/server";
import { memberRoute } from "@/server/routeHelpers";
import { handleAdminMembers } from "@/server/admin/adminHandlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q") ?? "";
  return memberRoute(request, "관리자 회원 목록", (token) => handleAdminMembers(token, q));
}
