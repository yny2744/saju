import { NextRequest, NextResponse } from "next/server";
import { blockIfNotLive } from "@/server/launchGuard";
import { buildKakaoAuthorizeUrl, KakaoNotConfiguredError } from "@/server/auth/kakao";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const blocked = blockIfNotLive();
  if (blocked) return blocked;
  try {
    const url = buildKakaoAuthorizeUrl(request.nextUrl.origin);
    return NextResponse.redirect(url);
  } catch (err) {
    if (err instanceof KakaoNotConfiguredError) {
      return NextResponse.redirect(new URL("/login?error=kakao_not_configured", request.nextUrl.origin));
    }
    throw err;
  }
}
