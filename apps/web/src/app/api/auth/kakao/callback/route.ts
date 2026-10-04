import { NextRequest, NextResponse } from "next/server";
import { blockIfNotLive } from "@/server/launchGuard";
import { exchangeKakaoCode } from "@/server/auth/kakao";
import { findOrCreateKakaoUser } from "@/server/auth/users";
import { createSession, SESSION_COOKIE_NAME } from "@/server/auth/session";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const blocked = blockIfNotLive();
  if (blocked) return blocked;
  const code = request.nextUrl.searchParams.get("code");
  if (!code) {
    return NextResponse.redirect(new URL("/login?error=kakao_denied", request.nextUrl.origin));
  }

  try {
    const { kakaoId, nickname } = await exchangeKakaoCode(code, request.nextUrl.origin);
    const user = await findOrCreateKakaoUser(kakaoId, nickname);
    const session = await createSession(user.id);

    const res = NextResponse.redirect(new URL("/", request.nextUrl.origin));
    res.cookies.set(SESSION_COOKIE_NAME, session.token, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      expires: session.expiresAt,
      path: "/",
    });
    return res;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[auth] 카카오 로그인 실패:", err);
    return NextResponse.redirect(new URL("/login?error=kakao_failed", request.nextUrl.origin));
  }
}
