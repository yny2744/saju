import { NextRequest, NextResponse } from "next/server";
import { blockIfAuthOff } from "@/server/launchGuard";
import { SESSION_COOKIE_NAME } from "@/server/auth/session";
import { notifyError } from "@/server/alert";

/**
 * 회원 기능 API 공통 처리: 회원 기능 스위치 확인 → 세션 토큰 꺼내기 → 처리 → 예상 못 한 오류는 알림 후 500.
 */
export async function memberRoute(
  request: NextRequest,
  where: string,
  run: (token: string | undefined) => Promise<{ status: number; body: unknown }>
): Promise<NextResponse> {
  const blocked = blockIfAuthOff();
  if (blocked) return blocked;
  try {
    const { status, body } = await run(request.cookies.get(SESSION_COOKIE_NAME)?.value);
    return NextResponse.json(body, { status });
  } catch (e) {
    notifyError(where, e);
    return NextResponse.json({ error: { code: "SERVER_ERROR", message: "잠시 문제가 생겼어요. 잠시 후 다시 시도해 주세요." } }, { status: 500 });
  }
}
