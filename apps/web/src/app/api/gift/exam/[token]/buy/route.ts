import { NextRequest } from "next/server";
import { memberRoute } from "@/server/routeHelpers";
import { getUserBySessionToken } from "@/server/auth/session";
import { GiftError, giftExamDeep } from "@/server/exam/gift";
import { InsufficientYeopjeonError } from "@/server/yeopjeon/ledger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 부모님: 가진 엽전으로 바로 선물 (모자라면 INSUFFICIENT_YEOPJEON → 화면이 결제 창을 띄운다) */
export async function POST(request: NextRequest, { params }: { params: { token: string } }) {
  return memberRoute(request, "수능대박운 선물", async (token) => {
    const user = await getUserBySessionToken(token);
    if (!user) return { status: 401, body: { error: { code: "LOGIN_REQUIRED", message: "로그인 후 이용할 수 있어요." } } };
    if (!user.termsAgreed) return { status: 403, body: { error: { code: "CONSENT_REQUIRED", message: "약관 동의 후 이용할 수 있어요." } } };
    try {
      await giftExamDeep(user.id, params.token);
      return { status: 200, body: { done: true } };
    } catch (e) {
      if (e instanceof InsufficientYeopjeonError) return { status: 402, body: { error: { code: "INSUFFICIENT_YEOPJEON", message: "엽전이 모자라요." } } };
      if (e instanceof GiftError) return { status: e.code === "NOT_FOUND" ? 404 : 409, body: { error: { code: e.code, message: e.message } } };
      throw e;
    }
  });
}
