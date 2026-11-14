import { randomBytes } from "crypto";
import { SRC_COOKIE_NAME, SRC_COOKIE_ON, validSource } from "@/lib/source";
import { db } from "@/server/auth/db";
import { getBalance, InsufficientYeopjeonError } from "@/server/yeopjeon/ledger";
import { PurchaseError, inTransaction, planForPerson, productName, purchaseWithClient, type PurchaseMode } from "@/server/readings/readings";
import { MockPaymentProvider, PortOnePaymentProvider, TossPaymentProvider, type PaymentProvider } from "@/server/paymentProvider";
import { createHmac, timingSafeEqual } from "crypto";
import { notifyError } from "@/server/alert";
import { splitPayment } from "@/lib/pay";
import { formatNyang } from "@/lib/yeopjeon";
import type { AnyTopicKey } from "@/lib/topics";
import { GiftError, assertGiftOnSale, getExamGift, giftWithClient } from "@/server/exam/gift";
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
  if (!SRC_COOKIE_ON) return null; // 2026-11-04 유샘: 유입 경로 쿠키 꺼 둠
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

/** 사주 겹쳐 보기 주문의 빈 사람 번호 (pay_orders.person_id 가 비면 안 되어서) */
export const OVERLAY_PERSON_ID = "00000000-0000-0000-0000-000000000000";

/**
 * 사주 겹쳐 보기 결제 (2026-11-01 유샘: 엽전이 없으면 결제창이 떠야) - 다른 상품과 같은 결제창(카드·계좌이체).
 * ref 는 funUnlock.overlayRef (같은 날·같은 입력). 이미 연 것이면 enough 로 돌려 화면이 바로 연다.
 */
export async function checkoutOverlay(userId: string, args: { kind: string; ref: string; price: number; name: string }): Promise<CheckoutResult> {
  const pool = await db();
  const balance = await getBalance(userId);
  const paid = await pool.query(`SELECT 1 FROM bokchae_ledger WHERE user_id = $1 AND kind = 'spend' AND ref = $2`, [userId, args.ref]);
  if ((paid.rowCount ?? 0) > 0 || balance >= args.price) return { status: "enough", price: args.price, balance };
  const pm = payMode();
  if (pm === "off") throw new PayError("PAY_NOT_READY", "결제를 준비하고 있어요. 곧 열려요.");
  const split = splitPayment(args.price, balance);
  const orderId = newOrderId();
  await pool.query(
    `INSERT INTO pay_orders (id, user_id, person_id, mode, topics, price, use_yeopjeon, amount, order_name, src)
     VALUES ($1, $2, $3, 'overlay', $4, $5, $6, $7, $8, $9)`,
    [orderId, userId, OVERLAY_PERSON_ID, JSON.stringify([args.ref, args.kind]), args.price, split.useYeopjeon, split.cash, args.name, await requestSource()]
  );
  return {
    status: "pay",
    orderId,
    orderName: args.name,
    price: args.price,
    useYeopjeon: split.useYeopjeon,
    amount: split.cash,
    clientKey: pm === "toss" ? process.env.TOSS_CLIENT_KEY! : null,
    portone: pm === "portone" ? { storeId: process.env.PORTONE_STORE_ID!, channelKey: process.env.PORTONE_CHANNEL_KEY! } : null,
    customerKey: userId,
    mock: pm === "mock",
  };
}

/** 결제 승인 뒤 겹쳐 보기 열기 - 장부에 그 ref 로 차감 (이미 있으면 그대로). 잔액이 모자라면 엽전으로 남긴다 */
async function overlayWithClient(client: import("pg").PoolClient, userId: string, order: Pick<OrderRow, "topics" | "price" | "order_name">): Promise<void> {
  const ref = String(order.topics[0] ?? "");
  if (!ref.startsWith("overlay:")) throw new PurchaseError("INVALID_TOPICS", "주문 정보가 올바르지 않아요.");
  const { lockAndBalance } = await import("@/server/readings/readings");
  const balance = await lockAndBalance(client, userId);
  const done = await client.query(`SELECT 1 FROM bokchae_ledger WHERE user_id = $1 AND kind = 'spend' AND ref = $2`, [userId, ref]);
  if ((done.rowCount ?? 0) > 0) throw new PurchaseError("ALREADY_OWNED", "이미 연 겹쳐 보기예요.");
  if (balance < order.price) throw new InsufficientYeopjeonError(balance);
  await client.query(`INSERT INTO bokchae_ledger (user_id, amount, kind, label, ref) VALUES ($1, $2, 'spend', $3, $4)`, [
    userId,
    -order.price,
    `[${order.order_name}]`,
    ref,
  ]);
}

/**
 * 2026-10-30 수능대박운 깊게 보기 부모님 선물: 결제하는 사람(부모)의 엽전이 모자랄 때 주문.
 * 주문의 person_id 는 수험생의 사람, gift_token 이 있으면 승인 뒤 purchase 대신 선물로 처리한다.
 */
export async function giftCheckout(payerId: string, token: string): Promise<CheckoutResult> {
  const g = await getExamGift(token, payerId);
  if (!g) throw new GiftError("NOT_FOUND", "결제 부탁 링크를 찾을 수 없어요.");
  assertGiftOnSale(g.mode);
  if (g.owned) throw new GiftError("ALREADY_OWNED", "이미 열려 있어요.");
  // 2026-11-14 유샘: 링크마다 상품(깊게 보기·2~4·네 가지 모두 보기)이 있다 - 가격도 그 상품 가격
  const price = g.price;
  const balance = await getBalance(payerId);
  if (balance >= price) return { status: "enough", price, balance };
  const pm = payMode();
  if (pm === "off") throw new PayError("PAY_NOT_READY", "결제를 준비하고 있어요. 곧 열려요.");
  const split = splitPayment(price, balance);
  const orderId = newOrderId();
  const orderName = `${g.title} (결제 부탁)`;
  const pool = await db();
  await pool.query(
    `INSERT INTO pay_orders (id, user_id, person_id, mode, topics, price, use_yeopjeon, amount, order_name, src, gift_token)
     VALUES ($1, $2, $3, $4, '[]', $5, $6, $7, $8, $9, $10)`,
    [orderId, payerId, g.personId, g.mode, price, split.useYeopjeon, split.cash, orderName, await requestSource(), token]
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
  /** overlay = 사주 겹쳐 보기 (2026-11-01) - person_id 는 빈 번호, topics 는 [장부 ref, 재미관 이름] */
  mode: PurchaseMode | "overlay";
  topics: AnyTopicKey[];
  price: number;
  amount: number;
  order_name: string;
  status: string;
}

function destination(o: Pick<OrderRow, "person_id" | "mode" | "topics" | "gift_token">): string {
  if (o.gift_token) return `/gift/exam/${o.gift_token}?paid=1`;
  if (o.mode === "overlay") return `/fun/${encodeURIComponent(String(o.topics[1] ?? "tarot"))}?paid=1`;
  if (o.mode === "face") return `/face/paid/${o.person_id}?paid=1`;
  if (o.mode === "couple") return `/couple/${o.person_id}?paid=1`;
  if (o.mode === "wallpaper") return `/person/${o.person_id}/wallpaper`;
  if (o.mode === "exam" || o.mode === "exam_deep") return `/person/${o.person_id}/exam?paid=1`;
  // 2026-11-13 유샘: 심층분석 2~4 · 네 가지 모두 보기
  if (o.mode === "exam_goal" || o.mode === "exam_focus" || o.mode === "exam_calm") return `/person/${o.person_id}/exam/x/${o.mode.slice(5)}?paid=1`;
  if (o.mode === "exam_all") return `/person/${o.person_id}/exam/x/all?paid=1`;
  if (o.mode === "ny2027" || o.mode === "ny2027_full") return `/person/${o.person_id}/newyear?paid=1`;
  // 2026-11-09 크리스마스 연애운: 짧은 궁합·2027 연애 달력
  if (o.mode === "love_pair" || o.mode === "love_cal" || o.mode === "love_cal_pair") {
    const partner = o.mode === "love_cal" ? "" : `&partner=${encodeURIComponent(String(o.topics[0] ?? ""))}`;
    return `/person/${o.person_id}/love?show=${o.mode === "love_pair" ? "pair" : "cal"}${partner}&paid=1`;
  }
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
      else if (order.mode === "overlay") await overlayWithClient(client, uid, order);
      else await purchaseWithClient(client, { userId: uid, personId: order.person_id, mode: order.mode, topics: order.topics });
    } catch (e) {
      await client.query("ROLLBACK TO SAVEPOINT buy");
      // 2026-11-14 유샘: 예상 못 한 오류(장부 충돌 등)여도 결제 기록 전체를 되돌리지 않는다 - 돈만 빠지고 기록이 없는 상태를 막는다.
      //   결제 금액은 엽전으로 남기고(paid_credit) 관리자에게 알린다 → 관리자 화면에서 바로 환불할 수 있다.
      const expected = e instanceof PurchaseError || e instanceof InsufficientYeopjeonError || e instanceof GiftError;
      credited = true;
      await client.query(`UPDATE pay_orders SET status = 'paid_credit' WHERE id = $1`, [orderId]);
      notifyError(expected ? "결제 후 구매 실패 - 결제 금액은 엽전으로 남김" : "결제 후 구매 중 예상 못 한 오류 - 결제 금액은 엽전으로 남김, 확인 필요", e);
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
  refundRequestedAt: string | null;
  refundNote: string | null;
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
    refund_requested_at: Date | null;
    refund_note: string | null;
  }>(
    `SELECT o.id, u.nickname, o.order_name, o.price, o.use_yeopjeon, o.amount, o.status, o.created_at, o.paid_at, o.refund_requested_at, o.refund_note
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
    refundRequestedAt: x.refund_requested_at ? x.refund_requested_at.toISOString() : null,
    refundNote: x.refund_note,
  }));
}

/** 2026-11-12 유샘: 손님이 풀이를 처음 연 시각 (환불 판단 근거). 결제된 본인 주문만, 처음 한 번만 남긴다. */
export async function markOrderOpened(userId: string, orderId: string): Promise<void> {
  const pool = await db();
  await pool.query(
    `UPDATE pay_orders SET opened_at = now() WHERE id = $1 AND user_id = $2 AND opened_at IS NULL AND status IN ('paid', 'paid_credit')`,
    [orderId, userId],
  );
}
