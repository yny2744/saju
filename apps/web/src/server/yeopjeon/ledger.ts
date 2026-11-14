import { randomInt } from "crypto";
import { db } from "@/server/auth/db";
import { CURRENCY_NAME, INVITEE_GIFT, REF_CODE_RE, WELCOME_GIFT, displayLedgerLabel, inviteRewardFor, welcomeAllowed } from "@/lib/yeopjeon";

/**
 * 엽전 장부 (2026-10-06, 이름은 10-08에 복채→엽전). 잔액 = bokchae_ledger.amount 합계 (테이블 이름은 예전 그대로).
 * 지급은 (user_id, kind, ref) 유니크라 같은 선물·보상이 두 번 들어가지 않는다(멱등).
 */

/**
 * 구매 사용 기록 한 줄 (2026-11-14 유샘 실결제 시험).
 * 환불하면 열람은 다시 잠기지만 처음 산 사용 기록은 장부에 남는다. 같은 사람이 같은 상품을 다시 사면
 * 이름표(ref)가 겹쳐 장부가 거절하고 결제 처리 전체가 취소되던 문제 - 겹치면 뒤에 #2, #3 … 을 붙여 새 줄로 남긴다.
 * (중복 구매는 장부가 아니라 열람 표시 확인(planForPerson 등)이 막는다)
 */
export async function insertSpend(
  client: { query: (sql: string, params: unknown[]) => Promise<{ rowCount: number | null }> },
  userId: string,
  amount: number,
  label: string,
  ref: string
): Promise<void> {
  const sql = `INSERT INTO bokchae_ledger (user_id, amount, kind, label, ref) VALUES ($1, $2, 'spend', $3, $4) ON CONFLICT (user_id, kind, ref) DO NOTHING`;
  for (let n = 1; n <= 50; n++) {
    const r = await client.query(sql, [userId, amount, label, n === 1 ? ref : `${ref}#${n}`]);
    if ((r.rowCount ?? 0) > 0) return;
  }
  throw new Error(`엽전 장부 기록 실패: 같은 구매가 너무 많아요 (${ref})`);
}

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

/** 이 회원이 이 종류(kind)를 한 번이라도 받았나 */
export async function hasLedgerKind(userId: string, kind: string): Promise<boolean> {
  const pool = await db();
  const r = await pool.query(`SELECT 1 FROM bokchae_ledger WHERE user_id = $1 AND kind = $2 LIMIT 1`, [userId, kind]);
  return (r.rowCount ?? 0) > 0;
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
 *  - 가입 선물 990냥 (2026-10-17, 한 번만) - 앱 전용 고객사는 fromApp 일 때만 (2026-11-01)
 *  - 초대 코드가 있으면(자기 자신 제외) 초대한 사람 990냥 + 초대받은 사람 990냥 (2026-10-17)
 * 초대한 사람의 users 행을 잠가(FOR UPDATE) 동시에 두 명이 가입해도 n번째 계산이 겹치지 않게 한다.
 * 실패해도 가입 자체는 막지 않도록 호출하는 쪽에서 try/catch 한다.
 */
export async function onNewMember(userId: string, refCode: string | undefined, fromApp = false): Promise<void> {
  // 2026-11-01 유샘: 앱 전용 고객사(features.appWelcomeGift)는 앱으로 열었을 때만 - 웹 가입자는 나중에 앱으로 열 때 받는다 (handleYeopjeonSummary)
  if (welcomeAllowed(fromApp)) await grant(userId, WELCOME_GIFT, "welcome", `회원가입 축하 ${CURRENCY_NAME}`);

  const code = refCode?.toUpperCase();
  if (!code || !REF_CODE_RE.test(code)) return;
  const pool = await db();
  const ref = await pool.query<{ id: string }>(`SELECT id FROM users WHERE ref_code = $1 AND NOT is_guest`, [code]);
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
    // 초대받은 사람도 990냥 (한 번만)
    await client.query(
      `INSERT INTO bokchae_ledger (user_id, amount, kind, label, ref) VALUES ($1, $2, 'invited', $3, '')
       ON CONFLICT (user_id, kind, ref) DO NOTHING`,
      [userId, INVITEE_GIFT, `친구 초대로 받은 ${CURRENCY_NAME}`]
    );
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
