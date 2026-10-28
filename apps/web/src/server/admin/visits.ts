import { db } from "@/server/auth/db";

/** 방문 번호: 브라우저가 만든 무작위 값 (영문·숫자·- 만, 8~64자) */
export const VID_RE = /^[A-Za-z0-9-]{8,64}$/;

/** 한국 날짜 (YYYY-MM-DD) */
export function kstDay(now = new Date()): string {
  return new Date(now.getTime() + 9 * 3600 * 1000).toISOString().slice(0, 10);
}

/** 오늘 방문 한 번 기록 (같은 날 같은 번호는 한 번만) */
export async function recordVisit(vid: string, now = new Date(), src: string | null = null): Promise<void> {
  if (!VID_RE.test(vid)) return;
  const day = kstDay(now);
  const pool = await db();
  await pool.query(`INSERT INTO visitors (vid, first_day) VALUES ($1, $2) ON CONFLICT (vid) DO NOTHING`, [vid, day]);
  await pool.query(`INSERT INTO site_visits (day, vid) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [day, vid]);
  // 2026-10-28 유입 경로 (광고 꼬리표가 있는 방문만)
  if (src) await pool.query(`INSERT INTO visit_sources (day, vid, src) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`, [day, vid, src]);
}

export interface SourceRow {
  src: string | null;
  visitors: number;
  orders: number;
  revenue: number;
}

/** 최근 30일 유입 경로별 방문자·결제 (관리자 화면) - 결제는 카드·계좌로 실제 낸 금액만 */
export async function sourceReport(now = new Date()): Promise<SourceRow[]> {
  const pool = await db();
  const since = kstDay(new Date(now.getTime() - 29 * 24 * 3600 * 1000));
  const [v, o] = await Promise.all([
    pool.query<{ src: string; n: string }>(`SELECT src, COUNT(DISTINCT vid) AS n FROM visit_sources WHERE day >= $1 GROUP BY src`, [since]),
    pool.query<{ src: string | null; n: string; amt: string | null }>(
      `SELECT src, COUNT(*) AS n, SUM(amount) AS amt FROM pay_orders WHERE status IN ('paid', 'paid_credit') AND paid_at >= now() - interval '30 days' GROUP BY src`
    ),
  ]);
  const rows = new Map<string, SourceRow>();
  const row = (src: string | null) => {
    const k = src ?? "";
    if (!rows.has(k)) rows.set(k, { src, visitors: 0, orders: 0, revenue: 0 });
    return rows.get(k)!;
  };
  for (const r of v.rows) row(r.src).visitors = Number(r.n);
  for (const r of o.rows) {
    const x = row(r.src);
    x.orders = Number(r.n);
    x.revenue = Number(r.amt ?? 0);
  }
  return [...rows.values()].sort((a, b) => b.revenue - a.revenue || b.visitors - a.visitors);
}
