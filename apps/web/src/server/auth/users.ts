import bcrypt from "bcryptjs";
import { db } from "./db";

export interface User {
  id: string;
  email: string | null;
  nickname: string;
  kakaoId: string | null;
  /** 필수 동의(이용약관·개인정보 수집·이용·만 14세 이상)를 마쳤는지 */
  termsAgreed: boolean;
  /** 선택 동의: 마케팅·광고 정보 수신 */
  marketingAgreed: boolean;
}

interface UserRow {
  id: string;
  email: string | null;
  nickname: string;
  kakao_id: string | null;
  terms_agreed_at: Date | null;
  marketing_agreed: boolean;
}

const USER_COLUMNS = "id, email, nickname, kakao_id, terms_agreed_at, marketing_agreed";

function toUser(row: UserRow): User {
  return {
    id: row.id,
    email: row.email,
    nickname: row.nickname,
    kakaoId: row.kakao_id,
    termsAgreed: row.terms_agreed_at !== null,
    marketingAgreed: row.marketing_agreed,
  };
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

/** 이메일 가입은 가입 화면에서 동의를 함께 받으므로, 필수 동의 시각을 가입과 동시에 기록한다. */
export async function createUserWithEmail(
  email: string,
  password: string,
  nickname: string,
  marketingAgreed: boolean
): Promise<User> {
  const pool = await db();
  const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
  try {
    const result = await pool.query<UserRow>(
      `INSERT INTO users (email, password_hash, nickname, terms_agreed_at, marketing_agreed, marketing_agreed_at)
       VALUES ($1, $2, $3, now(), $4::boolean, CASE WHEN $4::boolean THEN now() ELSE NULL END)
       RETURNING ${USER_COLUMNS}`,
      [email.toLowerCase(), passwordHash, nickname, marketingAgreed]
    );
    return toUser(result.rows[0]);
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
  const result = await pool.query<UserRow & { password_hash: string | null }>(
    `SELECT ${USER_COLUMNS}, password_hash FROM users WHERE email = $1`,
    [email.toLowerCase()]
  );
  const row = result.rows[0];
  if (!row || !row.password_hash) throw new InvalidCredentialsError();

  const matches = await bcrypt.compare(password, row.password_hash);
  if (!matches) throw new InvalidCredentialsError();

  return toUser(row);
}

/**
 * 카카오 로그인용 - 이미 가입된 카카오 ID면 그대로 반환, 처음이면 새로
 * 만든다 ("upsert"). 카카오 계정엔 비밀번호가 없다(password_hash는 NULL로
 * 남는다 - 이 사람은 이메일/비번으로는 로그인할 수 없고 항상 카카오로만
 * 로그인한다).
 */
export async function findOrCreateKakaoUser(kakaoId: string, nickname: string): Promise<User> {
  const pool = await db();
  const existing = await pool.query<UserRow>(`SELECT ${USER_COLUMNS} FROM users WHERE kakao_id = $1`, [kakaoId]);
  if (existing.rows[0]) return toUser(existing.rows[0]);

  // 처음 온 카카오 사용자는 아직 우리 약관에 동의하지 않은 상태(terms_agreed_at NULL) -
  // 콜백이 /consent 화면으로 보내 동의를 받는다.
  const created = await pool.query<UserRow>(
    `INSERT INTO users (kakao_id, nickname) VALUES ($1, $2) RETURNING ${USER_COLUMNS}`,
    [kakaoId, nickname]
  );
  return toUser(created.rows[0]);
}

export async function getUserById(id: string): Promise<User | null> {
  const pool = await db();
  const result = await pool.query<UserRow>(`SELECT ${USER_COLUMNS} FROM users WHERE id = $1`, [id]);
  const row = result.rows[0];
  return row ? toUser(row) : null;
}

/** 가입 동의 기록 (카카오 첫 로그인 후 /consent 화면). 필수 동의 시각과 선택(마케팅) 동의 여부를 남긴다. */
export async function recordConsent(userId: string, marketingAgreed: boolean): Promise<void> {
  const pool = await db();
  await pool.query(
    `UPDATE users
        SET terms_agreed_at = COALESCE(terms_agreed_at, now()),
            marketing_agreed = $2::boolean,
            marketing_agreed_at = CASE WHEN $2::boolean THEN now() ELSE NULL END
      WHERE id = $1`,
    [userId, marketingAgreed]
  );
}

/** 마케팅 수신 동의/철회 (내 사주함). 철회도 동의만큼 쉽게 할 수 있어야 한다. */
export async function setMarketingAgreed(userId: string, agreed: boolean): Promise<void> {
  const pool = await db();
  await pool.query(
    `UPDATE users SET marketing_agreed = $2::boolean, marketing_agreed_at = CASE WHEN $2::boolean THEN now() ELSE NULL END WHERE id = $1`,
    [userId, agreed]
  );
}
