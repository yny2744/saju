import { NextRequest, NextResponse } from "next/server";
import { blockIfAuthOff } from "@/server/launchGuard";
import { handleSignup } from "@/server/auth/authHandlers";
import { SESSION_COOKIE_NAME } from "@/server/auth/session";
import { REF_COOKIE_NAME } from "@/lib/yeopjeon";

export const runtime = "nodejs";
// 로그인 상태(쿠키)에 따라 응답이 달라지므로 빌드 때 미리 만들어 두면 안 된다
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const blocked = blockIfAuthOff();
  if (blocked) return blocked;
  const rawBody = await request.json().catch(() => null);
  const { status, body, session } = await handleSignup(rawBody, request.cookies.get(REF_COOKIE_NAME)?.value);
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
