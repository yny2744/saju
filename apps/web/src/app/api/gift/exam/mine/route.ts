import { NextRequest, NextResponse } from "next/server";
import { isAuthEnabled, isSuneungOn } from "@/lib/launchMode";
import { SESSION_COOKIE_NAME, getUserBySessionToken } from "@/server/auth/session";
import { notifyError } from "@/server/alert";
import { markGiftsSeen, myOpenedGifts } from "@/server/exam/gift";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 학생: 보호자(지인)가 결제해 열린 풀이 중 아직 못 본 것 (2026-11-14 유샘 - 알림 띠) */
export async function GET(request: NextRequest) {
  if (!isSuneungOn() || !isAuthEnabled()) return NextResponse.json({ items: [] });
  try {
    const user = await getUserBySessionToken(request.cookies.get(SESSION_COOKIE_NAME)?.value);
    if (!user) return NextResponse.json({ items: [] }, { headers: { "Cache-Control": "private, no-store" } });
    return NextResponse.json({ items: await myOpenedGifts(user.id) }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (e) {
    notifyError("결제 부탁 알림 띠", e);
    return NextResponse.json({ items: [] });
  }
}

/** 알림 띠를 보았음 (닫기·보러 가기) */
export async function POST(request: NextRequest) {
  if (!isSuneungOn() || !isAuthEnabled()) return NextResponse.json({ ok: true });
  try {
    const user = await getUserBySessionToken(request.cookies.get(SESSION_COOKIE_NAME)?.value);
    if (!user) return NextResponse.json({ ok: false }, { status: 401 });
    const b = (await request.json().catch(() => ({}))) as { tokens?: unknown };
    await markGiftsSeen(user.id, Array.isArray(b.tokens) ? b.tokens.filter((t): t is string => typeof t === "string") : []);
    return NextResponse.json({ ok: true });
  } catch (e) {
    notifyError("결제 부탁 알림 띠 닫기", e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
