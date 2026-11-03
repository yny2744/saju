import { NextRequest, NextResponse } from "next/server";
import { blockIfAuthOff } from "@/server/launchGuard";
import { SESSION_COOKIE_NAME, getUserBySessionToken } from "@/server/auth/session";
import { notifyError } from "@/server/alert";
import { getPersonRow, getPersonSummary } from "@/server/readings/readings";
import { getBalance } from "@/server/yeopjeon/ledger";
import { nyFullPrice, nyLightPrice, nyOn } from "@/lib/newyear2027";
import { composeNyTotal, getNyFull, nyPreview } from "@/server/newyear/newyear";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 2027 신년운 (2026-11-03) - 총운(엔진)·전체 보기(AI) 상태.
 *   총운은 열렸을 때만 끝까지(안 열렸으면 맛보기만). 전체 보기는 열렸는데 아직 안 썼으면 full: null (화면이 /write 를 부른다).
 */
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  if (!nyOn()) return NextResponse.json({ error: { code: "NOT_FOUND", message: "준비 중이에요." } }, { status: 404 });
  const blocked = blockIfAuthOff();
  if (blocked) return blocked;
  try {
    const user = await getUserBySessionToken(request.cookies.get(SESSION_COOKIE_NAME)?.value);
    if (!user) return NextResponse.json({ error: { code: "LOGIN_REQUIRED", message: "로그인 후 이용할 수 있어요." } }, { status: 401 });
    const [row, summary] = await Promise.all([getPersonRow(user.id, params.id), getPersonSummary(user.id, params.id)]);
    if (!row || !summary) return NextResponse.json({ error: { code: "NOT_FOUND", message: "사람을 찾을 수 없어요." } }, { status: 404 });
    const total = composeNyTotal(row.saju, row.nickname);
    const open = summary.ny.light || summary.ny.full;
    return NextResponse.json(
      {
        nickname: row.nickname,
        owned: summary.ny,
        lightPrice: nyLightPrice(),
        fullPrice: nyFullPrice(),
        balance: await getBalance(user.id),
        total: open ? total : null,
        preview: open ? null : nyPreview(total),
        full: summary.ny.full ? await getNyFull(row.id) : null,
      },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (e) {
    notifyError("2027 신년운", e);
    return NextResponse.json({ error: { code: "SERVER_ERROR", message: "잠시 후 다시 시도해 주세요." } }, { status: 500 });
  }
}
