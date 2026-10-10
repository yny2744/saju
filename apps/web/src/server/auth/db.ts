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
  // 수정안 3번: 가입 동의(필수/선택 분리). 기존 테이블에도 안전하게 붙도록 ADD COLUMN IF NOT EXISTS.
  await db.query(`
    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS terms_agreed_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS marketing_agreed BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS marketing_agreed_at TIMESTAMPTZ;
  `);
  // 수정안 3번: 저장된 사람(나·가족) - 다음 방문 때 드롭다운으로 불러온다. 회원 탈퇴 시 함께 삭제(CASCADE).
  await db.query(`
    CREATE TABLE IF NOT EXISTS saju_profiles (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      hanja_name TEXT,
      gender TEXT NOT NULL,
      calendar_type TEXT NOT NULL,
      is_leap_month BOOLEAN NOT NULL DEFAULT false,
      birth_date TEXT NOT NULL,
      birth_time TEXT,
      birth_city TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  await db.query(`CREATE INDEX IF NOT EXISTS saju_profiles_user_idx ON saju_profiles(user_id);`);

  // 2026-10-06 상용화 구조: 엽전(선물·보상, 10-08 복채에서 이름 변경) 장부, 친구 초대, 저장된 유료 풀이.
  await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS ref_code TEXT UNIQUE;`);
  // 엽전 장부(테이블 이름은 예전 그대로 bokchae_ledger) - 잔액은 amount 합계. (user_id, kind, ref) 유니크로 같은 보상이 두 번 들어가지 않는다.
  await db.query(`
    CREATE TABLE IF NOT EXISTS bokchae_ledger (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      amount INTEGER NOT NULL,
      kind TEXT NOT NULL,
      label TEXT NOT NULL,
      ref TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE (user_id, kind, ref)
    );
  `);
  await db.query(`CREATE INDEX IF NOT EXISTS bokchae_ledger_user_idx ON bokchae_ledger(user_id, created_at DESC);`);
  // 친구 초대 - 초대받은 사람 한 명당 한 줄(두 번 인정되지 않음)
  await db.query(`
    CREATE TABLE IF NOT EXISTS referrals (
      referred_user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      referrer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      rewarded BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  await db.query(`CREATE INDEX IF NOT EXISTS referrals_referrer_idx ON referrals(referrer_id);`);
  await db.query(`ALTER TABLE referrals ADD COLUMN IF NOT EXISTS nth INTEGER;`);
  // 유료 풀이 저장 - 한 번 쓴 풀이는 다시 AI를 부르지 않고 내 복주머니에서 언제든 다시 본다.
  // source_key: 같은 사람(생년월일시·성별·이름)·같은 관심 분야로 두 번 결제되지 않게 막는 키.
  await db.query(`
    CREATE TABLE IF NOT EXISTS readings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      product TEXT NOT NULL,
      source_key TEXT NOT NULL,
      nickname TEXT NOT NULL,
      focus TEXT,
      header JSONB NOT NULL,
      content JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE (user_id, product, source_key)
    );
  `);
  await db.query(`CREATE INDEX IF NOT EXISTS readings_user_idx ON readings(user_id, created_at DESC);`);

  // 2026-10-08 12가지 운 상품: 사람(풀이 대상) · 주제 열람권 · 주제별 깊은 풀이.
  // persons: 회원이 풀이를 산 사람 한 명(나·가족). 사주 계산 결과를 그대로 보관해 두고, 주제를 누를 때마다 다시 꺼내 쓴다
  //          (무료 결과 토큰은 24시간 뒤 사라지므로). person_key = 생년월일시·성별·이름으로 만든 키 (관심 분야는 제외).
  await db.query(`
    CREATE TABLE IF NOT EXISTS persons (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      person_key TEXT NOT NULL,
      nickname TEXT NOT NULL,
      hanja_name TEXT,
      focus TEXT,
      saju JSONB NOT NULL,
      header JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE (user_id, person_key)
    );
  `);
  await db.query(`CREATE INDEX IF NOT EXISTS persons_user_idx ON persons(user_id, created_at DESC);`);
  await db.query(`ALTER TABLE readings ADD COLUMN IF NOT EXISTS person_id UUID REFERENCES persons(id) ON DELETE CASCADE;`);
  // 주제 열람권 - 깊게 보기·몰아보기·전부 보기로 산 주제. via = deep | bundle3 | bundle12
  await db.query(`
    CREATE TABLE IF NOT EXISTS topic_unlocks (
      person_id UUID NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
      topic TEXT NOT NULL,
      via TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY (person_id, topic)
    );
  `);
  // 운세 보기(990냥, 2026-10-09 수정안 20) - 고른 운세 하나. 사는 순간 줄이 생기고(content 없음), 처음 열 때 풀이를 채운다.
  await db.query(`
    CREATE TABLE IF NOT EXISTS topic_basics (
      person_id UUID NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
      topic TEXT NOT NULL,
      content JSONB,
      model TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY (person_id, topic)
    );
  `);
  // 주제별 깊은 풀이 - 손님이 주제를 처음 누를 때 쓰고 저장(다시 볼 때 AI 재호출 없음)
  await db.query(`
    CREATE TABLE IF NOT EXISTS topic_readings (
      person_id UUID NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
      topic TEXT NOT NULL,
      content JSONB NOT NULL,
      model TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY (person_id, topic)
    );
  `);
  // 2026-10-10 수정안 26: 방문 집계 (무작위 방문 번호만 - 이름·생년월일과 연결하지 않음)
  await db.query(`
    CREATE TABLE IF NOT EXISTS visitors (
      vid TEXT PRIMARY KEY,
      first_day DATE NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  await db.query(`
    CREATE TABLE IF NOT EXISTS site_visits (
      day DATE NOT NULL,
      vid TEXT NOT NULL,
      PRIMARY KEY (day, vid)
    );
  `);
  // 수정안 26: 최근 오류 (관리자 화면에서 보기 - 손님 정보는 담지 않는다)
  await db.query(`
    CREATE TABLE IF NOT EXISTS error_log (
      id BIGSERIAL PRIMARY KEY,
      place TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  // 2026-10-10 수정안 31: 카드·간편결제 주문 - 엽전으로 모자란 만큼만 결제, 승인 즉시 운세가 열린다 (선불 충전 없음)
  await db.query(`
    CREATE TABLE IF NOT EXISTS pay_orders (
      id TEXT PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      person_id UUID NOT NULL,
      mode TEXT NOT NULL,
      topics JSONB NOT NULL,
      price INTEGER NOT NULL,
      use_yeopjeon INTEGER NOT NULL,
      amount INTEGER NOT NULL,
      order_name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      payment_key TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      paid_at TIMESTAMPTZ
    );
  `);
  await db.query(`CREATE INDEX IF NOT EXISTS pay_orders_user_idx ON pay_orders(user_id, created_at DESC);`);
  schemaReady = true;
}

export async function db() {
  await ensureSchema();
  return getPool();
}
