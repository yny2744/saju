import { NextRequest, NextResponse } from "next/server";
import { blockIfAuthOff } from "@/server/launchGuard";
import { SESSION_COOKIE_NAME } from "@/server/auth/session";
import { notifyError } from "@/server/alert";
import { handleGetCouple } from "@/server/couple/couple";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 연인 궁합 화면 (수정안 10) */
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const blocked = blockIfAuthOff();
  if (blocked) return blocked;
  try {
    const r = await handleGetCouple(request.cookies.get(SESSION_COOKIE_NAME)?.value, params.id);
    return NextResponse.json(r.body, { status: r.status, headers: { "Cache-Control": "private, no-store" } });
  } catch (e) {
    notifyError("연인 궁합 불러오기", e);
    return NextResponse.json({ error: { code: "SERVER_ERROR", message: "잠시 후 다시 시도해 주세요." } }, { status: 500 });
  }
}
