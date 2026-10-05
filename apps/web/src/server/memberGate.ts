import { NextRequest, NextResponse } from "next/server";
import { isLoginRequired } from "@/lib/launchMode";
import { getUserBySessionToken, SESSION_COOKIE_NAME } from "@/server/auth/session";

/**
 * 수정안 3번: 로그인 필수 스위치(NEXT_PUBLIC_LOGIN_REQUIRED=true)가 켜져 있으면 무료 분석 API도
 * 로그인 + 필수 동의를 마친 회원만 쓸 수 있다. 화면에서 막는 것만으로는 API 직접 호출을 못 막기 때문에
 * 서버에서도 한 번 더 확인한다. 스위치가 꺼져 있으면 아무것도 하지 않는다(지금과 동일).
 */
export async function requireMemberIfLoginRequired(request: NextRequest): Promise<NextResponse | null> {
  if (!isLoginRequired()) return null;
  let user;
  try {
    user = await getUserBySessionToken(request.cookies.get(SESSION_COOKIE_NAME)?.value);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[auth] 로그인 확인 실패:", err);
    return NextResponse.json(
      { error: { code: "AUTH_UNAVAILABLE", message: "로그인 확인 중 문제가 생겼어요. 잠시 후 다시 시도해주세요." } },
      { status: 503 }
    );
  }
  if (!user) {
    return NextResponse.json({ error: { code: "LOGIN_REQUIRED", message: "로그인 후 이용할 수 있어요." } }, { status: 401 });
  }
  if (!user.termsAgreed) {
    return NextResponse.json({ error: { code: "CONSENT_REQUIRED", message: "약관 동의 후 이용할 수 있어요." } }, { status: 403 });
  }
  return null;
}
