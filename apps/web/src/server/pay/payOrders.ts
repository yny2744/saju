import { randomBytes } from "crypto";
import { SRC_COOKIE_NAME, validSource } from "@/lib/source";
import { db } from "@/server/auth/db";
import { getBalance, InsufficientYeopjeonError } from "@/server/yeopjeon/ledger";
import { PurchaseError, inTransaction, planForPerson, productName, purchaseWithClient, type PurchaseMode } from "@/server/readings/readings";
import { MockPaymentProvider, PortOnePaymentProvider, TossPaymentProvider, type PaymentProvider } from "@/server/paymentProvider";
import { createHmac, timingSafeEqual } from "crypto";
import { notifyError } from "@/server/alert";
import { splitPayment } from "@/lib/pay";
import { formatNyang } from "@/lib/yeopjeon";
import type { AnyTopicKey } from "@/lib/topics";
import { GiftError, getExamGift, giftWithClient } from "@/server/exam/gift";
import { PRICE } from "@/lib/yeopjeon";

/**
 * 카드·계좌이체 주문 (2026-10-10 수정안 31). 결제가 승인되는 순간 운세가 열린다.
 *
 *  1) checkout: 엽전으로 부족한 만큼 주문(pay_orders, pending)을 만든다 → 화면이 토스 결제창을 띄운다
 *  2) 손님이 결제 → 토스가 successUrl로 돌려보냄 → confirm: 토스에 승인 요청 → 승인되면 한 트랜잭션으로
 *     주문 paid + 결제 금액만큼 엽전 입금(kind 'pay') + 상품 구매(엽전 차감) → 바로 그 운세 화면으로
 *  3) 승인됐는데 그 사이 이미 열린 운세라 구매가 안 되면, 결제 금액은 엽전으로 남기고(status paid_credit) 알림 → 관리자가 환불 처리
 *
 * 환경변수 (2026-10-17 포트원 우선):
 *   포트원 V2 - PORTONE_STORE_ID(상점 아이디) · PORTONE_CHANNEL_KEY(채널 키, 테스트/실 채널) · PORTONE_API_SECRET(V2 API Secret)
 *              · PORTONE_WEBHOOK_SECRET(웹훅 시크릿, 선택 - 결제창을 닫아 버려도 웹훅으로 열어 준다)
 *   (예전) 토스 직접 - TOSS_CLIENT_KEY · PAYMENT_SECRET_KEY. 포트원 값이 있으면 포트원이 먼저다.
 * 시험용: PAYMENT_MOCK=true (운영 배포에서는 ALLOW_MOCK_IN_PRODUCTION=true 일 때만) - 실제 결제 없이 승인된 것처럼.
 */

export type PayMode = "portone" | "toss" | "mock" | "off";

export function payMode(env: NodeJS.ProcessEnv = process.env): PayMode {
  if (env.PAYMENT_MOCK === "true" && (env.NODE_ENV !== "production" || env.ALLOW_MOCK_IN_PRODUCTION === "true")) return "mock";
  if (env.PORTONE_STORE_ID && env.PORTONE_CHANNEL_KEY && env.PORTONE_API_SECRET) return "portone";
  if (env.TOSS_CLIENT_KEY && env.PAYMENT_SECRET_KEY) return "toss";
  return "off";
}

let mockProvider: MockPaymentProvider | null = null;
function provider(): PaymentProvider | null {
  const mode = payMode();
  if (mode === "mock") return (mockProvider ??= new MockPaymentProvider());
  if (mode === "portone") return new PortOnePaymentProvider(process.env.PORTONE_API_SECRET!, process.env.PORTONE_STORE_ID);
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
      /** 포트원 결제창 값 (공개돼도 되는 값) */
      portone: { storeId: string; channelKey: string } | null;
      customerKey: string;
      mock: boolean;
    };

/** 2026-10-28 유입 경로 꼬리표 (요청 쿠키에서 - 요청 밖(시험 등)이면 없음) */
async function requestSource(): Promise<string | null> {
  try {
    const { cookies } = await import("next/headers");
    return validSource(cookies().get(SRC_COOKIE_NAME)?.value);
  } catch {
    return null;
  }
}

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
  if (pm === "off") throw new PayError("PAY_NOT_READY", "결제를 준비하고 있어요. 곧 열려요.");
  const split = splitPayment(plan.price, balance);
  const orderId = newOrderId();
  const orderName = productName(mode, plan.topics);
  await pool.query(
    `INSERT INTO pay_orders (id, user_id, person_id, mode, topics, price, use_yeopjeon, amount, order_name, src)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [orderId, userId, personId, mode, JSON.stringify(plan.topics), plan.price, split.useYeopjeon, split.cash, orderName, await requestSource()]
  );
  return {
    status: "pay",
    orderId,
    orderName,
    price: plan.price,
    useYeopjeon: split.useYeopjeon,
    amount: split.cash,
    clientKey: pm === "toss" ? process.env.TOSS_CLIENT_KEY! : null,
    portone: pm === "portone" ? { storeId: process.env.PORTONE_STORE_ID!, channelKey: process.env.PORTONE_CHANNEL_KEY! } : null,
    customerKey: userId,
    mock: pm === "mock",
  };
}

/**
 * 2026-10-30 수능운 깊게 보기 부모님 선물: 결제하는 사람(부모)의 엽전이 모자랄 때 주문.
 * 주문의 person_id 는 수험생의 사람, gift_token 이 있으면 승인 뒤 purchase 대신 선물로 처리한다.
 */
export async function giftCheckout(payerId: string, token: string): Promise<CheckoutResult> {
  const g = await getExamGift(token, payerId);
  if (!g) throw new GiftError("NOT_FOUND", "선물 링크를 찾을 수 없어요.");
  if (g.owned) throw new GiftError("ALREADY_OWNED", "이미 깊게 보기가 열려 있어요.");
  const price = PRICE.EXAM_DEEP;
  const balance = await getBalance(payerId);
  if (balance >= price) return { status: "enough", price, balance };
  const pm = payMode();
  if (pm === "off") throw new PayError("PAY_NOT_READY", "결제를 준비하고 있어요. 곧 열려요.");
  const split = splitPayment(price, balance);
  const orderId = newOrderId();
  const orderName = `${g.title} 깊게 보기 선물`;
  const pool = await db();
  await pool.query(
    `INSERT INTO pay_orders (id, user_id, person_id, mode, topics, price, use_yeopjeon, amount, order_name, src, gift_token)
     VALUES ($1, $2, $3, 'exam_deep', '[]', $4, $5, $6, $7, $8, $9)`,
    [orderId, payerId, g.personId, price, split.useYeopjeon, split.cash, orderName, await requestSource(), token]
  );
  return {
    status: "pay",
    orderId,
    orderName,
    price,
    useYeopjeon: split.useYeopjeon,
    amount: split.cash,
    clientKey: pm === "toss" ? process.env.TOSS_CLIENT_KEY! : null,
    portone: pm === "portone" ? { storeId: process.env.PORTONE_STORE_ID!, channelKey: process.env.PORTONE_CHANNEL_KEY! } : null,
    customerKey: payerId,
    mock: pm === "mock",
  };
}

interface OrderRow {
  id: string;
  gift_token: string | null;
  user_id: string;
  person_id: string;
  mode: PurchaseMode;
  topics: AnyTopicKey[];
  price: number;
  amount: number;
  order_name: string;
  status: string;
}

function destination(o: Pick<OrderRow, "person_id" | "mode" | "topics" | "gift_token">): string {
  if (o.gift_token) return `/gift/exam/${o.gift_token}?paid=1`;
  if (o.mode === "face") return `/face/paid/${o.person_id}?paid=1`;
  if (o.mode === "couple") return `/couple/${o.person_id}?paid=1`;
  if (o.mode === "wallpaper") return `/person/${o.person_id}/wallpaper`;
  if (o.mode === "exam" || o.mode === "exam_deep") return `/person/${o.person_id}/exam?paid=1`;
  if (o.mode === "p_naming") return `/person/${o.person_id}/name?kind=naming&paid=1`;
  if (o.mode === "p_business" || o.mode === "p_corp" || o.mode === "p_brand") return `/person/${o.person_id}/business?kind=${o.mode.slice(2)}&paid=1`;
  const base = `/person/${o.person_id}`;
  if (o.mode === "naming" || o.mode === "rename") return `${base}/name?kind=${o.mode}&paid=1`;
  if (o.mode === "business" || o.mode === "corp" || o.mode === "brand") return `${base}/business?kind=${o.mode}&paid=1`;
  return o.mode === "basic" || o.mode === "deep" ? `${base}/${o.topics[0]}` : `${base}?paid=1`;
}

/** 결제 승인 → 엽전 입금 + 구매 (한 번만) → 갈 곳 */
export async function confirmOrder(userId: string | null, input: { paymentKey: unknown; orderId: unknown; amount: unknown }): Promise<{ redirect: string; credited?: boolean }> {
  const paymentKey = typeof input.paymentKey === "string" ? input.paymentKey.slice(0, 200) : "";
  const orderId = typeof input.orderId === "string" ? input.orderId : "";
  const amount = Number(input.amount);
  const pool = await db();
  // userId null = 포트원 웹훅 (서버끼리 - 결제사에 다시 물어 확인하므로 주문 주인을 따로 묻지 않는다)
  const r = await pool.query<OrderRow>(
    `SELECT id, user_id, person_id, mode, topics, price, amount, order_name, status, gift_token FROM pay_orders WHERE id = $1 AND ($2::uuid IS NULL OR user_id = $2::uuid)`,
    [orderId, userId]
  );
  const order = r.rows[0];
  if (!order) throw new PayError("NOT_FOUND", "주문을 찾을 수 없어요.");
  if (order.status === "paid" || order.status === "paid_credit") return { redirect: destination(order), credited: order.status === "paid_credit" };
  if (!paymentKey || amount !== order.amount) throw new PayError("AMOUNT_MISMATCH", "결제 금액이 주문과 달라요. 결제되지 않았어요.");

  const p = provider();
  if (!p) throw new PayError("PAY_NOT_READY", "결제를 준비하고 있어요.");
  const res = await p.confirmPayment({ paymentKey, orderId, amount });
  if (!res.approved || (res.approvedAmount !== undefined && res.approvedAmount !== order.amount)) {
    await pool.query(`UPDATE pay_orders SET status = 'failed' WHERE id = $1 AND status = 'pending'`, [orderId]);
    throw new PayError("NOT_APPROVED", res.failureReason ?? "결제가 승인되지 않았어요.");
  }

  // 승인됨 - 이제부터는 실패해도 돈이 엽전으로 남도록
  const uid = order.user_id;
  let credited = false;
  await inTransaction(async (client) => {
    const upd = await client.query(
      `UPDATE pay_orders SET status = 'paid', payment_key = $2, paid_at = now() WHERE id = $1 AND status IN ('pending', 'failed')`,
      [orderId, paymentKey]
    );
    if ((upd.rowCount ?? 0) === 0) return; // 동시에 두 번 - 먼저 처리된 쪽이 끝냄
    await client.query(
      `INSERT INTO bokchae_ledger (user_id, amount, kind, label, ref) VALUES ($1, $2, 'pay', $3, $4) ON CONFLICT (user_id, kind, ref) DO NOTHING`,
      [uid, order.amount, `결제 ${formatNyang(order.amount)} (${order.order_name})`, orderId]
    );
    await client.query("SAVEPOINT buy");
    try {
      if (order.gift_token) await giftWithClient(client, uid, order.gift_token);
      else await purchaseWithClient(client, { userId: uid, personId: order.person_id, mode: order.mode, topics: order.topics });
    } catch (e) {
      await client.query("ROLLBACK TO SAVEPOINT buy");
      if (!(e instanceof PurchaseError || e instanceof InsufficientYeopjeonError || e instanceof GiftError)) throw e;
      credited = true;
      await client.query(`UPDATE pay_orders SET status = 'paid_credit' WHERE id = $1`, [orderId]);
      notifyError("결제 후 구매 실패 - 결제 금액은 엽전으로 남김", e);
    }
  });
  return { redirect: destination(order), credited };
}

/**
 * 포트원 웹훅 (2026-10-17) - 손님이 결제 뒤 창을 닫아 돌아오지 못해도 서버끼리 확인해 바로 열어 준다.
 * 서명(Standard Webhooks: webhook-id · webhook-timestamp · webhook-signature, 시크릿 whsec_…)을 확인한 뒤
 * 결제사에 결제를 다시 조회해서(confirmOrder) 처리한다. 이미 처리된 주문이면 아무 일도 하지 않는다.
 */
export function verifyPortOneWebhook(
  headers: { id: string | null; timestamp: string | null; signature: string | null },
  body: string,
  secret: string,
  nowSec: number = Math.floor(Date.now() / 1000)
): boolean {
  const { id, timestamp, signature } = headers;
  if (!id || !timestamp || !signature || !secret) return false;
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(nowSec - ts) > 5 * 60) return false;
  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const expected = createHmac("sha256", key).update(`${id}.${timestamp}.${body}`).digest();
  return signature.split(" ").some((part) => {
    const sig = part.includes(",") ? part.split(",")[1] : part;
    const got = Buffer.from(sig ?? "", "base64");
    return got.length === expected.length && timingSafeEqual(got, expected);
  });
}

export async function confirmFromWebhook(payload: unknown): Promise<"done" | "ignored"> {
  const p = payload as { type?: unknown; data?: { paymentId?: unknown } } | null;
  const paymentId = typeof p?.data?.paymentId === "string" ? p.data.paymentId : "";
  if (p?.type !== "Transaction.Paid" || !paymentId.startsWith("ryg_")) return "ignored";
  const pool = await db();
  const r = await pool.query<{ amount: number }>(`SELECT amount FROM pay_orders WHERE id = $1`, [paymentId]);
  if (!r.rows[0]) return "ignored";
  await confirmOrder(null, { paymentKey: paymentId, orderId: paymentId, amount: r.rows[0].amount });
  return "done";
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
