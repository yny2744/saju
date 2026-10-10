import { db } from "@/server/auth/db";

/** 방문 번호: 브라우저가 만든 무작위 값 (영문·숫자·- 만, 8~64자) */
export const VID_RE = /^[A-Za-z0-9-]{8,64}$/;

/** 한국 날짜 (YYYY-MM-DD) */
export function kstDay(now = new Date()): string {
  return new Date(now.getTime() + 9 * 3600 * 1000).toISOString().slice(0, 10);
}

/** 오늘 방문 한 번 기록 (같은 날 같은 번호는 한 번만) */
export async function recordVisit(vid: string, now = new Date()): Promise<void> {
  if (!VID_RE.test(vid)) return;
  const day = kstDay(now);
  const pool = await db();
  await pool.query(`INSERT INTO visitors (vid, first_day) VALUES ($1, $2) ON CONFLICT (vid) DO NOTHING`, [vid, day]);
  await pool.query(`INSERT INTO site_visits (day, vid) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [day, vid]);
}
