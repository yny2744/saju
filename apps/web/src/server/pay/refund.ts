import { db } from "@/server/auth/db";
import { inTransaction } from "@/server/readings/readings";
import { notifyAdmin } from "@/server/alert";
import { formatNyang } from "@/lib/yeopjeon";
import { payMode } from "./payOrders";

/**
 * 환불 (2026-11-13 유샘 승인)
 *   1) 손님이 마이페이지 결제 내역에서 [환불 신청] → 요건(풀이를 열기 전 · 결제 7일 안)을 확인해 접수 안내, 관리자에게 알림.
 *      풀이를 이미 열었어도 신청은 받아 둔다 (미성년자 결제 등은 유샘이 판단).
 *   2) 관리자 화면 [환불 처리] → 포트원에 결제 취소 요청 → 우리 기록을 '환불됨'으로.
 *      포트원 관리자 화면에서 직접 취소해도 웹훅(Transaction.Cancelled)으로 같은 처리가 된다.
 *   3) 환불되면: 결제로 들어온 돈을 장부에서 빼고, 쓴 값은 돌려준다 (엽전으로 함께 낸 몫은 엽전으로 돌아옴).
 *      수능대박운(exam·exam_deep)은 열린 풀이를 다시 잠근다. 다른 상품은 관리자에게 알림만 (판매 잠금 중이라 지금은 없음).
 */

const REFUND_DAYS = 7;
const REVOCABLE = new Set(["exam", "exam_deep", "exam_goal", "exam_focus", "exam_calm", "exam_all"]);

export interface MyPayOrder {
  id: string;
  orderName: string;
  amount: number;
  paidAt: string | null;
  status: string; // paid · paid_credit · refunded
  refundRequestedAt: string | null;
  refundedAt: string | null;
}

type Row = {
  id: string;
  user_id: string;
  person_id: string;
  mode: string;
  price: number;
  amount: number;
  order_name: string;
  status: string;
  paid_at: Date | null;
  opened_at: Date | null;
  refund_requested_at: Date | null;
  refunded_at: Date | null;
  gift_token: string | null;
};

const COLS = `id, user_id, person_id, mode, price, amount, order_name, status, paid_at, opened_at, refund_requested_at, refunded_at, gift_token`;
/**
 * 열람 표시에 남은 경로 - 보호자(지인) 결제 부탁은 'gift:<토큰>' 으로 열린다 (2026-11-14, 그 링크가 연 풀이만 다시 잠그려고).
 * 그 전에 결제된 부탁 링크는 'gift' 로 열려 있어 둘 다 본다.
 */
const viasOf = (o: Pick<Row, "mode" | "gift_token">): string[] => (o.gift_token ? (o.mode === "exam_deep" ? [`gift:${o.gift_token}`, "gift"] : [`gift:${o.gift_token}`]) : [o.mode]);

export async function myPayOrders(userId: string): Promise<MyPayOrder[]> {
  const pool = await db();
  const r = await pool.query<Row>(`SELECT ${COLS} FROM pay_orders WHERE user_id = $1 AND status IN ('paid','paid_credit','refunded') ORDER BY created_at DESC LIMIT 30`, [userId]);
  return r.rows.map((x) => ({
    id: x.id,
    orderName: x.order_name,
    amount: x.amount,
    paidAt: x.paid_at?.toISOString() ?? null,
    status: x.status,
    refundRequestedAt: x.refund_requested_at?.toISOString() ?? null,
    refundedAt: x.refunded_at?.toISOString() ?? null,
  }));
}

/**
 * 제공 상태 (2026-11-13 유샘) - 환불 판단용: 열람 전 · 열람 완료 · 제공 실패
 *   AI가 쓰는 상품(수능 심층분석 등): 풀이가 저장돼 있으면 열람 완료, 열었는데(연 시각) 풀이가 없으면 제공 실패, 둘 다 없으면 열람 전.
 *   바로 보이는 상품(가볍게 보기 등): 연 시각이 있으면 열람 완료.
 */
export type Delivery = "열람 전" | "열람 완료" | "제공 실패";
export async function deliveryOf(o: Pick<Row, "mode" | "gift_token" | "person_id" | "opened_at">): Promise<Delivery> {
  const ai = REVOCABLE.has(o.mode) && o.mode !== "exam";
  if (!ai) return o.opened_at ? "열람 완료" : "열람 전";
  const pool = await db();
  const r = await pool.query(
    `SELECT 1 FROM topic_readings r JOIN topic_unlocks u ON u.person_id = r.person_id AND u.topic = r.topic WHERE r.person_id = $1 AND u.via = ANY($2::text[])`,
    [o.person_id, viasOf(o)]
  );
  if ((r.rowCount ?? 0) > 0) return "열람 완료";
  return o.opened_at ? "제공 실패" : "열람 전";
}

/** 관리자 결제 목록에 제공 상태를 붙인다 */
export async function deliveryForOrders(ids: string[]): Promise<Record<string, Delivery>> {
  if (ids.length === 0) return {};
  const pool = await db();
  const r = await pool.query<Row>(`SELECT ${COLS} FROM pay_orders WHERE id = ANY($1)`, [ids]);
  const out: Record<string, Delivery> = {};
  for (const o of r.rows) out[o.id] = await deliveryOf(o);
  return out;
}

export type RefundRequestResult = { eligible: boolean; message: string };

export async function requestRefund(userId: string, orderId: string, reason: string): Promise<RefundRequestResult | null> {
  const pool = await db();
  const r = await pool.query<Row>(`SELECT ${COLS} FROM pay_orders WHERE id = $1 AND user_id = $2`, [orderId, userId]);
  const o = r.rows[0];
  if (!o || (o.status !== "paid" && o.status !== "paid_credit")) return null;
  if (o.refund_requested_at) return { eligible: true, message: "이미 환불 신청이 접수되어 있어요. 처리되면 결제 내역에 '환불 완료'로 표시돼요." };
  // 2026-11-13 유샘: 열었지만 풀이를 못 받은 경우(제공 실패)는 열람으로 보지 않는다 - 환불해 드릴 건
  const delivery = await deliveryOf(o);
  const opened = delivery === "열람 완료";
  const late = !o.paid_at || Date.now() - o.paid_at.getTime() > REFUND_DAYS * 86400_000;
  const eligible = !opened && !late;
  const note = `${delivery} · ` + (eligible ? "요건 충족" : opened ? "풀이 열람 후" : "결제 7일 지남") + (reason ? ` · 사유: ${reason.slice(0, 200)}` : "");
  await pool.query(`UPDATE pay_orders SET refund_requested_at = now(), refund_note = $2 WHERE id = $1`, [orderId, note]);
  notifyAdmin(`환불 신청 - ${o.order_name} ${o.amount.toLocaleString("ko-KR")}원 (${note}) · 주문 ${orderId} · 관리자 화면에서 [환불 처리]`);
  return eligible
    ? { eligible, message: "환불 신청이 접수되었어요. 접수한 날부터 3영업일 이내에 결제를 취소해 드려요. 카드사에 따라 취소 내역이 보이기까지 며칠 더 걸릴 수 있어요." }
    : {
        eligible,
        message: opened
          ? "환불 신청을 받았어요. 다만 풀이를 이미 연 뒤라 관련 법령에 따라 환불이 제한될 수 있어요. 확인한 뒤 결과를 알려 드릴게요."
          : "환불 신청을 받았어요. 다만 결제한 지 7일이 지나 환불이 제한될 수 있어요. 확인한 뒤 결과를 알려 드릴게요.",
      };
}

/** 우리 기록을 '환불됨'으로 (두 번 불려도 한 번만 처리). 포트원 취소가 끝난 뒤에 부른다 */
export async function markRefunded(orderId: string): Promise<"done" | "already" | "missing"> {
  let out: "done" | "already" | "missing" = "missing";
  let manual: Row | null = null;
  await inTransaction(async (client) => {
    const r = await client.query<Row>(`SELECT ${COLS} FROM pay_orders WHERE id = $1 FOR UPDATE`, [orderId]);
    const o = r.rows[0];
    if (!o) return;
    if (o.status === "refunded") {
      out = "already";
      return;
    }
    if (o.status !== "paid" && o.status !== "paid_credit") return;
    await client.query(`UPDATE pay_orders SET status = 'refunded', refunded_at = now() WHERE id = $1`, [orderId]);
    // 결제로 들어온 돈을 뺀다
    await client.query(
      `INSERT INTO bokchae_ledger (user_id, amount, kind, label, ref) VALUES ($1, $2, 'refund', $3, $4) ON CONFLICT (user_id, kind, ref) DO NOTHING`,
      [o.user_id, -o.amount, `환불 ${o.amount.toLocaleString("ko-KR")}원 (${o.order_name})`, orderId]
    );
    if (o.status === "paid") {
      // 산 값은 돌려준다 (엽전으로 함께 낸 몫이 엽전으로 돌아온다)
      await client.query(
        `INSERT INTO bokchae_ledger (user_id, amount, kind, label, ref) VALUES ($1, $2, 'refund_back', $3, $4) ON CONFLICT (user_id, kind, ref) DO NOTHING`,
        [o.user_id, o.price, `환불로 구매 취소 ${formatNyang(o.price)} (${o.order_name})`, orderId]
      );
      if (REVOCABLE.has(o.mode)) {
        // 이 주문이 연 것만 다시 잠근다 (써 둔 풀이도 지운다 - 다시 사면 새로 쓴다)
        await client.query(
          `DELETE FROM topic_readings WHERE person_id = $1 AND topic IN (SELECT topic FROM topic_unlocks WHERE person_id = $1 AND via = ANY($2::text[]))`,
          [o.person_id, viasOf(o)]
        );
        await client.query(`DELETE FROM topic_unlocks WHERE person_id = $1 AND via = ANY($2::text[])`, [o.person_id, viasOf(o)]);
        if (o.gift_token) await client.query(`UPDATE exam_gifts SET paid_by = NULL, paid_at = NULL WHERE token = $1`, [o.gift_token]);
      } else {
        manual = o;
      }
    }
    out = "done";
  });
  const m = manual as Row | null;
  if (m) notifyAdmin(`환불됨 - ${m.order_name}: 이 상품은 열람을 자동으로 잠그지 못해요. 확인이 필요해요 (주문 ${orderId})`);
  return out;
}

/** 관리자 [환불 처리] - 포트원에 결제 취소를 요청하고 기록을 바꾼다 */
export async function adminRefund(orderId: string, reason: string): Promise<{ ok: boolean; message: string }> {
  const pool = await db();
  const r = await pool.query<Row>(`SELECT ${COLS} FROM pay_orders WHERE id = $1`, [orderId]);
  const o = r.rows[0];
  if (!o) return { ok: false, message: "주문을 찾을 수 없어요." };
  if (o.status === "refunded") return { ok: true, message: "이미 환불된 주문이에요." };
  if (o.status !== "paid" && o.status !== "paid_credit") return { ok: false, message: "결제 완료된 주문만 환불할 수 있어요." };
  if (o.amount > 0 && payMode() === "portone") {
    const secret = process.env.PORTONE_API_SECRET;
    if (!secret) return { ok: false, message: "포트원 비밀키가 없어요." };
    let res: Response;
    try {
      res = await fetch(`https://api.portone.io/payments/${encodeURIComponent(orderId)}/cancel`, {
        method: "POST",
        headers: { Authorization: `PortOne ${secret}`, "Content-Type": "application/json" },
        body: JSON.stringify({ reason: (reason || "고객 환불 요청").slice(0, 200) }),
      });
    } catch {
      return { ok: false, message: "포트원에 연결하지 못했어요. 잠시 뒤 다시 눌러 주세요." };
    }
    const data = (await res.json().catch(() => null)) as { type?: string; message?: string } | null;
    if (!res.ok) {
      // 2026-11-13 실결제 시험: 포트원 화면에서 먼저 취소한 결제는 "취소 실패"가 난다 - 포트원 상태가 취소면 우리 기록만 맞춘다
      const st = await fetch(`https://api.portone.io/payments/${encodeURIComponent(orderId)}`, { headers: { Authorization: `PortOne ${secret}` } })
        .then((r) => (r.ok ? (r.json() as Promise<{ status?: string }>) : null))
        .catch(() => null);
      if (st?.status !== "CANCELLED") return { ok: false, message: `포트원 취소 실패: ${data?.message ?? res.status}` };
      await markRefunded(orderId);
      return { ok: true, message: "포트원에서 이미 취소된 결제라 사이트 기록을 '환불 완료'로 맞췄어요." };
    }
  }
  await markRefunded(orderId);
  return { ok: true, message: "환불 처리했어요. 손님 결제 내역에 '환불 완료'로 보여요." };
}

/** 포트원 웹훅 - 포트원 관리자 화면에서 직접 취소한 경우 */
export async function refundFromWebhook(payload: unknown): Promise<"done" | "ignored"> {
  const p = payload as { type?: unknown; data?: { paymentId?: unknown } } | null;
  const paymentId = typeof p?.data?.paymentId === "string" ? p.data.paymentId : "";
  if (p?.type !== "Transaction.Cancelled" || !paymentId.startsWith("ryg_")) return "ignored";
  const r = await markRefunded(paymentId);
  return r === "missing" ? "ignored" : "done";
}
