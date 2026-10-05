import { NextRequest, NextResponse } from "next/server";
import { blockIfAuthOff } from "@/server/launchGuard";
import { handleMe } from "@/server/auth/authHandlers";
import { SESSION_COOKIE_NAME } from "@/server/auth/session";

export const runtime = "nodejs";
// 로그인 상태(쿠키)에 따라 응답이 달라지므로 빌드 때 미리 만들어 두면 안 된다
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const blocked = blockIfAuthOff();
  if (blocked) return blocked;
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const { status, body } = await handleMe(token);
  return NextResponse.json(body, { status });
}
