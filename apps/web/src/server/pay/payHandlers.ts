import { isOnSale, SALE_CLOSED_MESSAGE } from "@/lib/sale";
import { getUserBySessionToken } from "@/server/auth/session";
import { PurchaseError, isPurchaseMode } from "@/server/readings/readings";
import { PayError, checkout, confirmOrder, markOrderOpened } from "./payOrders";
import { myPayOrders, requestRefund, adminRefund } from "./refund";
import { requireAdmin } from "@/server/admin/admin";

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
  if (!isPurchaseMode(mode)) return err(400, "INVALID_INPUT", "상품 종류가 올바르지 않아요.");
  if (!isOnSale(mode)) return err(403, "SALE_CLOSED", SALE_CLOSED_MESSAGE);
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

/** 2026-11-12 유샘: 결제 완료 화면에서 [지금 풀이 열기]를 누른 시각을 남긴다 (처음 한 번만, 본인 주문만) */
export async function handleOpened(token: string | undefined, raw: unknown): Promise<Out> {
  const m = await member(token);
  if ("error" in m) return m.error!;
  const b = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  if (typeof b.orderId !== "string" || !b.orderId) return err(400, "INVALID_INPUT", "주문 번호가 없어요.");
  await markOrderOpened(m.user.id, b.orderId);
  return { status: 200, body: { ok: true } };
}

/** 2026-11-13 유샘: 내 결제 내역 (마이페이지) */
export async function handleMyOrders(token: string | undefined): Promise<Out> {
  const m = await member(token);
  if ("error" in m) return m.error!;
  return { status: 200, body: { orders: await myPayOrders(m.user.id) } };
}

/** 2026-11-13 유샘: 손님 환불 신청 */
export async function handleRefundRequest(token: string | undefined, raw: unknown): Promise<Out> {
  const m = await member(token);
  if ("error" in m) return m.error!;
  const b = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  if (typeof b.orderId !== "string" || !b.orderId) return err(400, "INVALID_INPUT", "주문 번호가 없어요.");
  const r = await requestRefund(m.user.id, b.orderId, typeof b.reason === "string" ? b.reason : "");
  if (!r) return err(404, "NOT_FOUND", "환불할 수 있는 결제를 찾지 못했어요.");
  return { status: 200, body: r };
}

/** 2026-11-13 유샘: 관리자 [환불 처리] - 포트원 결제 취소 + 기록 변경 */
export async function handleAdminRefund(token: string | undefined, raw: unknown): Promise<Out> {
  const a = await requireAdmin(token);
  if (!a.ok) return a;
  const b = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  if (typeof b.orderId !== "string" || !b.orderId) return err(400, "INVALID_INPUT", "주문 번호가 없어요.");
  const r = await adminRefund(b.orderId, typeof b.reason === "string" ? b.reason : "");
  return { status: r.ok ? 200 : 400, body: r.ok ? r : { error: { code: "REFUND_FAILED", message: r.message } } };
}
