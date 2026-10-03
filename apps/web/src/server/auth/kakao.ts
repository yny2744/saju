/**
 * 카카오 로그인(OAuth 2.0 authorization code flow).
 * 필요한 환경변수: KAKAO_REST_API_KEY, KAKAO_CLIENT_SECRET.
 * 카카오 개발자센터(developers.kakao.com)에서 앱 등록 후 Redirect URI를
 * `<사이트주소>/api/auth/kakao/callback`로 정확히 등록해야 한다.
 */

export class KakaoNotConfiguredError extends Error {
  constructor() {
    super("카카오 로그인이 아직 설정되지 않았습니다 (KAKAO_REST_API_KEY 환경변수 없음).");
    this.name = "KakaoNotConfiguredError";
  }
}

function redirectUri(origin: string): string {
  return `${origin}/api/auth/kakao/callback`;
}

export function buildKakaoAuthorizeUrl(origin: string): string {
  const clientId = process.env.KAKAO_REST_API_KEY;
  if (!clientId) throw new KakaoNotConfiguredError();

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri(origin),
    response_type: "code",
  });
  return `https://kauth.kakao.com/oauth/authorize?${params.toString()}`;
}

interface KakaoTokenResponse {
  access_token: string;
}

interface KakaoUserResponse {
  id: number;
  kakao_account?: { profile?: { nickname?: string } };
}

export async function exchangeKakaoCode(code: string, origin: string): Promise<{ kakaoId: string; nickname: string }> {
  const clientId = process.env.KAKAO_REST_API_KEY;
  const clientSecret = process.env.KAKAO_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new KakaoNotConfiguredError();

  const tokenRes = await fetch("https://kauth.kakao.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri(origin),
      code,
    }),
  });
  if (!tokenRes.ok) {
    throw new Error(`카카오 토큰 발급 실패 (status ${tokenRes.status})`);
  }
  const tokenData = (await tokenRes.json()) as KakaoTokenResponse;

  const profileRes = await fetch("https://kapi.kakao.com/v2/user/me", {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });
  if (!profileRes.ok) {
    throw new Error(`카카오 프로필 조회 실패 (status ${profileRes.status})`);
  }
  const profileData = (await profileRes.json()) as KakaoUserResponse;

  return {
    kakaoId: String(profileData.id),
    nickname: profileData.kakao_account?.profile?.nickname ?? "카카오 사용자",
  };
}
