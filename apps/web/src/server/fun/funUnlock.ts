import { isOnSale, SALE_CLOSED_MESSAGE } from "@/lib/sale";
import { createHash } from "crypto";
import { getTodayKstDateString } from "saju-engine";
import { db } from "@/server/auth/db";
import { getUserBySessionToken } from "@/server/auth/session";
import { lockAndBalance } from "@/server/readings/readings";
import { CURRENCY_NAME } from "@/lib/yeopjeon";
import { FUN_META } from "@/lib/fun/types";
import { computeFun, isOverlayPaid, isThreeRequest, OVERLAY_PRICE, TAROT3_PRICE, type FunResponse } from "./funService";

/**
 * 사주 겹쳐 보기 열기 (2026-11-01 유샘: 겹쳐 보기는 유료) - 회원 엽전에서 prices.OVERLAY 를 빼고 전체 풀이를 돌려준다.
 *   같은 날 같은 입력(생년월일·시·카드·질문)을 다시 열면 또 빼지 않는다 (장부 ref 로 한 번만).
 *   다음 날은 새로 연다 - 타로는 하루에 한 장이라 "오늘의 겹쳐 보기"로 판다.
 *   입력한 생년월일은 저장하지 않는다 (장부에는 입력을 알아볼 수 없는 지문(해시)만 남는다).
 */

type Out = { status: number; body: unknown };
/** 결제 창·이용내역 상품 이름 (2026-11-09) */
const THREE_NAME = "타로 세 장 카드 + 사주 겹쳐 보기";
const err = (status: number, code: string, message: string): Out => ({ status, body: { error: { code, message } } });

/** 같은 날·같은 입력이면 같은 값 - 입력 자체는 남기지 않는다 */
export function overlayRef(kind: string, raw: Record<string, unknown>, today: string): string {
  // 2026-11-09 세 장 상품은 카드 세 장까지 넣어 따로 센다 (한 장 겹쳐 보기와 다른 상품)
  const three = isThreeRequest(raw) && Array.isArray(raw.cards) ? ["three", ...raw.cards.map(Number)] : [];
  const key = JSON.stringify([kind, raw.calendarType, raw.isLeapMonth === true, raw.date, raw.time ?? "", raw.blood ?? "", raw.card ?? "", raw.question ?? "", ...(raw.mbti ? [raw.mbti] : []), ...three]);
  return `overlay:${kind}:${today}:${createHash("sha256").update(key).digest("hex").slice(0, 20)}`;
}

export async function handleFunUnlock(token: string | undefined, raw: unknown): Promise<Out> {
  const user = await getUserBySessionToken(token);
  if (!user || !user.termsAgreed) return err(401, "NOT_LOGGED_IN", "로그인하면 열 수 있어요.");
  const out = computeFun(raw);
  if (out.status !== 200) return out;
  const body = out.body as FunResponse;
  if (!isOverlayPaid(body.kind)) return { status: 200, body }; // 무료 관은 그대로
  // 2026-11-09 유샘: 세 장 카드 + 사주 겹쳐 보기 (5,500원) - 한 장 겹쳐 보기와 같은 방식, 가격과 이름만 다르다
  const three = isThreeRequest(raw);
  if (three && TAROT3_PRICE <= 0) return err(400, "NOT_SOLD", "준비 중이에요.");
  const PRICE_NOW = three ? TAROT3_PRICE : OVERLAY_PRICE;

  const ref = overlayRef(body.kind, raw as Record<string, unknown>, getTodayKstDateString());
  const pool = await db();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const balance = await lockAndBalance(client, user.id);
    const paid = await client.query(`SELECT 1 FROM bokchae_ledger WHERE user_id = $1 AND kind = 'spend' AND ref = $2`, [user.id, ref]);
    if ((paid.rowCount ?? 0) === 0) {
      if (!isOnSale("overlay")) {
        await client.query("ROLLBACK");
        return err(403, "SALE_CLOSED", SALE_CLOSED_MESSAGE);
      }
      if (balance < PRICE_NOW) {
        await client.query("ROLLBACK");
        return { status: 402, body: { error: { code: "INSUFFICIENT_YEOPJEON", message: `${CURRENCY_NAME}이 부족해요.` }, balance, price: PRICE_NOW } };
      }
      await client.query(`INSERT INTO bokchae_ledger (user_id, amount, kind, label, ref) VALUES ($1, $2, 'spend', $3, $4)`, [
        user.id,
        -PRICE_NOW,
        three ? THREE_NAME : `[사주 겹쳐 보기] ${FUN_META[body.kind].title.split(" · ")[0]}`,
        ref,
      ]);
    }
    await client.query("COMMIT");
    return { status: 200, body: { ...body, locked: false, balance: (paid.rowCount ?? 0) === 0 ? balance - PRICE_NOW : balance } };
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}

/** 엽전이 모자라면 결제창용 주문 (2026-11-01 유샘: 카드·계좌이체 등 다른 상품과 같은 결제창) */
export async function handleFunCheckout(token: string | undefined, raw: unknown): Promise<Out> {
  const user = await getUserBySessionToken(token);
  if (!user || !user.termsAgreed) return err(401, "NOT_LOGGED_IN", "로그인하면 열 수 있어요.");
  const req = (raw as { req?: unknown } | null)?.req;
  const out = computeFun(req);
  if (out.status !== 200) return out;
  const body = out.body as FunResponse;
  if (!isOverlayPaid(body.kind)) return err(400, "NOT_PAID_ITEM", "무료로 볼 수 있어요.");
  if (!isOnSale("overlay")) return err(403, "SALE_CLOSED", SALE_CLOSED_MESSAGE);
  const three = isThreeRequest(req);
  if (three && TAROT3_PRICE <= 0) return err(400, "NOT_SOLD", "준비 중이에요.");
  const { checkoutOverlay, PayError } = await import("@/server/pay/payOrders");
  try {
    const q = await checkoutOverlay(user.id, {
      kind: body.kind,
      ref: overlayRef(body.kind, req as Record<string, unknown>, getTodayKstDateString()),
      price: three ? TAROT3_PRICE : OVERLAY_PRICE,
      name: three ? THREE_NAME : `사주 겹쳐 보기 · ${FUN_META[body.kind].title.split(" · ")[0]}`,
    });
    return { status: 200, body: q };
  } catch (e) {
    if (e instanceof PayError) return err(503, e.code, e.message);
    throw e;
  }
}
