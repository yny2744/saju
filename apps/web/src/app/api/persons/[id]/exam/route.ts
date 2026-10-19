import { NextRequest, NextResponse } from "next/server";
import { blockIfAuthOff } from "@/server/launchGuard";
import { isSuneungOn } from "@/lib/launchMode";
import { SESSION_COOKIE_NAME, getUserBySessionToken } from "@/server/auth/session";
import { notifyError } from "@/server/alert";
import { getPersonRow, getPersonSummary } from "@/server/readings/readings";
import { getBalance } from "@/server/yeopjeon/ledger";
import { getExamDeep } from "@/server/exam/exam";
import { composeExam, examSeason } from "@/lib/suneung";
import { PRICE } from "@/lib/yeopjeon";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 수능운 (수정안 17) - 가볍게 보기(엔진)·깊게 보기(AI) 상태.
 * 잠겨 있으면 D-day·요약·소제목만, 열렸으면 풀이 전체. 깊게 보기는 열렸는데 아직 안 썼으면 deep: null (화면이 /write를 부른다).
 */
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  if (!isSuneungOn()) return NextResponse.json({ error: { code: "NOT_FOUND", message: "준비 중이에요." } }, { status: 404 });
  const blocked = blockIfAuthOff();
  if (blocked) return blocked;
  try {
    const user = await getUserBySessionToken(request.cookies.get(SESSION_COOKIE_NAME)?.value);
    if (!user) return NextResponse.json({ error: { code: "LOGIN_REQUIRED", message: "로그인 후 이용할 수 있어요." } }, { status: 401 });
    const [row, summary] = await Promise.all([getPersonRow(user.id, params.id), getPersonSummary(user.id, params.id)]);
    if (!row || !summary) return NextResponse.json({ error: { code: "NOT_FOUND", message: "사람을 찾을 수 없어요." } }, { status: 404 });
    const reading = composeExam(row.saju, row.nickname);
    const owned = summary.exam;
    const open = owned.light || owned.deep;
    const deep = owned.deep ? await getExamDeep(row.id, examSeason()) : null;
    return NextResponse.json(
      {
        nickname: row.nickname,
        owned,
        price: PRICE.EXAM,
        deepPrice: PRICE.EXAM_DEEP,
        balance: await getBalance(user.id),
        reading: open
          ? reading
          : { ...reading, sections: reading.sections.map((s) => ({ heading: s.heading, body: "" })), kit: null, mind: "" },
        deep,
      },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (e) {
    notifyError("수능운", e);
    return NextResponse.json({ error: { code: "SERVER_ERROR", message: "잠시 후 다시 시도해 주세요." } }, { status: 500 });
  }
}
