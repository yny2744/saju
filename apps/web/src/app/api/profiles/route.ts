import { NextRequest, NextResponse } from "next/server";
import { blockIfAuthOff } from "@/server/launchGuard";
import { getUserBySessionToken, SESSION_COOKIE_NAME } from "@/server/auth/session";
import { listProfiles, parseProfileInput, saveProfile, MAX_PROFILES } from "@/server/auth/profiles";

export const runtime = "nodejs";
// 로그인 상태(쿠키)에 따라 응답이 달라지므로 빌드 때 미리 만들어 두면 안 된다
export const dynamic = "force-dynamic";

const NOT_LOGGED_IN = { error: { code: "NOT_LOGGED_IN", message: "로그인이 필요합니다." } };

/** 내가 저장한 사람 목록 */
export async function GET(request: NextRequest) {
  const blocked = blockIfAuthOff();
  if (blocked) return blocked;
  const user = await getUserBySessionToken(request.cookies.get(SESSION_COOKIE_NAME)?.value);
  if (!user) return NextResponse.json(NOT_LOGGED_IN, { status: 401 });
  return NextResponse.json({ profiles: await listProfiles(user.id) });
}

/** 사람 저장(같은 이름·생년월일·양음력이면 갱신) */
export async function POST(request: NextRequest) {
  const blocked = blockIfAuthOff();
  if (blocked) return blocked;
  const user = await getUserBySessionToken(request.cookies.get(SESSION_COOKIE_NAME)?.value);
  if (!user) return NextResponse.json(NOT_LOGGED_IN, { status: 401 });
  const input = parseProfileInput(await request.json().catch(() => null));
  if (!input) {
    return NextResponse.json({ error: { code: "INVALID_INPUT", message: "저장할 정보가 올바르지 않습니다." } }, { status: 400 });
  }
  const saved = await saveProfile(user.id, input);
  if (!saved) {
    return NextResponse.json(
      { error: { code: "PROFILE_LIMIT", message: `최대 ${MAX_PROFILES}명까지 저장할 수 있어요.` } },
      { status: 409 }
    );
  }
  return NextResponse.json({ profile: saved });
}
