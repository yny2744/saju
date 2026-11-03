import { NextRequest, NextResponse } from "next/server";
import { getResult } from "@/server/resultStore";
import { notifyError } from "@/server/alert";
import { nyOn } from "@/lib/newyear2027";
import { composeNyTotal, nyPreview, withNyYear } from "@/server/newyear/newyear";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 2027 신년운 무료 맛보기 (2026-11-03 유샘 지시서) - 로그인 없이.
 *   /api/saju/analyze 로 받은 무료 결과 토큰(id)으로 만세력(엔진 원본 saju)과 2027 총운 맛보기(엔진 문장, AI 없음)를 함께 돌려준다.
 */
export async function POST(request: NextRequest) {
  if (!nyOn()) return NextResponse.json({ error: { code: "NOT_FOUND", message: "준비 중이에요." } }, { status: 404 });
  const body = (await request.json().catch(() => null)) as { id?: unknown } | null;
  const id = typeof body?.id === "string" ? body.id : "";
  if (!id) return NextResponse.json({ error: { code: "INVALID_INPUT", message: "잘못된 요청이에요." } }, { status: 400 });
  try {
    const result = getResult(id);
    if (!result) return NextResponse.json({ error: { code: "RESULT_NOT_FOUND", message: "입력한 지 오래되어 다시 넣어 주세요." } }, { status: 404 });
    return NextResponse.json(
      {
        nickname: result.nickname,
        saju: result.saju,
        // 만세력 대운 띠에 2027년 세운을 함께 보여 준다 (엔진 계산 그대로)
        seun: (() => {
          const s = withNyYear(result.saju).seun;
          return { year: s.year, stem: s.pillar.stem, branch: s.pillar.branch, tenGod: s.tenGod };
        })(),
        preview: nyPreview(composeNyTotal(result.saju, result.nickname)),
      },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (e) {
    notifyError("2027 신년운 맛보기", e);
    return NextResponse.json({ error: { code: "SERVER_ERROR", message: "잠시 후 다시 시도해 주세요." } }, { status: 500 });
  }
}
