import { randomBytes, createHash } from "crypto";
import { db } from "./db";
import { getUserById, type User } from "./users";

export const SESSION_COOKIE_NAME = "ryugyeol_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30일

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * DB엔 토큰 원문이 아니라 해시만 저장한다 - DB가 통째로 유출되어도 그
 * 값만으로는 쿠키를 흉내 낼 수 없게 하려는 최소한의 방어다(브루트포스로
 * 원문을 찾는 건 사실상 불가능할 만큼 토큰 자체가 32바이트 랜덤이라,
 * bcrypt 같은 느린 해시까지는 필요 없고 sha256으로 충분하다).
 */
export async function createSession(userId: string): Promise<{ token: string; expiresAt: Date }> {
  const pool = await db();
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await pool.query(`INSERT INTO sessions (token_hash, user_id, expires_at) VALUES ($1, $2, $3)`, [
    hashToken(token),
    userId,
    expiresAt,
  ]);
  return { token, expiresAt };
}

export async function getUserBySessionToken(token: string | undefined): Promise<User | null> {
  if (!token) return null;
  const pool = await db();
  const result = await pool.query<{ user_id: string }>(
    `SELECT user_id FROM sessions WHERE token_hash = $1 AND expires_at > now()`,
    [hashToken(token)]
  );
  const row = result.rows[0];
  if (!row) return null;
  return getUserById(row.user_id);
}

export async function deleteSession(token: string | undefined): Promise<void> {
  if (!token) return;
  const pool = await db();
  await pool.query(`DELETE FROM sessions WHERE token_hash = $1`, [hashToken(token)]);
}
