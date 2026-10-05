import { NextRequest, NextResponse } from "next/server";
import { blockIfAuthOff } from "@/server/launchGuard";
import { exchangeKakaoCode } from "@/server/auth/kakao";
import { findOrCreateKakaoUser } from "@/server/auth/users";
import { createSession, SESSION_COOKIE_NAME } from "@/server/auth/session";
import { safeNext, NEXT_COOKIE_NAME } from "@/lib/safeNext";

export const runtime = "nodejs";
// 로그인 상태(쿠키)에 따라 응답이 달라지므로 빌드 때 미리 만들어 두면 안 된다
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const blocked = blockIfAuthOff();
  if (blocked) return blocked;
  const code = request.nextUrl.searchParams.get("code");
  if (!code) {
    return NextResponse.redirect(new URL("/login?error=kakao_denied", request.nextUrl.origin));
  }

  try {
    const { kakaoId, nickname } = await exchangeKakaoCode(code, request.nextUrl.origin);
    const user = await findOrCreateKakaoUser(kakaoId, nickname);
    const session = await createSession(user.id);

    // 로그인 전에 보던 화면으로 돌려보낸다. 처음 온 사람(약관 동의 전)은 동의 화면을 먼저 거친다.
    const next = safeNext(request.cookies.get(NEXT_COOKIE_NAME)?.value) ?? "/";
    const target = user.termsAgreed ? next : `/consent?next=${encodeURIComponent(next)}`;

    const res = NextResponse.redirect(new URL(target, request.nextUrl.origin));
    res.cookies.set(SESSION_COOKIE_NAME, session.token, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      expires: session.expiresAt,
      path: "/",
    });
    res.cookies.delete(NEXT_COOKIE_NAME);
    return res;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[auth] 카카오 로그인 실패:", err);
    return NextResponse.redirect(new URL("/login?error=kakao_failed", request.nextUrl.origin));
  }
}
