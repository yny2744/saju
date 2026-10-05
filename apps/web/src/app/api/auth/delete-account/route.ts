import { NextRequest, NextResponse } from "next/server";
import { blockIfAuthOff } from "@/server/launchGuard";
import { db } from "@/server/auth/db";
import { getUserBySessionToken, SESSION_COOKIE_NAME } from "@/server/auth/session";

export const runtime = "nodejs";
// 로그인 상태(쿠키)에 따라 응답이 달라지므로 빌드 때 미리 만들어 두면 안 된다
export const dynamic = "force-dynamic";

/**
 * 회원탈퇴 - users 테이블에서 본인 행을 삭제한다. sessions는
 * "ON DELETE CASCADE"로 걸려있어 users가 지워지면 그 사람의 모든 세션도
 * 자동으로 같이 삭제된다 (db.ts의 스키마 참고).
 */
export async function DELETE(request: NextRequest) {
  const blocked = blockIfAuthOff();
  if (blocked) return blocked;
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const user = await getUserBySessionToken(token);

  if (!user) {
    return NextResponse.json({ error: { code: "NOT_LOGGED_IN", message: "로그인이 필요합니다." } }, { status: 401 });
  }

  const pool = await db();
  await pool.query(`DELETE FROM users WHERE id = $1`, [user.id]);

  const res = NextResponse.json({ ok: true });
  res.cookies.delete(SESSION_COOKIE_NAME);
  return res;
}
