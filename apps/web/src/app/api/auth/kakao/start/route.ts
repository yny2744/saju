import { NextRequest, NextResponse } from "next/server";
import { blockIfAuthOff } from "@/server/launchGuard";
import { buildKakaoAuthorizeUrl, KakaoNotConfiguredError } from "@/server/auth/kakao";
import { safeNext, NEXT_COOKIE_NAME } from "@/lib/safeNext";

export const runtime = "nodejs";
// 로그인 상태(쿠키)에 따라 응답이 달라지므로 빌드 때 미리 만들어 두면 안 된다
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const blocked = blockIfAuthOff();
  if (blocked) return blocked;
  try {
    const url = buildKakaoAuthorizeUrl(request.nextUrl.origin);
    const res = NextResponse.redirect(url);
    const next = safeNext(request.nextUrl.searchParams.get("next"));
    if (next) {
      res.cookies.set(NEXT_COOKIE_NAME, next, { httpOnly: true, secure: true, sameSite: "lax", maxAge: 600, path: "/" });
    }
    return res;
  } catch (err) {
    if (err instanceof KakaoNotConfiguredError) {
      return NextResponse.redirect(new URL("/login?error=kakao_not_configured", request.nextUrl.origin));
    }
    throw err;
  }
}
