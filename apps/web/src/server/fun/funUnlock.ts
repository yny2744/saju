import { createHash } from "crypto";
import { getTodayKstDateString } from "saju-engine";
import { db } from "@/server/auth/db";
import { getUserBySessionToken } from "@/server/auth/session";
import { lockAndBalance } from "@/server/readings/readings";
import { CURRENCY_NAME } from "@/lib/yeopjeon";
import { FUN_META } from "@/lib/fun/types";
import { computeFun, isOverlayPaid, OVERLAY_PRICE, type FunResponse } from "./funService";

/**
 * 사주 겹쳐 보기 열기 (2026-11-01 유샘: 겹쳐 보기는 유료) - 회원 엽전에서 prices.OVERLAY 를 빼고 전체 풀이를 돌려준다.
 *   같은 날 같은 입력(생년월일·시·카드·질문)을 다시 열면 또 빼지 않는다 (장부 ref 로 한 번만).
 *   다음 날은 새로 연다 - 타로는 하루에 한 장이라 "오늘의 겹쳐 보기"로 판다.
 *   입력한 생년월일은 저장하지 않는다 (장부에는 입력을 알아볼 수 없는 지문(해시)만 남는다).
 */

type Out = { status: number; body: unknown };
const err = (status: number, code: string, message: string): Out => ({ status, body: { error: { code, message } } });

/** 같은 날·같은 입력이면 같은 값 - 입력 자체는 남기지 않는다 */
export function overlayRef(kind: string, raw: Record<string, unknown>, today: string): string {
  const key = JSON.stringify([kind, raw.calendarType, raw.isLeapMonth === true, raw.date, raw.time ?? "", raw.blood ?? "", raw.card ?? "", raw.question ?? ""]);
  return `overlay:${kind}:${today}:${createHash("sha256").update(key).digest("hex").slice(0, 20)}`;
}

export async function handleFunUnlock(token: string | undefined, raw: unknown): Promise<Out> {
  const user = await getUserBySessionToken(token);
  if (!user || !user.termsAgreed) return err(401, "NOT_LOGGED_IN", "로그인하면 열 수 있어요.");
  const out = computeFun(raw);
  if (out.status !== 200) return out;
  const body = out.body as FunResponse;
  if (!isOverlayPaid(body.kind)) return { status: 200, body }; // 무료 관은 그대로

  const ref = overlayRef(body.kind, raw as Record<string, unknown>, getTodayKstDateString());
  const pool = await db();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const balance = await lockAndBalance(client, user.id);
    const paid = await client.query(`SELECT 1 FROM bokchae_ledger WHERE user_id = $1 AND kind = 'spend' AND ref = $2`, [user.id, ref]);
    if ((paid.rowCount ?? 0) === 0) {
      if (balance < OVERLAY_PRICE) {
        await client.query("ROLLBACK");
        return { status: 402, body: { error: { code: "INSUFFICIENT_YEOPJEON", message: `${CURRENCY_NAME}이 부족해요.` }, balance, price: OVERLAY_PRICE } };
      }
      await client.query(`INSERT INTO bokchae_ledger (user_id, amount, kind, label, ref) VALUES ($1, $2, 'spend', $3, $4)`, [
        user.id,
        -OVERLAY_PRICE,
        `[사주 겹쳐 보기] ${FUN_META[body.kind].title.split(" · ")[0]}`,
        ref,
      ]);
    }
    await client.query("COMMIT");
    return { status: 200, body: { ...body, locked: false, balance: (paid.rowCount ?? 0) === 0 ? balance - OVERLAY_PRICE : balance } };
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}
