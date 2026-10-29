import { NextRequest } from "next/server";
import { memberRoute } from "@/server/routeHelpers";
import { getUserBySessionToken } from "@/server/auth/session";
import { GiftError } from "@/server/exam/gift";
import { PayError, giftCheckout } from "@/server/pay/payOrders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 부모님: 엽전이 모자랄 때 선물 결제 주문 만들기 (PayDialog 가 부른다) */
export async function POST(request: NextRequest, { params }: { params: { token: string } }) {
  return memberRoute(request, "수능운 선물 주문", async (token) => {
    const user = await getUserBySessionToken(token);
    if (!user) return { status: 401, body: { error: { code: "LOGIN_REQUIRED", message: "로그인 후 이용할 수 있어요." } } };
    if (!user.termsAgreed) return { status: 403, body: { error: { code: "CONSENT_REQUIRED", message: "약관 동의 후 이용할 수 있어요." } } };
    try {
      return { status: 200, body: await giftCheckout(user.id, params.token) };
    } catch (e) {
      if (e instanceof GiftError) return { status: e.code === "NOT_FOUND" ? 404 : 409, body: { error: { code: e.code, message: e.message } } };
      if (e instanceof PayError) return { status: 503, body: { error: { code: e.code, message: e.message } } };
      throw e;
    }
  });
}
