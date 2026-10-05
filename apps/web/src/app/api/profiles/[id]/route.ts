import { NextRequest, NextResponse } from "next/server";
import { blockIfAuthOff } from "@/server/launchGuard";
import { getUserBySessionToken, SESSION_COOKIE_NAME } from "@/server/auth/session";
import { deleteProfile } from "@/server/auth/profiles";

export const runtime = "nodejs";
// 로그인 상태(쿠키)에 따라 응답이 달라지므로 빌드 때 미리 만들어 두면 안 된다
export const dynamic = "force-dynamic";

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const blocked = blockIfAuthOff();
  if (blocked) return blocked;
  const user = await getUserBySessionToken(request.cookies.get(SESSION_COOKIE_NAME)?.value);
  if (!user) return NextResponse.json({ error: { code: "NOT_LOGGED_IN", message: "로그인이 필요합니다." } }, { status: 401 });
  const ok = await deleteProfile(user.id, params.id);
  return NextResponse.json({ ok }, { status: ok ? 200 : 404 });
}
