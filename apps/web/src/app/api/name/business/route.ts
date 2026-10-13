import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/server/auth/session";
import { notifyError } from "@/server/alert";
import { handleBusinessReading } from "@/server/naming/business";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 무료 상호 풀이 (수정안 63) - POST { name, hanja?, industry?, profileId? }. 엔진만 쓴다 (AI 없음). */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const r = await handleBusinessReading(request.cookies.get(SESSION_COOKIE_NAME)?.value, body);
    return NextResponse.json(r.body, { status: r.status, headers: { "Cache-Control": "private, no-store" } });
  } catch (e) {
    notifyError("상호 풀이", e);
    return NextResponse.json({ error: { code: "SERVER_ERROR", message: "잠시 후 다시 시도해 주세요." } }, { status: 500 });
  }
}
