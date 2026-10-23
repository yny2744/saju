import { NextRequest, NextResponse } from "next/server";
import { blockIfAuthOff } from "@/server/launchGuard";
import { handleGuestStart } from "@/server/auth/authHandlers";
import { SESSION_COOKIE_NAME } from "@/server/auth/session";
import { getRateLimiter } from "@/server/rateLimit";

export const runtime = "nodejs";
// 로그인 상태(쿠키)에 따라 응답이 달라지므로 빌드 때 미리 만들어 두면 안 된다
export const dynamic = "force-dynamic";

/** 비회원으로 시작 (2026-10-23): 필수 약관 동의 → 비회원 계정 + 로그인 쿠키 → 바로 결제까지 */
export async function POST(request: NextRequest) {
  const blocked = blockIfAuthOff();
  if (blocked) return blocked;
  const ip = request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? "unknown";
  if (getRateLimiter().isRateLimited(`guest:${ip}`)) {
    return NextResponse.json({ error: { code: "RATE_LIMITED", message: "잠시 후 다시 시도해주세요." } }, { status: 429 });
  }
  const rawBody = await request.json().catch(() => null);
  const { status, body, session } = await handleGuestStart(request.cookies.get(SESSION_COOKIE_NAME)?.value, rawBody);
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
