import { NextRequest, NextResponse } from "next/server";
import { loveOn } from "@/lib/love/loveProducts";
import { composeCouple, composeSolo } from "@/lib/love/love";
import { notifyError } from "@/server/alert";
import { NO_STORE, fail, resultOf } from "@/server/love/loveApi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 크리스마스 연애운 비회원 맛보기 (2026-11-09 유샘 지시서) - 로그인 없이, 엔진 문장만 (AI 없음).
 *   솔로 { kind:"solo", id }: 만세력(엔진 원본 saju) + "인연이 오는 길" 첫 부분, 나머지는 소제목만
 *   커플 { kind:"couple", aId, bId }: 끌림 한 줄만
 */
export async function POST(request: NextRequest) {
  if (!loveOn()) return fail(404, "NOT_FOUND", "준비 중이에요.");
  const body = (await request.json().catch(() => null)) as { kind?: unknown; id?: unknown; aId?: unknown; bId?: unknown } | null;
  try {
    if (body?.kind === "solo") {
      const r = resultOf(body.id);
      if (!r) return fail(404, "RESULT_NOT_FOUND", "입력한 지 오래되어 다시 넣어 주세요.");
      const s = composeSolo(r.saju, r.nickname);
      return NextResponse.json({ nickname: r.nickname, saju: r.saju, preview: s.preview, lockedHeadings: s.lockedHeadings }, { headers: NO_STORE });
    }
    if (body?.kind === "couple") {
      const a = resultOf(body.aId);
      const b = resultOf(body.bId);
      if (!a || !b) return fail(404, "RESULT_NOT_FOUND", "입력한 지 오래되어 다시 넣어 주세요.");
      const c = composeCouple(a.nickname, a.saju, b.nickname, b.saju);
      return NextResponse.json({ a: a.nickname, b: b.nickname, attraction: c.attraction, lockedHeadings: c.sections.map((x) => x.heading) }, { headers: NO_STORE });
    }
    return fail(400, "INVALID_INPUT", "잘못된 요청이에요.");
  } catch (e) {
    notifyError("크리스마스 연애운 맛보기", e);
    return fail(500, "SERVER_ERROR", "잠시 후 다시 시도해 주세요.");
  }
}
