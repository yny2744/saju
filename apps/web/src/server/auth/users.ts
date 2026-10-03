import bcrypt from "bcryptjs";
import { db } from "./db";

export interface User {
  id: string;
  email: string | null;
  nickname: string;
  kakaoId: string | null;
}

const BCRYPT_COST = 10;

export class EmailAlreadyUsedError extends Error {
  constructor() {
    super("이미 가입된 이메일입니다.");
    this.name = "EmailAlreadyUsedError";
  }
}

export class InvalidCredentialsError extends Error {
  constructor() {
    super("이메일 또는 비밀번호가 올바르지 않습니다.");
    this.name = "InvalidCredentialsError";
  }
}

/**
 * 이메일 형식 검증 - 정규식을 엄격하게 짜지 않는다(RFC 5322 전체 구현은
 * 과도함). "@ 양쪽에 뭔가 있고, 점이 하나 이상 있다" 수준의 느슨한 검증만
 * 하고, 실제 유효성은 어차피 가입 확인 메일(추후 단계)에서 걸러진다.
 */
export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function isValidPassword(value: string): boolean {
  return value.length >= 8 && value.length <= 72; // bcrypt는 72바이트까지만 실제로 사용한다
}

export async function createUserWithEmail(email: string, password: string, nickname: string): Promise<User> {
  const pool = await db();
  const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
  try {
    const result = await pool.query<{ id: string; email: string; nickname: string }>(
      `INSERT INTO users (email, password_hash, nickname) VALUES ($1, $2, $3)
       RETURNING id, email, nickname`,
      [email.toLowerCase(), passwordHash, nickname]
    );
    const row = result.rows[0];
    return { id: row.id, email: row.email, nickname: row.nickname, kakaoId: null };
  } catch (err) {
    // Postgres unique_violation
    if (err && typeof err === "object" && "code" in err && (err as { code: string }).code === "23505") {
      throw new EmailAlreadyUsedError();
    }
    throw err;
  }
}

export async function verifyEmailLogin(email: string, password: string): Promise<User> {
  const pool = await db();
  const result = await pool.query<{ id: string; email: string; nickname: string; password_hash: string | null }>(
    `SELECT id, email, nickname, password_hash FROM users WHERE email = $1`,
    [email.toLowerCase()]
  );
  const row = result.rows[0];
  if (!row || !row.password_hash) throw new InvalidCredentialsError();

  const matches = await bcrypt.compare(password, row.password_hash);
  if (!matches) throw new InvalidCredentialsError();

  return { id: row.id, email: row.email, nickname: row.nickname, kakaoId: null };
}

/**
 * 카카오 로그인용 - 이미 가입된 카카오 ID면 그대로 반환, 처음이면 새로
 * 만든다 ("upsert"). 카카오 계정엔 비밀번호가 없다(password_hash는 NULL로
 * 남는다 - 이 사람은 이메일/비번으로는 로그인할 수 없고 항상 카카오로만
 * 로그인한다).
 */
export async function findOrCreateKakaoUser(kakaoId: string, nickname: string): Promise<User> {
  const pool = await db();
  const existing = await pool.query<{ id: string; email: string | null; nickname: string }>(
    `SELECT id, email, nickname FROM users WHERE kakao_id = $1`,
    [kakaoId]
  );
  if (existing.rows[0]) {
    const row = existing.rows[0];
    return { id: row.id, email: row.email, nickname: row.nickname, kakaoId };
  }

  const created = await pool.query<{ id: string; email: string | null; nickname: string }>(
    `INSERT INTO users (kakao_id, nickname) VALUES ($1, $2) RETURNING id, email, nickname`,
    [kakaoId, nickname]
  );
  const row = created.rows[0];
  return { id: row.id, email: row.email, nickname: row.nickname, kakaoId };
}

export async function getUserById(id: string): Promise<User | null> {
  const pool = await db();
  const result = await pool.query<{ id: string; email: string | null; nickname: string; kakao_id: string | null }>(
    `SELECT id, email, nickname, kakao_id FROM users WHERE id = $1`,
    [id]
  );
  const row = result.rows[0];
  if (!row) return null;
  return { id: row.id, email: row.email, nickname: row.nickname, kakaoId: row.kakao_id };
}
