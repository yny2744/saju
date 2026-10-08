import { randomInt } from "crypto";
import { db } from "@/server/auth/db";
import { CURRENCY_NAME, REF_CODE_RE, WELCOME_GIFT, displayLedgerLabel, inviteRewardFor } from "@/lib/yeopjeon";

/**
 * 엽전 장부 (2026-10-06, 이름은 10-08에 복채→엽전). 잔액 = bokchae_ledger.amount 합계 (테이블 이름은 예전 그대로).
 * 지급은 (user_id, kind, ref) 유니크라 같은 선물·보상이 두 번 들어가지 않는다(멱등).
 */

export interface LedgerEntry {
  amount: number;
  kind: string;
  label: string;
  createdAt: string;
}

export async function getBalance(userId: string): Promise<number> {
  const pool = await db();
  const r = await pool.query<{ total: string | null }>(`SELECT SUM(amount) AS total FROM bokchae_ledger WHERE user_id = $1`, [userId]);
  return Number(r.rows[0]?.total ?? 0);
}

export async function listLedger(userId: string, limit = 50): Promise<LedgerEntry[]> {
  const pool = await db();
  const r = await pool.query<{ amount: number; kind: string; label: string; created_at: Date }>(
    `SELECT amount, kind, label, created_at FROM bokchae_ledger WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2`,
    [userId, limit]
  );
  return r.rows.map((row) => ({ amount: row.amount, kind: row.kind, label: displayLedgerLabel(row.label), createdAt: row.created_at.toISOString() }));
}

/** 지급(멱등). 이미 같은 (kind, ref)가 있으면 아무것도 하지 않고 false */
export async function grant(userId: string, amount: number, kind: string, label: string, ref = ""): Promise<boolean> {
  const pool = await db();
  const r = await pool.query(
    `INSERT INTO bokchae_ledger (user_id, amount, kind, label, ref) VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (user_id, kind, ref) DO NOTHING`,
    [userId, amount, kind, label, ref]
  );
  return (r.rowCount ?? 0) > 0;
}

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // 헷갈리는 0/O, 1/I 제외

function makeCode(): string {
  let s = "";
  for (let i = 0; i < 7; i++) s += CODE_CHARS[randomInt(CODE_CHARS.length)];
  return s;
}

/** 내 초대 코드 (없으면 만든다) */
export async function ensureRefCode(userId: string): Promise<string> {
  const pool = await db();
  const cur = await pool.query<{ ref_code: string | null }>(`SELECT ref_code FROM users WHERE id = $1`, [userId]);
  if (cur.rows[0]?.ref_code) return cur.rows[0].ref_code;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const r = await pool.query<{ ref_code: string }>(
        `UPDATE users SET ref_code = COALESCE(ref_code, $2) WHERE id = $1 RETURNING ref_code`,
        [userId, makeCode()]
      );
      if (r.rows[0]?.ref_code) return r.rows[0].ref_code;
    } catch (err) {
      if (!(err && typeof err === "object" && (err as { code?: string }).code === "23505")) throw err; // 코드 충돌이면 다시
    }
  }
  throw new Error("초대 코드를 만들지 못했습니다.");
}

export async function inviteStats(userId: string): Promise<{ invited: number }> {
  const pool = await db();
  const r = await pool.query<{ n: string }>(`SELECT COUNT(*) AS n FROM referrals WHERE referrer_id = $1`, [userId]);
  return { invited: Number(r.rows[0]?.n ?? 0) };
}

/**
 * 새 회원이 필수 동의를 처음 마친 순간 한 번 호출된다.
 *  - 가입 선물 엽전 지급
 *  - 초대 코드가 있으면(자기 자신 제외) 초대한 사람에게 n번째 친구 보상 (10명 단위 반복, 월 한도 없음)
 * 초대한 사람의 users 행을 잠가(FOR UPDATE) 동시에 두 명이 가입해도 n번째 계산이 겹치지 않게 한다.
 * 실패해도 가입 자체는 막지 않도록 호출하는 쪽에서 try/catch 한다.
 */
export async function onNewMember(userId: string, refCode: string | undefined): Promise<void> {
  await grant(userId, WELCOME_GIFT, "welcome", `회원가입 축하 ${CURRENCY_NAME}`);

  const code = refCode?.toUpperCase();
  if (!code || !REF_CODE_RE.test(code)) return;
  const pool = await db();
  const ref = await pool.query<{ id: string }>(`SELECT id FROM users WHERE ref_code = $1`, [code]);
  const referrerId = ref.rows[0]?.id;
  if (!referrerId || referrerId === userId) return;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(`SELECT id FROM users WHERE id = $1 FOR UPDATE`, [referrerId]);
    // 초대받은 사람은 한 번만 인정 (PRIMARY KEY)
    const inserted = await client.query(
      `INSERT INTO referrals (referred_user_id, referrer_id) VALUES ($1, $2) ON CONFLICT (referred_user_id) DO NOTHING`,
      [userId, referrerId]
    );
    if ((inserted.rowCount ?? 0) === 0) {
      await client.query("ROLLBACK");
      return;
    }
    const total = await client.query<{ n: string }>(`SELECT COUNT(*) AS n FROM referrals WHERE referrer_id = $1`, [referrerId]);
    const nth = Number(total.rows[0]?.n ?? 1);
    const amount = inviteRewardFor(nth);
    await client.query(
      `INSERT INTO bokchae_ledger (user_id, amount, kind, label, ref) VALUES ($1, $2, 'invite', $3, $4)
       ON CONFLICT (user_id, kind, ref) DO NOTHING`,
      [referrerId, amount, `친구 초대 ${CURRENCY_NAME} (${nth}번째 친구)`, userId]
    );
    await client.query(`UPDATE referrals SET rewarded = true, nth = $2 WHERE referred_user_id = $1`, [userId, nth]);
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

export class InsufficientYeopjeonError extends Error {
  constructor(readonly balance: number) {
    super(`${CURRENCY_NAME}이 부족합니다.`);
    this.name = "InsufficientYeopjeonError";
  }
}
