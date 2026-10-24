import { TENANT } from "@/tenants";
/**
 * 정식 주소 고정 (2026-10-10, 카카오 로그인 KOE006 해결).
 *
 * KOE006 = 카카오에 등록한 Redirect URI와 실제 돌아올 주소가 다를 때 나는 오류.
 * Vercel은 같은 사이트를 여러 주소(saju-web-git-main-…vercel.app, 배포마다 생기는 주소 등)로 열어 주는데,
 * 카카오에는 정식 주소 하나만 등록돼 있어서 다른 주소로 들어온 손님은 로그인이 막혔다.
 * → 운영 배포에서 정식 주소가 아닌 *.vercel.app 으로 들어오면 같은 화면의 정식 주소로 옮긴다.
 *   (로그인 쿠키도 주소마다 따로라, 한 주소로 모으는 게 맞다)
 *
 * 정식 주소는 Vercel 환경변수 SITE_URL (예: 나중에 산 도메인 https://ryugyeol.com) - 없으면 아래 기본값.
 */
/** 2026-10-23 베이직: 기본 정식 주소는 고객사 설정의 siteUrl */
export const DEFAULT_SITE_URL = TENANT.siteUrl;

export function canonicalHost(siteUrl: string | undefined = process.env.SITE_URL): string {
  try {
    return new URL(siteUrl || DEFAULT_SITE_URL).host.toLowerCase();
  } catch {
    return new URL(DEFAULT_SITE_URL).host;
  }
}

/** 이 주소로 들어왔으면 정식 주소로 옮겨야 하나 */
export function shouldRedirectHost(host: string | null, opts: { vercelEnv?: string; siteUrl?: string } = {}): boolean {
  if (!host || opts.vercelEnv !== "production") return false;
  const h = host.toLowerCase().split(":")[0];
  const canon = canonicalHost(opts.siteUrl);
  if (h === canon.split(":")[0]) return false;
  // Vercel이 붙여 주는 보조 주소만 옮긴다 (localhost·직접 연결한 다른 도메인은 건드리지 않음)
  return h.endsWith(".vercel.app");
}
