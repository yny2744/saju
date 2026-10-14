import { NextRequest, NextResponse } from "next/server";
import { blockIfAuthOff } from "@/server/launchGuard";
import { SESSION_COOKIE_NAME } from "@/server/auth/session";
import { notifyError } from "@/server/alert";
import { handleWriteCouple } from "@/server/couple/couple";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** 연인 궁합 풀이 쓰기 (산 사람만, 한 번) */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const blocked = blockIfAuthOff();
  if (blocked) return blocked;
  try {
    const r = await handleWriteCouple(request.cookies.get(SESSION_COOKIE_NAME)?.value, params.id);
    return NextResponse.json(r.body, { status: r.status });
  } catch (e) {
    notifyError("연인 궁합 쓰기", e);
    return NextResponse.json({ error: { code: "SERVER_ERROR", message: "풀이를 쓰는 곳이 붐벼요. 잠시 후 다시 눌러 주세요. 엽전은 다시 빠지지 않아요." } }, { status: 500 });
  }
}
