import { NextRequest, NextResponse } from "next/server";
import { blockIfNotLive } from "@/server/launchGuard";
import { handleLogin } from "@/server/auth/authHandlers";
import { SESSION_COOKIE_NAME } from "@/server/auth/session";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const blocked = blockIfNotLive();
  if (blocked) return blocked;
  const rawBody = await request.json().catch(() => null);
  const { status, body, session } = await handleLogin(rawBody);
  const res = NextResponse.json(body, { status });
  if (session) {
    res.cookies.set(SESSION_COOKIE_NAME, session.token, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      expires: session.expiresAt,
      path: "/",
    });
  }
  return res;
}
