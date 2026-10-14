import { NextRequest, NextResponse } from "next/server";
import { blockIfAuthOff } from "@/server/launchGuard";
import { SESSION_COOKIE_NAME } from "@/server/auth/session";
import { notifyError } from "@/server/alert";
import { handleCreateCouple } from "@/server/couple/couple";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 연인 궁합 만들기 (수정안 10) - POST { me, partner, consent } */
export async function POST(request: NextRequest) {
  const blocked = blockIfAuthOff();
  if (blocked) return blocked;
  try {
    const body = await request.json().catch(() => ({}));
    const r = await handleCreateCouple(request.cookies.get(SESSION_COOKIE_NAME)?.value, body);
    return NextResponse.json(r.body, { status: r.status });
  } catch (e) {
    notifyError("연인 궁합 만들기", e);
    return NextResponse.json({ error: { code: "SERVER_ERROR", message: "잠시 후 다시 시도해 주세요." } }, { status: 500 });
  }
}
