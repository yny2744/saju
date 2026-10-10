import { db } from "@/server/auth/db";
import { CURRENCY_NAME, MAX_PENDING_CHARGES, formatNyang, isChargeOption } from "@/lib/yeopjeon";

/**
 * 계좌 입금 충전 (2026-10-10).
 *  손님: 금액·입금자명 → 신청(pending) → 안내된 계좌로 입금
 *  관리자: 통장에서 입금 확인 → 승인(approved) → 엽전 지급 (장부 kind 'charge', ref = 신청 번호라 두 번 들어가지 않음)
 */

export interface ChargeRequest {
  id: string;
  amount: number;
  depositor: string;
  status: "pending" | "approved" | "rejected" | "cancelled";
  createdAt: string;
  decidedAt: string | null;
}

export class ChargeError extends Error {
  constructor(readonly code: "INVALID_INPUT" | "TOO_MANY_PENDING" | "NOT_FOUND" | "ALREADY_DECIDED", message: string) {
    super(message);
    this.name = "ChargeError";
  }
}

/** 입금자명: 앞뒤 공백 제거, 2~20자, 글자·숫자·공백·괄호만 */
export function cleanDepositor(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.replace(/\s+/g, " ").trim();
  if (s.length < 2 || s.length > 20) return null;
  if (!/^[\p{L}\p{N} ()]+$/u.test(s)) return null;
  return s;
}

/** 계좌 안내 (Vercel 환경변수 BANK_ACCOUNT, 예: "국민은행 123456-01-234567 예금주 엔와이") - 없으면 충전을 받지 않는다 */
export function bankAccount(): string | null {
  const v = (process.env.BANK_ACCOUNT ?? "").trim();
  return v ? v.slice(0, 120) : null;
}

type Row = { id: string; amount: number; depositor: string; status: ChargeRequest["status"]; created_at: Date; decided_at: Date | null };
const toReq = (r: Row): ChargeRequest => ({
  id: r.id,
  amount: r.amount,
  depositor: r.depositor,
  status: r.status,
  createdAt: r.created_at.toISOString(),
  decidedAt: r.decided_at ? r.decided_at.toISOString() : null,
});

export async function listMyCharges(userId: string): Promise<ChargeRequest[]> {
  const pool = await db();
  const r = await pool.query<Row>(
    `SELECT id, amount, depositor, status, created_at, decided_at FROM charge_requests WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20`,
    [userId]
  );
  return r.rows.map(toReq);
}

export async function createCharge(userId: string, amount: unknown, depositor: unknown): Promise<ChargeRequest> {
  if (!isChargeOption(amount)) throw new ChargeError("INVALID_INPUT", "충전 금액을 골라 주세요.");
  const name = cleanDepositor(depositor);
  if (!name) throw new ChargeError("INVALID_INPUT", "입금자 이름을 2~20자로 적어 주세요.");
  const pool = await db();
  const pending = await pool.query<{ n: string }>(`SELECT COUNT(*) AS n FROM charge_requests WHERE user_id = $1 AND status = 'pending'`, [userId]);
  if (Number(pending.rows[0]?.n ?? 0) >= MAX_PENDING_CHARGES) {
    throw new ChargeError("TOO_MANY_PENDING", `확인을 기다리는 신청이 ${MAX_PENDING_CHARGES}건 있어요. 입금 확인 뒤에 다시 신청해 주세요.`);
  }
  const r = await pool.query<Row>(
    `INSERT INTO charge_requests (user_id, amount, depositor) VALUES ($1, $2, $3)
     RETURNING id, amount, depositor, status, created_at, decided_at`,
    [userId, amount, name]
  );
  return toReq(r.rows[0]);
}

/** 손님이 아직 확인 전인 신청을 취소 */
export async function cancelCharge(userId: string, id: string): Promise<void> {
  const pool = await db();
  const r = await pool.query(`UPDATE charge_requests SET status = 'cancelled', decided_at = now() WHERE id = $1 AND user_id = $2 AND status = 'pending'`, [
    id,
    userId,
  ]);
  if ((r.rowCount ?? 0) === 0) throw new ChargeError("ALREADY_DECIDED", "이미 처리된 신청이에요.");
}

// ───────── 관리자 ─────────

export interface AdminCharge extends ChargeRequest {
  userId: string;
  nickname: string;
}

export async function listCharges(status: "pending" | "all"): Promise<AdminCharge[]> {
  const pool = await db();
  const r = await pool.query<Row & { user_id: string; nickname: string }>(
    `SELECT c.id, c.amount, c.depositor, c.status, c.created_at, c.decided_at, c.user_id, u.nickname
       FROM charge_requests c JOIN users u ON u.id = c.user_id
      ${status === "pending" ? "WHERE c.status = 'pending'" : ""}
      ORDER BY c.created_at DESC LIMIT 100`
  );
  return r.rows.map((x) => ({ ...toReq(x), userId: x.user_id, nickname: x.nickname }));
}

/** 승인 = 엽전 지급, 거절 = 지급 없이 닫기. 한 신청은 한 번만 처리된다. */
export async function decideCharge(id: string, action: "approve" | "reject"): Promise<AdminCharge["status"]> {
  const pool = await db();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const cur = await client.query<{ user_id: string; amount: number; status: string; depositor: string }>(
      `SELECT user_id, amount, status, depositor FROM charge_requests WHERE id = $1 FOR UPDATE`,
      [id]
    );
    const row = cur.rows[0];
    if (!row) throw new ChargeError("NOT_FOUND", "신청을 찾을 수 없어요.");
    if (row.status !== "pending") throw new ChargeError("ALREADY_DECIDED", "이미 처리된 신청이에요.");
    const status = action === "approve" ? "approved" : "rejected";
    await client.query(`UPDATE charge_requests SET status = $2, decided_at = now() WHERE id = $1`, [id, status]);
    if (action === "approve") {
      await client.query(
        `INSERT INTO bokchae_ledger (user_id, amount, kind, label, ref) VALUES ($1, $2, 'charge', $3, $4)
         ON CONFLICT (user_id, kind, ref) DO NOTHING`,
        [row.user_id, row.amount, `${CURRENCY_NAME} 충전 (계좌 입금 ${formatNyang(row.amount)})`, id]
      );
    }
    await client.query("COMMIT");
    return status;
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}
