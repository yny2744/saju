import { NextRequest, NextResponse } from "next/server";
import { blockIfAuthOff } from "@/server/launchGuard";
import { SESSION_COOKIE_NAME, getUserBySessionToken } from "@/server/auth/session";
import { notifyError } from "@/server/alert";
import { getPersonRow, getPersonSummary } from "@/server/readings/readings";
import { getBalance } from "@/server/yeopjeon/ledger";
import { wallpaperSpec } from "@/lib/wallpaper";
import { PRICE } from "@/lib/yeopjeon";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 행운 배경화면 (수정안 12) - 잠김이면 가격·잔액, 열렸으면 그릴 재료 */
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const blocked = blockIfAuthOff();
  if (blocked) return blocked;
  try {
    const user = await getUserBySessionToken(request.cookies.get(SESSION_COOKIE_NAME)?.value);
    if (!user) return NextResponse.json({ error: { code: "LOGIN_REQUIRED", message: "로그인 후 이용할 수 있어요." } }, { status: 401 });
    const [row, summary] = await Promise.all([getPersonRow(user.id, params.id), getPersonSummary(user.id, params.id)]);
    if (!row || !summary) return NextResponse.json({ error: { code: "NOT_FOUND", message: "사람을 찾을 수 없어요." } }, { status: 404 });
    const spec = wallpaperSpec(row.saju, row.nickname, row.hanja_name);
    const base = { nickname: row.nickname, element: spec.element, price: PRICE.WALLPAPER };
    if (!summary.wallpaper) return NextResponse.json({ ...base, status: "locked", balance: await getBalance(user.id) }, { headers: { "Cache-Control": "private, no-store" } });
    return NextResponse.json({ ...base, status: "ready", spec }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (e) {
    notifyError("행운 배경화면", e);
    return NextResponse.json({ error: { code: "SERVER_ERROR", message: "잠시 후 다시 시도해 주세요." } }, { status: 500 });
  }
}
