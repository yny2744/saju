import { NextRequest, NextResponse } from "next/server";
import { LOVE_CAL, LOVE_PAIR, loveOn, lovePrice } from "@/lib/love/loveProducts";
import { composeCouple, coupleCalendar, soloCalendar } from "@/lib/love/love";
import { blockIfAuthOff } from "@/server/launchGuard";
import { notifyError } from "@/server/alert";
import { getPersonRow } from "@/server/readings/readings";
import { getLoveCal, loveOwned } from "@/server/love/love";
import { NO_STORE, fail, memberOf } from "@/server/love/loveApi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 짧은 궁합 · 2027 연애 달력 상태 (2026-11-09).
 *   ?partner=<상대 번호> 가 있으면 짧은 궁합(산 것만 풀이)과 커플 달력, 없으면 솔로 달력.
 *   달력은 엔진 판정(좋은 달·조심할 달)을 산 뒤에만 주고, 글(AI)이 아직 없으면 cal: null (화면이 /write 를 부른다).
 */
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
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
    const owned = await loveOwned(row.id, prow?.id ?? null);
    const pair = prow && owned.pair ? composeCouple(row.nickname, row.saju, prow.nickname, prow.saju) : null;
    const rows = owned.cal ? (prow ? coupleCalendar(row.saju, prow.saju) : soloCalendar(row.saju)) : null;
    return NextResponse.json(
      {
        nickname: row.nickname,
        partner: prow?.nickname ?? null,
        owned,
        prices: { pair: lovePrice(LOVE_PAIR), cal: lovePrice(LOVE_CAL) },
        pair,
        calRows: rows,
        cal: owned.cal ? await getLoveCal(row.id, prow?.id ?? null) : null,
      },
      { headers: NO_STORE }
    );
  } catch (e) {
    notifyError("짧은 궁합·연애 달력", e);
    return fail(500, "SERVER_ERROR", "잠시 후 다시 시도해 주세요.");
  }
}
