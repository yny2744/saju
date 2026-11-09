import { NextRequest, NextResponse } from "next/server";
import { loveOn } from "@/lib/love/loveProducts";
import { blockIfAuthOff } from "@/server/launchGuard";
import { notifyError } from "@/server/alert";
import { getPersonRow } from "@/server/readings/readings";
import { generateCoupleCal, generateSoloCal, getLoveCal, loveOwned, saveLoveCal } from "@/server/love/love";
import { fail, memberOf } from "@/server/love/loveApi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** 2027 연애 달력 쓰기 (산 사람만, 한 번 쓰면 저장한 것을 돌려준다) */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  if (!loveOn()) return fail(404, "NOT_FOUND", "준비 중이에요.");
  const blocked = blockIfAuthOff();
  if (blocked) return blocked;
  try {
    const m = await memberOf(request);
    if ("error" in m) return m.error;
    const partnerId = request.nextUrl.searchParams.get("partner") || null;
    const row = await getPersonRow(m.user.id, params.id);
    const prow = partnerId ? await getPersonRow(m.user.id, partnerId) : null;
    if (!row || (partnerId && !prow)) return fail(404, "NOT_FOUND", "사람을 찾을 수 없어요.");
    if (!(await loveOwned(row.id, prow?.id ?? null)).cal) return fail(403, "LOCKED", "연애 달력을 먼저 열어 주세요.");
    const have = await getLoveCal(row.id, prow?.id ?? null);
    if (have) return NextResponse.json({ cal: have });
    const made = prow ? await generateCoupleCal(row.nickname, row.saju, prow.nickname, prow.saju) : await generateSoloCal(row.saju, row.nickname);
    return NextResponse.json({ cal: await saveLoveCal(row.id, prow?.id ?? null, made) });
  } catch (e) {
    notifyError("2027 연애 달력", e);
    return NextResponse.json({ error: { code: "AI_FAILED", message: "풀이를 쓰는 중에 문제가 생겼어요. 잠시 후 다시 눌러 주세요." } }, { status: 502 });
  }
}
