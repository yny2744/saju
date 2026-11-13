import { NextRequest, NextResponse } from "next/server";
import { blockIfAuthOff } from "@/server/launchGuard";
import { isSuneungOn } from "@/lib/launchMode";
import { SESSION_COOKIE_NAME, getUserBySessionToken } from "@/server/auth/session";
import { notifyError } from "@/server/alert";
import { getPersonRow, getPersonSummary } from "@/server/readings/readings";
import { getBalance } from "@/server/yeopjeon/ledger";
import { generateExamExtra, getExamExtra, saveExamExtra } from "@/server/exam/examExtra";
import { examSeason, isExamExtraKind, type ExamExtraKind } from "@/lib/suneung";
import { PRICE } from "@/lib/yeopjeon";
import { isOnSale } from "@/lib/sale";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120; // 2026-11-13: 수능 심층분석은 한 번에 30초쯤 - 실패하면 한 번 더 쓸 시간

/**
 * 수능 심층분석 2~4 · 네 가지 모두 보기 (2026-11-13 유샘 승인)
 *   GET ?kind=goal|focus|calm|all  상태 (산 것, 가격, 써 둔 풀이)
 *   POST {kind}                    산 사람만, 아직 안 썼으면 쓴다 (한 번 쓰면 저장한 것을 돌려준다)
 */
async function load(request: NextRequest, id: string) {
  if (!isSuneungOn()) return { error: NextResponse.json({ error: { code: "NOT_FOUND", message: "준비 중이에요." } }, { status: 404 }) };
  const blocked = blockIfAuthOff();
  if (blocked) return { error: blocked };
  const user = await getUserBySessionToken(request.cookies.get(SESSION_COOKIE_NAME)?.value);
  if (!user) return { error: NextResponse.json({ error: { code: "LOGIN_REQUIRED", message: "로그인 후 이용할 수 있어요." } }, { status: 401 }) };
  const [row, summary] = await Promise.all([getPersonRow(user.id, id), getPersonSummary(user.id, id)]);
  if (!row || !summary) return { error: NextResponse.json({ error: { code: "NOT_FOUND", message: "사람을 찾을 수 없어요." } }, { status: 404 }) };
  return { user, row, summary };
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const l = await load(request, params.id);
    if ("error" in l) return l.error;
    const kind = request.nextUrl.searchParams.get("kind") ?? "";
    if (kind !== "all" && !isExamExtraKind(kind)) return NextResponse.json({ error: { code: "NOT_FOUND", message: "없는 상품이에요." } }, { status: 404 });
    const e = l.summary.exam;
    const owned = { deep: e.deep, goal: e.goal, focus: e.focus, calm: e.calm };
    const reading = kind !== "all" && owned[kind as ExamExtraKind] ? await getExamExtra(l.row.id, examSeason(), kind as ExamExtraKind) : null;
    return NextResponse.json(
      {
        nickname: l.row.nickname,
        owned,
        price: PRICE.EXAM_EXTRA ?? null,
        allPrice: PRICE.EXAM_ALL ?? null,
        onSale: kind === "all" ? isOnSale("exam_all") && !!PRICE.EXAM_ALL : isOnSale(`exam_${kind}`) && !!PRICE.EXAM_EXTRA,
        balance: await getBalance(l.user.id),
        reading,
      },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (e) {
    notifyError("수능 심층분석 2~4", e);
    return NextResponse.json({ error: { code: "SERVER_ERROR", message: "잠시 후 다시 시도해 주세요." } }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const l = await load(request, params.id);
    if ("error" in l) return l.error;
    const kind = ((await request.json().catch(() => null)) as { kind?: unknown } | null)?.kind;
    if (!isExamExtraKind(kind)) return NextResponse.json({ error: { code: "INVALID_INPUT", message: "없는 상품이에요." } }, { status: 400 });
    if (!l.summary.exam[kind]) return NextResponse.json({ error: { code: "LOCKED", message: "먼저 열어 주세요." } }, { status: 403 });
    const have = await getExamExtra(l.row.id, examSeason(), kind);
    if (have) return NextResponse.json({ reading: have });
    const reading = await saveExamExtra(l.row.id, kind, await generateExamExtra(l.row.saju, l.row.nickname, kind));
    return NextResponse.json({ reading });
  } catch (e) {
    notifyError("수능 심층분석 2~4 쓰기", e);
    return NextResponse.json({ error: { code: "AI_FAILED", message: "풀이를 쓰는 중에 문제가 생겼어요. 잠시 후 [다시 쓰기]를 눌러 주세요. 결제는 그대로 남아 있어요.", reason: (e instanceof Error ? e.message : String(e)).slice(0, 160) } }, { status: 502 });
  }
}
