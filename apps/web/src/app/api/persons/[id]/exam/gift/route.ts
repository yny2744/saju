import { NextRequest, NextResponse } from "next/server";
import { blockIfAuthOff } from "@/server/launchGuard";
import { isSuneungOn } from "@/lib/launchMode";
import { SESSION_COOKIE_NAME, getUserBySessionToken } from "@/server/auth/session";
import { notifyError } from "@/server/alert";
import { GiftError, createExamGift } from "@/server/exam/gift";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 수험생: 부모님께 깊게 보기 선물 부탁 링크 만들기 (2026-10-30) */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  if (!isSuneungOn()) return NextResponse.json({ error: { code: "NOT_FOUND", message: "준비 중이에요." } }, { status: 404 });
  const blocked = blockIfAuthOff();
  if (blocked) return blocked;
  try {
    const user = await getUserBySessionToken(request.cookies.get(SESSION_COOKIE_NAME)?.value);
    if (!user) return NextResponse.json({ error: { code: "LOGIN_REQUIRED", message: "로그인 후 이용할 수 있어요." } }, { status: 401 });
    const token = await createExamGift(user.id, params.id);
    return NextResponse.json({ token, url: `${request.nextUrl.origin}/gift/exam/${token}` });
  } catch (e) {
    if (e instanceof GiftError) return NextResponse.json({ error: { code: e.code, message: e.message } }, { status: e.code === "NOT_FOUND" ? 404 : 409 });
    notifyError("수능대박운 선물 링크", e);
    return NextResponse.json({ error: { code: "SERVER_ERROR", message: "잠시 후 다시 시도해 주세요." } }, { status: 500 });
  }
}
