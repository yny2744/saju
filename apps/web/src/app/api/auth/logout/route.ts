import { NextRequest, NextResponse } from "next/server";
import { handleLogout } from "@/server/auth/authHandlers";
import { SESSION_COOKIE_NAME } from "@/server/auth/session";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const { status, body } = await handleLogout(token);
  const res = NextResponse.json(body, { status });
  res.cookies.delete(SESSION_COOKIE_NAME);
  return res;
}
