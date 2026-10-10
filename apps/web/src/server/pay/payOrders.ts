import { randomBytes } from "crypto";
import { db } from "@/server/auth/db";
import { getBalance, InsufficientYeopjeonError } from "@/server/yeopjeon/ledger";
import { PurchaseError, inTransaction, planForPerson, productName, purchaseWithClient, type PurchaseMode } from "@/server/readings/readings";
import { MockPaymentProvider, TossPaymentProvider, type PaymentProvider } from "@/server/paymentProvider";
import { notifyError } from "@/server/alert";
import { splitPayment } from "@/lib/pay";
import { formatNyang } from "@/lib/yeopjeon";
import type { AnyTopicKey } from "@/lib/topics";

/**
 * 카드·간편결제 주문 (2026-10-10 수정안 31). 결제가 승인되는 순간 운세가 열린다.
 *
 *  1) checkout: 엽전으로 부족한 만큼 주문(pay_orders, pending)을 만든다 → 화면이 토스 결제창을 띄운다
 *  2) 손님이 결제 → 토스가 successUrl로 돌려보냄 → confirm: 토스에 승인 요청 → 승인되면 한 트랜잭션으로
 *     주문 paid + 결제 금액만큼 엽전 입금(kind 'pay') + 상품 구매(엽전 차감) → 바로 그 운세 화면으로
 *  3) 승인됐는데 그 사이 이미 열린 운세라 구매가 안 되면, 결제 금액은 엽전으로 남기고(status paid_credit) 알림 → 관리자가 환불 처리
 *
 * 환경변수: TOSS_CLIENT_KEY(결제창용, 공개돼도 되는 키), PAYMENT_SECRET_KEY(승인용 비밀 키) - 둘 다 있어야 결제가 켜진다.
 * 시험용: PAYMENT_MOCK=true (운영 배포에서는 ALLOW_MOCK_IN_PRODUCTION=true 일 때만) - 실제 결제 없이 승인된 것처럼.
 */

export type PayMode = "toss" | "mock" | "off";

export function payMode(env: NodeJS.ProcessEnv = process.env): PayMode {
  if (env.PAYMENT_MOCK === "true" && (env.NODE_ENV !== "production" || env.ALLOW_MOCK_IN_PRODUCTION === "true")) return "mock";
  if (env.TOSS_CLIENT_KEY && env.PAYMENT_SECRET_KEY) return "toss";
  return "off";
}

let mockProvider: MockPaymentProvider | null = null;
function provider(): PaymentProvider | null {
  const mode = payMode();
  if (mode === "mock") return (mockProvider ??= new MockPaymentProvider());
  if (mode === "toss") return new TossPaymentProvider(process.env.PAYMENT_SECRET_KEY!);
  return null;
}

export class PayError extends Error {
  constructor(readonly code: "PAY_NOT_READY" | "NOT_FOUND" | "AMOUNT_MISMATCH" | "NOT_APPROVED", message: string) {
    super(message);
    this.name = "PayError";
  }
}

export type CheckoutResult =
  | { status: "enough"; price: number; balance: number }
  | {
      status: "pay";
      orderId: string;
      orderName: string;
      price: number;
      useYeopjeon: number;
      amount: number;
      clientKey: string | null;
      customerKey: string;
      mock: boolean;
    };

function newOrderId(): string {
  return `ryg_${Date.now().toString(36)}_${randomBytes(8).toString("hex")}`;
}

/** 구매 전 계산: 엽전이 충분하면 enough, 모자라면 주문을 만든다 */
export async function checkout(userId: string, personId: string, mode: PurchaseMode, topics: unknown): Promise<CheckoutResult> {
  const pool = await db();
  const plan = await planForPerson(pool, { userId, personId, mode, topics });
  const balance = await getBalance(userId);
  if (balance >= plan.price) return { status: "enough", price: plan.price, balance };
  const pm = payMode();
  if (pm === "off") throw new PayError("PAY_NOT_READY", "카드·간편결제를 준비하고 있어요. 곧 열려요.");
  const split = splitPayment(plan.price, balance);
  const orderId = newOrderId();
  const orderName = productName(mode, plan.topics);
  await pool.query(
    `INSERT INTO pay_orders (id, user_id, person_id, mode, topics, price, use_yeopjeon, amount, order_name)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [orderId, userId, personId, mode, JSON.stringify(plan.topics), plan.price, split.useYeopjeon, split.cash, orderName]
  );
  return {
    status: "pay",
    orderId,
    orderName,
    price: plan.price,
    useYeopjeon: split.useYeopjeon,
    amount: split.cash,
    clientKey: pm === "toss" ? process.env.TOSS_CLIENT_KEY! : null,
    customerKey: userId,
    mock: pm === "mock",
  };
}

interface OrderRow {
  id: string;
  user_id: string;
  person_id: string;
  mode: PurchaseMode;
  topics: AnyTopicKey[];
  price: number;
  amount: number;
  order_name: string;
  status: string;
}

function destination(o: Pick<OrderRow, "person_id" | "mode" | "topics">): string {
  const base = `/person/${o.person_id}`;
  return o.mode === "basic" || o.mode === "deep" ? `${base}/${o.topics[0]}` : `${base}?paid=1`;
}

/** 결제 승인 → 엽전 입금 + 구매 (한 번만) → 갈 곳 */
export async function confirmOrder(userId: string, input: { paymentKey: unknown; orderId: unknown; amount: unknown }): Promise<{ redirect: string; credited?: boolean }> {
  const paymentKey = typeof input.paymentKey === "string" ? input.paymentKey.slice(0, 200) : "";
  const orderId = typeof input.orderId === "string" ? input.orderId : "";
  const amount = Number(input.amount);
  const pool = await db();
  const r = await pool.query<OrderRow>(
    `SELECT id, user_id, person_id, mode, topics, price, amount, order_name, status FROM pay_orders WHERE id = $1 AND user_id = $2`,
    [orderId, userId]
  );
  const order = r.rows[0];
  if (!order) throw new PayError("NOT_FOUND", "주문을 찾을 수 없어요.");
  if (order.status === "paid" || order.status === "paid_credit") return { redirect: destination(order), credited: order.status === "paid_credit" };
  if (!paymentKey || amount !== order.amount) throw new PayError("AMOUNT_MISMATCH", "결제 금액이 주문과 달라요. 결제되지 않았어요.");

  const p = provider();
  if (!p) throw new PayError("PAY_NOT_READY", "카드·간편결제를 준비하고 있어요.");
  const res = await p.confirmPayment({ paymentKey, orderId, amount });
  if (!res.approved || (res.approvedAmount !== undefined && res.approvedAmount !== order.amount)) {
    await pool.query(`UPDATE pay_orders SET status = 'failed' WHERE id = $1 AND status = 'pending'`, [orderId]);
    throw new PayError("NOT_APPROVED", res.failureReason ?? "결제가 승인되지 않았어요.");
  }

  // 승인됨 - 이제부터는 실패해도 돈이 엽전으로 남도록
  let credited = false;
  await inTransaction(async (client) => {
    const upd = await client.query(
      `UPDATE pay_orders SET status = 'paid', payment_key = $2, paid_at = now() WHERE id = $1 AND status IN ('pending', 'failed')`,
      [orderId, paymentKey]
    );
    if ((upd.rowCount ?? 0) === 0) return; // 동시에 두 번 - 먼저 처리된 쪽이 끝냄
    await client.query(
      `INSERT INTO bokchae_ledger (user_id, amount, kind, label, ref) VALUES ($1, $2, 'pay', $3, $4) ON CONFLICT (user_id, kind, ref) DO NOTHING`,
      [userId, order.amount, `카드·간편결제 ${formatNyang(order.amount)} (${order.order_name})`, orderId]
    );
    await client.query("SAVEPOINT buy");
    try {
      await purchaseWithClient(client, { userId, personId: order.person_id, mode: order.mode, topics: order.topics });
    } catch (e) {
      await client.query("ROLLBACK TO SAVEPOINT buy");
      if (!(e instanceof PurchaseError || e instanceof InsufficientYeopjeonError)) throw e;
      credited = true;
      await client.query(`UPDATE pay_orders SET status = 'paid_credit' WHERE id = $1`, [orderId]);
      notifyError("결제 후 구매 실패 - 결제 금액은 엽전으로 남김", e);
    }
  });
  return { redirect: destination(order), credited };
}

export interface AdminPayOrder {
  id: string;
  nickname: string;
  orderName: string;
  price: number;
  useYeopjeon: number;
  amount: number;
  status: string;
  createdAt: string;
  paidAt: string | null;
}

export async function recentPayOrders(): Promise<AdminPayOrder[]> {
  const pool = await db();
  const r = await pool.query<{
    id: string;
    nickname: string;
    order_name: string;
    price: number;
    use_yeopjeon: number;
    amount: number;
    status: string;
    created_at: Date;
    paid_at: Date | null;
  }>(
    `SELECT o.id, u.nickname, o.order_name, o.price, o.use_yeopjeon, o.amount, o.status, o.created_at, o.paid_at
       FROM pay_orders o JOIN users u ON u.id = o.user_id
      WHERE o.status <> 'pending' OR o.created_at > now() - interval '1 day'
      ORDER BY o.created_at DESC LIMIT 50`
  );
  return r.rows.map((x) => ({
    id: x.id,
    nickname: x.nickname,
    orderName: x.order_name,
    price: x.price,
    useYeopjeon: x.use_yeopjeon,
    amount: x.amount,
    status: x.status,
    createdAt: x.created_at.toISOString(),
    paidAt: x.paid_at ? x.paid_at.toISOString() : null,
  }));
}
