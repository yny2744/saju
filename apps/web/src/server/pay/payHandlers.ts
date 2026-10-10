import { getUserBySessionToken } from "@/server/auth/session";
import { PurchaseError } from "@/server/readings/readings";
import { PayError, checkout, confirmOrder } from "./payOrders";

type Out = { status: number; body: unknown };
const err = (status: number, code: string, message: string): Out => ({ status, body: { error: { code, message } } });

async function member(token: string | undefined) {
  const user = await getUserBySessionToken(token);
  if (!user) return { error: err(401, "LOGIN_REQUIRED", "로그인 후 이용할 수 있어요.") } as const;
  if (!user.termsAgreed) return { error: err(403, "CONSENT_REQUIRED", "약관 동의 후 이용할 수 있어요.") } as const;
  return { user } as const;
}

/** 결제 창 열기 전: 엽전이 충분한지, 모자라면 얼마를 결제할지 (주문 만들기) */
export async function handleCheckout(token: string | undefined, personId: string, raw: unknown): Promise<Out> {
  const m = await member(token);
  if ("error" in m) return m.error!;
  const b = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  const mode = b.mode;
  if (mode !== "basic" && mode !== "deep" && mode !== "bundle3" && mode !== "bundle12") return err(400, "INVALID_INPUT", "상품 종류가 올바르지 않아요.");
  try {
    return { status: 200, body: await checkout(m.user.id, personId, mode, b.topics) };
  } catch (e) {
    if (e instanceof PurchaseError) return err(e.code === "NOT_FOUND" ? 404 : 400, e.code, e.message);
    if (e instanceof PayError) return err(503, e.code, e.message);
    throw e;
  }
}

/** 결제 승인 (토스가 successUrl로 돌려보낸 뒤 화면이 부른다) */
export async function handleConfirm(token: string | undefined, raw: unknown): Promise<Out> {
  const m = await member(token);
  if ("error" in m) return m.error!;
  const b = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  try {
    return { status: 200, body: await confirmOrder(m.user.id, { paymentKey: b.paymentKey, orderId: b.orderId, amount: b.amount }) };
  } catch (e) {
    if (e instanceof PayError) return err(e.code === "NOT_FOUND" ? 404 : 400, e.code, e.message);
    throw e;
  }
}
