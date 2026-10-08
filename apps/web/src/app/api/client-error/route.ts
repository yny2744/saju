import { NextRequest, NextResponse } from "next/server";
import { notifyError } from "@/server/alert";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 알림 폭주 방지: 서버 인스턴스당 1분에 20건까지만 넘긴다 (그 이상은 조용히 무시)
const WINDOW_MS = 60_000;
const LIMIT = 20;
let windowStart = 0;
let count = 0;

/** 화면(브라우저)에서 난 오류를 받아 알림으로 넘긴다. 손님 정보는 받지 않는다(어느 화면·어떤 오류인지만). */
export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as { where?: unknown; message?: unknown } | null;
  const where = typeof body?.where === "string" ? body.where.slice(0, 120) : "알 수 없는 화면";
  const message = typeof body?.message === "string" ? body.message.slice(0, 400) : "알 수 없는 오류";
  const now = Date.now();
  if (now - windowStart > WINDOW_MS) {
    windowStart = now;
    count = 0;
  }
  if (++count <= LIMIT) notifyError(`화면 오류 · ${where}`, new Error(message));
  return NextResponse.json({ ok: true });
}
