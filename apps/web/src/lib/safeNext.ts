/**
 * 로그인 후 돌아갈 주소(next) 검증. 우리 사이트 안의 경로("/start?next=fortune" 같은)만 허용하고,
 * 다른 사이트로 튕겨 보내는 주소("//evil.com", "https://...")는 막는다(오픈 리다이렉트 방지).
 */
export function safeNext(value: string | null | undefined): string | null {
  if (!value || value.length > 300) return null;
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return null;
  if (/[\r\n]/.test(value)) return null;
  return value;
}

/** 로그인 후 돌아갈 경로를 잠깐(10분) 기억하는 쿠키 - 카카오 콜백에서 읽고 지운다 */
export const NEXT_COOKIE_NAME = "ryugyeol_next";
