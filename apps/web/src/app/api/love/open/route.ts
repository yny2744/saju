import { NextRequest, NextResponse } from "next/server";
import { loveOn } from "@/lib/love/loveProducts";
import { composeCouple, composeSolo } from "@/lib/love/love";
import { blockIfAuthOff } from "@/server/launchGuard";
import { notifyError } from "@/server/alert";
import { createPerson } from "@/server/readings/readings";
import { NO_STORE, fail, memberOf, resultOf } from "@/server/love/loveApi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 크리스마스 연애운 회원 풀이 (2026-11-09 유샘 지시서) - 무료, 엔진 문장만. 결제·엽전 없음.
 *   결과 토큰으로 사람(persons)을 만들어 두고(이미 있으면 그대로) 번호를 돌려준다 → 아래 상품 사다리(짧은 궁합·연애 달력·연인 궁합)가 이 번호로 산다.
 */
export async function POST(request: NextRequest) {
  if (!loveOn()) return fail(404, "NOT_FOUND", "준비 중이에요.");
  const blocked = blockIfAuthOff();
  if (blocked) return blocked;
  const body = (await request.json().catch(() => null)) as { kind?: unknown; id?: unknown; aId?: unknown; bId?: unknown } | null;
  try {
    const m = await memberOf(request);
    if ("error" in m) return m.error;
    const userId = m.user.id;
    if (body?.kind === "solo") {
      const r = resultOf(body.id);
      if (!r) return fail(404, "RESULT_NOT_FOUND", "입력한 지 오래되어 다시 넣어 주세요.");
      const personId = await createPerson({ userId, saju: r.saju, nickname: r.nickname });
      return NextResponse.json({ personId, sections: composeSolo(r.saju, r.nickname).sections }, { headers: NO_STORE });
    }
    if (body?.kind === "couple") {
      const a = resultOf(body.aId);
      const b = resultOf(body.bId);
      if (!a || !b) return fail(404, "RESULT_NOT_FOUND", "입력한 지 오래되어 다시 넣어 주세요.");
      const meId = await createPerson({ userId, saju: a.saju, nickname: a.nickname });
      const partnerId = await createPerson({ userId, saju: b.saju, nickname: b.nickname });
      const c = composeCouple(a.nickname, a.saju, b.nickname, b.saju);
      return NextResponse.json({ meId, partnerId, attraction: c.attraction, sections: c.sections }, { headers: NO_STORE });
    }
    return fail(400, "INVALID_INPUT", "잘못된 요청이에요.");
  } catch (e) {
    notifyError("크리스마스 연애운 회원 풀이", e);
    return fail(500, "SERVER_ERROR", "잠시 후 다시 시도해 주세요.");
  }
}
