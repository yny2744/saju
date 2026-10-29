import { NextRequest, NextResponse } from "next/server";
import { isSuneungOn } from "@/lib/launchMode";
import { getResult } from "@/server/resultStore";
import { composeExam } from "@/lib/suneung";
import { buildPillarColumns } from "@/lib/pillarView";
import { elementShares } from "@/lib/manseView";
import { neededEnergy } from "@/lib/neededEnergy";
import { notifyError } from "@/server/alert";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 수능운 무료 미리보기 (2026-10-30 유샘) - 로그인 없이.
 *   /api/saju/analyze 로 받은 무료 결과 토큰(id)으로, 만세력 여덟 글자·오행 비율과
 *   수능운 한 줄 요약 · "마지막 한 칸은 ○○ 기운으로 채워요"(가장 모자란 오행 = 행운 꾸러미의 기운)만 돌려준다.
 *   풀이 본문·행운 꾸러미·마음 한 줄은 주지 않는다 (가입 선물 990냥으로 여는 가볍게 보기에서).
 */
export async function POST(request: NextRequest) {
  if (!isSuneungOn()) return NextResponse.json({ error: { code: "NOT_FOUND", message: "준비 중이에요." } }, { status: 404 });
  const body = (await request.json().catch(() => null)) as { id?: unknown } | null;
  const id = typeof body?.id === "string" ? body.id : "";
  if (!id) return NextResponse.json({ error: { code: "INVALID_INPUT", message: "잘못된 요청이에요." } }, { status: 400 });
  try {
    const result = getResult(id);
    if (!result) {
      return NextResponse.json({ error: { code: "RESULT_NOT_FOUND", message: "입력한 지 오래되어 다시 넣어 주세요." } }, { status: 404 });
    }
    const r = composeExam(result.saju, result.nickname);
    const need = neededEnergy(result.saju);
    return NextResponse.json(
      {
        nickname: result.nickname,
        season: r.season,
        title: r.title,
        dday: r.dday,
        summary: r.summary,
        fill: { element: r.kit.element, hanja: r.kit.hanja, nature: r.kit.nature, reason: need.reason },
        headings: r.sections.map((s) => s.heading),
        pillars: buildPillarColumns(result.saju).map((c) => ({
          label: c.label,
          empty: c.empty,
          stem: c.stem ? { hanja: c.stem.hanja, hangul: c.stem.hangul, element: c.stem.element } : null,
          branch: c.branch ? { hanja: c.branch.hanja, hangul: c.branch.hangul, element: c.branch.element } : null,
        })),
        shares: elementShares(result.saju),
      },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (e) {
    notifyError("수능운 미리보기", e);
    return NextResponse.json({ error: { code: "SERVER_ERROR", message: "잠시 후 다시 시도해 주세요." } }, { status: 500 });
  }
}
