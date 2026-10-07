import { randomInt } from "crypto";
import { db } from "@/server/auth/db";
import { INVITE_MONTHLY_CAP, REF_CODE_RE, WELCOME_GIFT, inviteRewardsFor } from "@/lib/bokchae";

/**
 * 복채 장부 (2026-10-06). 잔액 = bokchae_ledger.amount 합계.
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
  return r.rows.map((row) => ({ amount: row.amount, kind: row.kind, label: row.label, createdAt: row.created_at.toISOString() }));
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
 *  - 가입 선물 복채 지급
 *  - 초대 코드가 있으면(자기 자신 제외) 초대한 사람에게 보상 + 누적 인원 보너스 (월 한도 안에서)
 * 실패해도 가입 자체는 막지 않도록 호출하는 쪽에서 try/catch 한다.
 */
export async function onNewMember(userId: string, refCode: string | undefined): Promise<void> {
  await grant(userId, WELCOME_GIFT, "welcome", "회원가입 축하 복채");

  if (!refCode || !REF_CODE_RE.test(refCode)) return;
  const pool = await db();
  const ref = await pool.query<{ id: string }>(`SELECT id FROM users WHERE ref_code = $1`, [refCode]);
  const referrerId = ref.rows[0]?.id;
  if (!referrerId || referrerId === userId) return;

  // 초대받은 사람은 한 번만 인정 (PRIMARY KEY)
  const inserted = await pool.query(
    `INSERT INTO referrals (referred_user_id, referrer_id) VALUES ($1, $2) ON CONFLICT (referred_user_id) DO NOTHING`,
    [userId, referrerId]
  );
  if ((inserted.rowCount ?? 0) === 0) return;

  // 이번 달 보상 받은 인원이 한도를 넘으면 기록만 남기고 보상은 없음
  const month = await pool.query<{ n: string }>(
    `SELECT COUNT(*) AS n FROM referrals
      WHERE referrer_id = $1 AND rewarded AND created_at >= date_trunc('month', now() AT TIME ZONE 'Asia/Seoul') AT TIME ZONE 'Asia/Seoul'`,
    [referrerId]
  );
  if (Number(month.rows[0]?.n ?? 0) >= INVITE_MONTHLY_CAP) return;

  const total = await pool.query<{ n: string }>(`SELECT COUNT(*) AS n FROM referrals WHERE referrer_id = $1`, [referrerId]);
  const nth = Number(total.rows[0]?.n ?? 1);
  for (const r of inviteRewardsFor(nth)) {
    await grant(referrerId, r.amount, r.kind, r.label, r.kind === "invite" ? userId : String(nth));
  }
  await pool.query(`UPDATE referrals SET rewarded = true WHERE referred_user_id = $1`, [userId]);
}

export class InsufficientBokchaeError extends Error {
  constructor(readonly balance: number) {
    super("복채가 부족합니다.");
    this.name = "InsufficientBokchaeError";
  }
}
