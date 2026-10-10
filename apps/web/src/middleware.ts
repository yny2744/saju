import { NextRequest, NextResponse } from "next/server";
import { canonicalHost, shouldRedirectHost } from "@/lib/canonicalHost";

/** 정식 주소가 아닌 Vercel 보조 주소로 들어오면 정식 주소로 (카카오 로그인 KOE006 방지) - src/lib/canonicalHost.ts 설명 참고 */
export function middleware(request: NextRequest) {
  const host = request.headers.get("host");
  if (!shouldRedirectHost(host, { vercelEnv: process.env.VERCEL_ENV, siteUrl: process.env.SITE_URL })) return NextResponse.next();
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
