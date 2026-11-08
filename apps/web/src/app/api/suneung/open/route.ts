import { NextRequest, NextResponse } from "next/server";
import { isSuneungOn } from "@/lib/launchMode";
import { blockIfAuthOff } from "@/server/launchGuard";
import { SESSION_COOKIE_NAME, getUserBySessionToken } from "@/server/auth/session";
import { getResult } from "@/server/resultStore";
import { notifyError } from "@/server/alert";
import { PurchaseError, createPerson, getPersonSummary, purchaseTopics } from "@/server/readings/readings";
import { InsufficientYeopjeonError } from "@/server/yeopjeon/ledger";
import { composeExam } from "@/lib/suneung";
import { PRICE } from "@/lib/yeopjeon";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 수능대박운 끝까지 열기 (2026-11-09 유샘: 회원은 맛보기 없이 처음부터 끝까지, 비회원은 카카오 로그인 뒤 같은 결과가 바로 끝까지).
 *   무료 결과 토큰(id)으로 사람을 만들고, 가볍게 보기를 지금처럼 가입 선물 엽전으로 연 뒤(이미 열었으면 그대로) 전체 풀이를 돌려준다.
 *   엽전이 모자라면(선물을 이미 쓴 회원) 열지 않고 status "pay" - 화면은 가격을 보여 주고 수능대박운 화면(결제창)으로 보낸다.
 */
export async function POST(request: NextRequest) {
  if (!isSuneungOn()) return NextResponse.json({ error: { code: "NOT_FOUND", message: "준비 중이에요." } }, { status: 404 });
  const blocked = blockIfAuthOff();
  if (blocked) return blocked;
  const body = (await request.json().catch(() => null)) as { id?: unknown } | null;
  const id = typeof body?.id === "string" ? body.id : "";
  if (!id) return NextResponse.json({ error: { code: "INVALID_INPUT", message: "잘못된 요청이에요." } }, { status: 400 });
  try {
    const user = await getUserBySessionToken(request.cookies.get(SESSION_COOKIE_NAME)?.value);
    if (!user) return NextResponse.json({ error: { code: "LOGIN_REQUIRED", message: "로그인 후 이용할 수 있어요." } }, { status: 401 });
    if (!user.termsAgreed) return NextResponse.json({ error: { code: "CONSENT_REQUIRED", message: "약관 동의 후 이용할 수 있어요." } }, { status: 403 });
    const result = getResult(id);
    if (!result) return NextResponse.json({ error: { code: "RESULT_NOT_FOUND", message: "입력한 지 오래되어 다시 넣어 주세요." } }, { status: 404 });
    const personId = await createPerson({ userId: user.id, saju: result.saju, nickname: result.nickname, hanjaName: result.hanjaName, focus: result.focus });
    const summary = await getPersonSummary(user.id, personId);
    if (!summary?.exam.light && !summary?.exam.deep) {
      try {
        await purchaseTopics({ userId: user.id, personId, mode: "exam", topics: [] });
      } catch (e) {
        if (e instanceof InsufficientYeopjeonError) return NextResponse.json({ status: "pay", personId, price: PRICE.EXAM }, { headers: { "Cache-Control": "private, no-store" } });
        if (!(e instanceof PurchaseError && e.code === "ALREADY_OWNED")) throw e;
      }
    }
    return NextResponse.json({ status: "open", personId, reading: composeExam(result.saju, result.nickname) }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (e) {
    notifyError("수능대박운 끝까지 열기", e);
    return NextResponse.json({ error: { code: "SERVER_ERROR", message: "잠시 후 다시 시도해 주세요." } }, { status: 500 });
  }
}
