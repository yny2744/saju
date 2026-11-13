import { NextRequest, NextResponse } from "next/server";
import { canonicalHost, shouldRedirectHost } from "@/lib/canonicalHost";

/** 정식 주소가 아닌 Vercel 보조 주소로 들어오면 정식 주소로 (카카오 로그인 KOE006 방지) - src/lib/canonicalHost.ts 설명 참고 */
/**
 * 2026-11-13 유샘: 로그인 연장 - 로그인한 손님이 들어오면 브라우저의 로그인 쿠키도 그날부터 다시 30일로 (하루 한 번).
 *   서버 쪽 기한은 getUserBySessionToken 이 같은 방식으로 늘린다. 화면 주소에서만 (API·파일 제외).
 */
const SESSION_COOKIE = "ryugyeol_session"; // server/auth/session.ts SESSION_COOKIE_NAME 과 같아야 한다 (미들웨어는 DB 코드를 못 불러 따로 적는다)
const TOUCH_COOKIE = "ryugyeol_session_touch";
const THIRTY_DAYS = 30 * 24 * 60 * 60;

function extendLogin(request: NextRequest, res: NextResponse): NextResponse {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token || request.cookies.get(TOUCH_COOKIE) || request.nextUrl.pathname.startsWith("/api/")) return res;
  res.cookies.set(SESSION_COOKIE, token, { httpOnly: true, secure: true, sameSite: "lax", maxAge: THIRTY_DAYS, path: "/" });
  res.cookies.set(TOUCH_COOKIE, "1", { httpOnly: true, secure: true, sameSite: "lax", maxAge: 24 * 60 * 60, path: "/" });
  return res;
}

export function middleware(request: NextRequest) {
  const host = request.headers.get("host");
  if (!shouldRedirectHost(host, { vercelEnv: process.env.VERCEL_ENV, siteUrl: process.env.SITE_URL })) return extendLogin(request, NextResponse.next());
  const url = request.nextUrl.clone();
  url.protocol = "https:";
  url.host = canonicalHost(process.env.SITE_URL);
  url.port = "";
  return NextResponse.redirect(url, 308);
}

export const config = {
  // 정적 파일·이미지 최적화 경로는 제외
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
