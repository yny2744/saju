import { db } from "@/server/auth/db";

/** 오류를 DB에도 남긴다 (관리자 화면 "최근 오류"). 실패해도 조용히 넘어간다. DB 설정이 없으면 하지 않는다. */
export function logErrorToDb(place: string, message: string): void {
  if (!process.env.DATABASE_URL) return;
  db()
    .then((pool) => pool.query(`INSERT INTO error_log (place, message) VALUES ($1, $2)`, [place.slice(0, 200), message.slice(0, 900)]))
    .catch(() => {});
}
