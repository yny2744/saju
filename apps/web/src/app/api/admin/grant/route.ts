import { NextRequest } from "next/server";
import { memberRoute } from "@/server/routeHelpers";
import { handleAdminGrant } from "@/server/admin/adminHandlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  return memberRoute(request, "관리자 엽전 지급", (token) => handleAdminGrant(token, body));
}
