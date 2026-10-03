import { Pool } from "pg";

/**
 * 이 프로젝트 최초의 "영속 저장소"다. 지금까지(Phase 1~10)는 의도적으로
 * 암호화 토큰 + TTL 자동만료 구조만 썼는데(회원 개념 자체가 없었음), 로그인
 * 기능은 "이 이메일로 가입한 사람"을 영구히 기억해야 해서 진짜 DB가 필요하다.
 *
 * DATABASE_URL이 아직 설정 안 된 상태에서도 **빌드는 깨지지 않는다** - Pool은
 * 실제 쿼리를 날릴 때 비로소 연결을 시도하므로, 이 모듈을 import하는 것
 * 자체는 안전하다. 로그인 관련 API를 실제로 호출할 때만 아래 명확한 에러가
 * 난다 (기존 aiEngineProvider.ts가 API 키 없을 때 하던 것과 동일한 패턴).
 */
let pool: Pool | null = null;

function getPool(): Pool {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL 환경변수가 설정되지 않았습니다. 로그인 기능을 쓰려면 Postgres(예: neon.tech)를 연결해야 합니다."
    );
  }
  if (!pool) {
    pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  }
  return pool;
}

let schemaReady = false;

/**
 * 테이블이 없으면 만든다 (IF NOT EXISTS라 몇 번을 호출해도 안전). 별도
 * 마이그레이션 도구 없이, 로그인 관련 API가 처음 호출될 때 자동으로
 * 한 번 실행된다 - 유샘이 DB 콘솔에서 직접 SQL을 실행할 필요가 없게 하려는
 * 의도다. 이미 준비됐으면(schemaReady) 매 요청마다 다시 실행하지 않는다.
 */
async function ensureSchema(): Promise<void> {
  if (schemaReady) return;
  const db = getPool();
  await db.query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email TEXT UNIQUE,
      password_hash TEXT,
      kakao_id TEXT UNIQUE,
      nickname TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  await db.query(`
    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  schemaReady = true;
}

export async function db() {
  await ensureSchema();
  return getPool();
}
