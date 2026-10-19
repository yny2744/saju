import { NextRequest, NextResponse } from "next/server";
import { blockIfAuthOff } from "@/server/launchGuard";
import { isSuneungOn } from "@/lib/launchMode";
import { SESSION_COOKIE_NAME, getUserBySessionToken } from "@/server/auth/session";
import { notifyError } from "@/server/alert";
import { getPersonRow, getPersonSummary } from "@/server/readings/readings";
import { generateExamDeep, getExamDeep, saveExamDeep } from "@/server/exam/exam";
import { examSeason } from "@/lib/suneung";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** 수능운 깊게 보기 쓰기 (산 사람만, 한 번 쓰면 저장한 것을 돌려준다) */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  if (!isSuneungOn()) return NextResponse.json({ error: { code: "NOT_FOUND", message: "준비 중이에요." } }, { status: 404 });
  const blocked = blockIfAuthOff();
  if (blocked) return blocked;
  try {
    const user = await getUserBySessionToken(request.cookies.get(SESSION_COOKIE_NAME)?.value);
    if (!user) return NextResponse.json({ error: { code: "LOGIN_REQUIRED", message: "로그인 후 이용할 수 있어요." } }, { status: 401 });
    const [row, summary] = await Promise.all([getPersonRow(user.id, params.id), getPersonSummary(user.id, params.id)]);
    if (!row || !summary) return NextResponse.json({ error: { code: "NOT_FOUND", message: "사람을 찾을 수 없어요." } }, { status: 404 });
    if (!summary.exam.deep) return NextResponse.json({ error: { code: "LOCKED", message: "깊게 보기를 먼저 열어 주세요." } }, { status: 403 });
    const have = await getExamDeep(row.id, examSeason());
    if (have) return NextResponse.json({ deep: have });
    const deep = await saveExamDeep(row.id, await generateExamDeep(row.saju, row.nickname));
    return NextResponse.json({ deep });
  } catch (e) {
    notifyError("수능운 깊게 보기", e);
    return NextResponse.json({ error: { code: "AI_FAILED", message: "풀이를 쓰는 중에 문제가 생겼어요. 잠시 후 다시 눌러 주세요. 엽전은 그대로예요." } }, { status: 502 });
  }
}
