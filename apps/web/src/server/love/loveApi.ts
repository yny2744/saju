import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, getUserBySessionToken } from "@/server/auth/session";
import { getResult } from "@/server/resultStore";

/** 크리스마스 연애운 API 공통 (2026-11-09) */
export const NO_STORE = { "Cache-Control": "private, no-store" } as const;
export const fail = (status: number, code: string, message: string) => NextResponse.json({ error: { code, message } }, { status });

/** 무료 결과 토큰 하나 → 저장된 결과 (보관 시간이 지났으면 null) */
export function resultOf(v: unknown) {
  return typeof v === "string" && v ? getResult(v) : null;
}

/** 약관까지 동의한 회원 (비회원 계정 제외) */
export async function memberOf(request: NextRequest) {
  const user = await getUserBySessionToken(request.cookies.get(SESSION_COOKIE_NAME)?.value);
  // 비회원 결제 계정은 맛보기만 (2026-11-09 유샘: 비회원은 카카오 로그인 뒤 나머지)
  if (!user || user.isGuest) return { error: fail(401, "LOGIN_REQUIRED", "로그인 후 이용할 수 있어요.") } as const;
  if (!user.termsAgreed) return { error: fail(403, "CONSENT_REQUIRED", "약관 동의 후 이용할 수 있어요.") } as const;
  return { user } as const;
}
