import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/server/auth/session";
import { handlePushSubscribe, handlePushUnsubscribe } from "@/server/push/push";
import { notifyError } from "@/server/alert";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 매일 아침 오늘의 운세 알림 켜기 (2026-11-01) - 로그인 안 한 손님도 켤 수 있다 */
export async function POST(request: NextRequest) {
  try {
    const raw = await request.json().catch(() => null);
    const { status, body } = await handlePushSubscribe(request.cookies.get(SESSION_COOKIE_NAME)?.value, raw);
    return NextResponse.json(body, { status });
  } catch (e) {
    notifyError("알림 켜기", e);
    return NextResponse.json({ error: { code: "SERVER_ERROR", message: "잠시 후 다시 시도해 주세요." } }, { status: 500 });
  }
}

/** 알림 끄기 */
export async function DELETE(request: NextRequest) {
  try {
    const raw = await request.json().catch(() => null);
    const { status, body } = await handlePushUnsubscribe(raw);
    return NextResponse.json(body, { status });
  } catch (e) {
    notifyError("알림 끄기", e);
    return NextResponse.json({ error: { code: "SERVER_ERROR", message: "잠시 후 다시 시도해 주세요." } }, { status: 500 });
  }
}
