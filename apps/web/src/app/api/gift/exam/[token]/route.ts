import { NextRequest, NextResponse } from "next/server";
import { blockIfAuthOff } from "@/server/launchGuard";
import { isSuneungOn } from "@/lib/launchMode";
import { SESSION_COOKIE_NAME, getUserBySessionToken } from "@/server/auth/session";
import { notifyError } from "@/server/alert";
import { getExamGift } from "@/server/exam/gift";
import { getBalance } from "@/server/yeopjeon/ledger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 부모님: 선물 링크 내용 (로그인 없이도 이름·상품까지, 로그인했으면 내 엽전도) */
export async function GET(request: NextRequest, { params }: { params: { token: string } }) {
  if (!isSuneungOn()) return NextResponse.json({ error: { code: "NOT_FOUND", message: "준비 중이에요." } }, { status: 404 });
  const blocked = blockIfAuthOff();
  if (blocked) return blocked;
  try {
    const user = await getUserBySessionToken(request.cookies.get(SESSION_COOKIE_NAME)?.value);
    const g = await getExamGift(params.token, user?.id ?? null);
    if (!g) return NextResponse.json({ error: { code: "NOT_FOUND", message: "선물 링크를 찾을 수 없어요." } }, { status: 404 });
    return NextResponse.json(
      {
        nickname: g.nickname,
        title: g.title,
        points: g.points,
        price: g.price,
        owned: g.owned,
        paidByMe: g.paidByMe,
        isChild: !!user && user.id === g.childUserId,
        me: user ? { termsAgreed: user.termsAgreed, balance: await getBalance(user.id) } : null,
        personId: g.personId,
      },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (e) {
    notifyError("수능대박운 선물 보기", e);
    return NextResponse.json({ error: { code: "SERVER_ERROR", message: "잠시 후 다시 시도해 주세요." } }, { status: 500 });
  }
}
