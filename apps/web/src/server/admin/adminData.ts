import { randomUUID } from "crypto";
import { db } from "@/server/auth/db";
import { kstDay } from "./visits";

/** 관리자 화면 숫자 (2026-10-10 수정안 26). 날짜는 한국 시간 기준. */
export interface AdminStats {
  today: PeriodStats;
  week: PeriodStats;
  total: { members: number; visitors: number };
  pendingCharges: number;
}
export interface PeriodStats {
  visitors: number;
  newVisitors: number;
  revisits: number;
  signups: number;
  purchases: number;
  spent: number;
  charged: number;
}

async function period(fromDay: string): Promise<PeriodStats> {
  const pool = await db();
  // 한국 날짜 fromDay 00:00 = UTC 전날 15:00
  const since = new Date(`${fromDay}T00:00:00+09:00`);
  const [v, nv, su, sp, ch] = await Promise.all([
    pool.query<{ n: string }>(`SELECT COUNT(DISTINCT vid) AS n FROM site_visits WHERE day >= $1`, [fromDay]),
    pool.query<{ n: string }>(`SELECT COUNT(*) AS n FROM visitors WHERE first_day >= $1`, [fromDay]),
    pool.query<{ n: string }>(`SELECT COUNT(*) AS n FROM users WHERE created_at >= $1`, [since]),
    pool.query<{ n: string; s: string | null }>(
      `SELECT COUNT(*) AS n, SUM(-amount) AS s FROM bokchae_ledger WHERE kind = 'spend' AND created_at >= $1`,
      [since]
    ),
    pool.query<{ s: string | null }>(`SELECT SUM(amount) AS s FROM bokchae_ledger WHERE kind = 'charge' AND created_at >= $1`, [since]),
  ]);
  const visitors = Number(v.rows[0]?.n ?? 0);
  const newVisitors = Number(nv.rows[0]?.n ?? 0);
  return {
    visitors,
    newVisitors,
    revisits: Math.max(0, visitors - newVisitors),
    signups: Number(su.rows[0]?.n ?? 0),
    purchases: Number(sp.rows[0]?.n ?? 0),
    spent: Number(sp.rows[0]?.s ?? 0),
    charged: Number(ch.rows[0]?.s ?? 0),
  };
}

export async function adminStats(now = new Date()): Promise<AdminStats> {
  const today = kstDay(now);
  const weekStart = kstDay(new Date(now.getTime() - 6 * 86400 * 1000));
  const pool = await db();
  const [t, w, m, vis, pc] = await Promise.all([
    period(today),
    period(weekStart),
    pool.query<{ n: string }>(`SELECT COUNT(*) AS n FROM users`),
    pool.query<{ n: string }>(`SELECT COUNT(*) AS n FROM visitors`),
    pool.query<{ n: string }>(`SELECT COUNT(*) AS n FROM charge_requests WHERE status = 'pending'`),
  ]);
  return {
    today: t,
    week: w,
    total: { members: Number(m.rows[0]?.n ?? 0), visitors: Number(vis.rows[0]?.n ?? 0) },
    pendingCharges: Number(pc.rows[0]?.n ?? 0),
  };
}

export interface AdminMember {
  id: string;
  nickname: string;
  login: "kakao" | "email";
  createdAt: string;
  balance: number;
  persons: number;
  marketing: boolean;
}

/** 회원 목록 (최근 가입 순, 이름 검색). 이메일 주소는 화면에 보이지 않게 가입 방식만 알려 준다. */
export async function listMembers(q: string): Promise<AdminMember[]> {
  const pool = await db();
  const term = q.trim().slice(0, 40);
  const r = await pool.query<{ id: string; nickname: string; kakao_id: string | null; created_at: Date; balance: string | null; persons: string; marketing_agreed: boolean }>(
    `SELECT u.id, u.nickname, u.kakao_id, u.created_at, u.marketing_agreed,
            (SELECT SUM(amount) FROM bokchae_ledger l WHERE l.user_id = u.id) AS balance,
            (SELECT COUNT(*) FROM persons p WHERE p.user_id = u.id) AS persons
       FROM users u
      ${term ? "WHERE u.nickname ILIKE $1 OR u.id::text = $2" : ""}
      ORDER BY u.created_at DESC LIMIT 100`,
    term ? [`%${term.replace(/[%_\\]/g, (c) => `\\${c}`)}%`, term] : []
  );
  return r.rows.map((x) => ({
    id: x.id,
    nickname: x.nickname,
    login: x.kakao_id ? "kakao" : "email",
    createdAt: x.created_at.toISOString(),
    balance: Number(x.balance ?? 0),
    persons: Number(x.persons),
    marketing: x.marketing_agreed,
  }));
}

export async function memberLedger(userId: string): Promise<Array<{ amount: number; kind: string; label: string; createdAt: string }>> {
  const pool = await db();
  const r = await pool.query<{ amount: number; kind: string; label: string; created_at: Date }>(
    `SELECT amount, kind, label, created_at FROM bokchae_ledger WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100`,
    [userId]
  );
  return r.rows.map((x) => ({ amount: x.amount, kind: x.kind, label: x.label, createdAt: x.created_at.toISOString() }));
}

export const GRANT_LIMIT = 1_000_000;

/** 관리자 엽전 지급(+) / 회수(-). 지금까지 SQL로 넣던 것을 화면에서. */
export async function adminGrant(userId: string, amount: unknown, reason: unknown): Promise<boolean> {
  if (typeof amount !== "number" || !Number.isInteger(amount) || amount === 0 || Math.abs(amount) > GRANT_LIMIT) return false;
  const why = typeof reason === "string" && reason.trim() ? reason.trim().slice(0, 60) : amount > 0 ? "관리자 지급" : "관리자 회수";
  const pool = await db();
  const u = await pool.query(`SELECT 1 FROM users WHERE id = $1`, [userId]);
  if ((u.rowCount ?? 0) === 0) return false;
  await pool.query(`INSERT INTO bokchae_ledger (user_id, amount, kind, label, ref) VALUES ($1, $2, 'admin', $3, $4)`, [userId, amount, why, randomUUID()]);
  return true;
}

export async function recentErrors(): Promise<Array<{ place: string; message: string; createdAt: string }>> {
  const pool = await db();
  const r = await pool.query<{ place: string; message: string; created_at: Date }>(`SELECT place, message, created_at FROM error_log ORDER BY id DESC LIMIT 50`);
  return r.rows.map((x) => ({ place: x.place, message: x.message, createdAt: x.created_at.toISOString() }));
}
