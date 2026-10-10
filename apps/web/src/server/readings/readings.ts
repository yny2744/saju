import { createHash } from "crypto";
import type { PoolClient } from "pg";
import type { SajuJson } from "saju-engine";
import { db } from "@/server/auth/db";
import { InsufficientYeopjeonError } from "@/server/yeopjeon/ledger";
import { PRICE } from "@/lib/yeopjeon";
import { isFocus, type Focus } from "@/lib/focus";
import { EXTRA_KEYS, TOPICS, TOPIC_KEYS, isAnyTopicKey, isTopicKey, type AnyTopicKey, type TopicKey } from "@/lib/topics";
import type { BasicContent, DeepContent, ReadingContent } from "./generateReading";

/**
 * 유료 풀이 저장소 (2026-10-06 맛보기, 2026-10-08 12가지 운 구조로 확장).
 *
 *  - persons: 풀이를 산 사람(나·가족). 사주 계산 결과를 보관 → 주제를 누를 때마다 다시 꺼내 쓴다.
 *  - readings: (예전) 맛보기. 2026-10-09부터 팔지 않고, 이미 산 것을 다시 보는 데만 쓴다.
 *  - topic_basics: 운세 보기(990냥) - 고른 운세 하나. 처음 열 때 풀이를 쓰고 저장.
 *  - topic_unlocks: 깊게 보기(4,900)·몰아보기(9,900)·전부 보기(29,500)로 연 주제.
 *  - topic_readings: 주제별 깊은 풀이 (처음 누를 때 쓰고 저장).
 *
 * 엽전 차감과 저장은 늘 한 트랜잭션이고, 회원 행을 잠가(FOR UPDATE) 두 번 눌러도 한 번만 차감된다.
 */

export const PRODUCT_SAJU_990 = "SAJU_990";

export interface ReadingHeader {
  nickname: string;
  hanjaName?: string;
  pillars: Array<{ label: string; ganzhi: string | null }>;
  birth: string;
}

export interface StoredReading {
  id: string;
  personId: string | null;
  product: string;
  nickname: string;
  focus: Focus | null;
  header: ReadingHeader;
  content: ReadingContent;
  createdAt: string;
}

export interface PersonSummary {
  id: string;
  nickname: string;
  header: ReadingHeader;
  focus: Focus | null;
  /** 깊게 보기가 열린 운세 (깊게 보기·몰아보기·전부 보기) */
  unlocked: AnyTopicKey[];
  /** 운세 보기(990)로 본 운세 */
  basics: TopicKey[];
  tasteReadingId: string | null;
  createdAt: string;
}

export type PurchaseMode = "basic" | "deep" | "bundle3" | "bundle12";

export class PurchaseError extends Error {
  constructor(readonly code: "INVALID_TOPICS" | "ALREADY_OWNED" | "NOT_FOUND", message: string) {
    super(message);
    this.name = "PurchaseError";
  }
}

// ───────────────────────── 키·머리말 ─────────────────────────

function hashKey(parts: string[]): string {
  return createHash("sha256").update(parts.join("|")).digest("hex").slice(0, 32);
}

/** 같은 사람 = 같은 키 (관심 분야 제외) */
export function personKey(saju: SajuJson, nickname: string): string {
  const b = saju.birth;
  return hashKey([b.calendarType, b.date, b.time ?? "", b.gender, nickname.trim()]);
}

/** 맛보기 중복 차감 방지 키 = 같은 사람 + 같은 관심 분야 */
export function readingSourceKey(saju: SajuJson, nickname: string, focus: Focus | undefined): string {
  const b = saju.birth;
  return hashKey([b.calendarType, b.date, b.time ?? "", b.gender, nickname.trim(), focus ?? ""]);
}

export function readingHeader(saju: SajuJson, nickname: string, hanjaName?: string): ReadingHeader {
  const p = saju.pillars;
  const b = saju.birth;
  return {
    nickname,
    hanjaName,
    pillars: [
      { label: "시주", ganzhi: p.hour?.ganzhi ?? null },
      { label: "일주", ganzhi: p.day.ganzhi },
      { label: "월주", ganzhi: p.month.ganzhi },
      { label: "년주", ganzhi: p.year.ganzhi },
    ],
    birth: `${b.calendarType === "lunar" ? "음력" : "양력"} ${b.date}${b.time ? ` ${b.time}` : " (시간 모름)"} · ${b.gender === "male" ? "남" : "여"}`,
  };
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ───────────────────────── 사람 ─────────────────────────

/** 사람 저장(있으면 그대로) → id. 결제 없이 만들어진다(풀이를 사기 전 "누구의 풀이인지"만 정함). */
export async function upsertPerson(
  q: Pick<PoolClient, "query">,
  args: { userId: string; saju: SajuJson; nickname: string; hanjaName?: string; focus?: Focus }
): Promise<string> {
  const key = personKey(args.saju, args.nickname);
  const header = readingHeader(args.saju, args.nickname, args.hanjaName);
  const r = await q.query<{ id: string }>(
    `INSERT INTO persons (user_id, person_key, nickname, hanja_name, focus, saju, header)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (user_id, person_key) DO UPDATE
       SET hanja_name = COALESCE(EXCLUDED.hanja_name, persons.hanja_name),
           focus = COALESCE(EXCLUDED.focus, persons.focus)
     RETURNING id`,
    [args.userId, key, args.nickname, args.hanjaName ?? null, args.focus ?? null, JSON.stringify(args.saju), JSON.stringify(header)]
  );
  return r.rows[0].id;
}

export async function createPerson(args: { userId: string; saju: SajuJson; nickname: string; hanjaName?: string; focus?: Focus }): Promise<string> {
  const pool = await db();
  return upsertPerson(pool, args);
}

interface PersonRow {
  id: string;
  user_id: string;
  nickname: string;
  hanja_name: string | null;
  focus: string | null;
  saju: SajuJson;
  header: ReadingHeader;
  created_at: Date;
}

export async function getPersonRow(userId: string, personId: string): Promise<PersonRow | null> {
  if (!UUID_RE.test(personId)) return null;
  const pool = await db();
  const r = await pool.query<PersonRow>(
    `SELECT id, user_id, nickname, hanja_name, focus, saju, header, created_at FROM persons WHERE id = $1 AND user_id = $2`,
    [personId, userId]
  );
  return r.rows[0] ?? null;
}

export async function getPersonSummary(userId: string, personId: string): Promise<PersonSummary | null> {
  const row = await getPersonRow(userId, personId);
  if (!row) return null;
  const pool = await db();
  const [unlocks, basics, taste] = await Promise.all([
    pool.query<{ topic: string }>(`SELECT topic FROM topic_unlocks WHERE person_id = $1`, [personId]),
    pool.query<{ topic: string }>(`SELECT topic FROM topic_basics WHERE person_id = $1`, [personId]),
    pool.query<{ id: string }>(`SELECT id FROM readings WHERE person_id = $1 ORDER BY created_at DESC LIMIT 1`, [personId]),
  ]);
  return {
    id: row.id,
    nickname: row.nickname,
    header: row.header,
    focus: isFocus(row.focus) ? row.focus : null,
    unlocked: unlocks.rows.map((u) => u.topic).filter(isAnyTopicKey),
    basics: basics.rows.map((u) => u.topic).filter(isTopicKey),
    tasteReadingId: taste.rows[0]?.id ?? null,
    createdAt: row.created_at.toISOString(),
  };
}

export async function listPersons(
  userId: string
): Promise<Array<{ id: string; nickname: string; birth: string; unlockedCount: number; basicCount: number; hasTaste: boolean; createdAt: string }>> {
  const pool = await db();
  const r = await pool.query<{ id: string; nickname: string; header: ReadingHeader; unlocked: string; basics: string; tastes: string; created_at: Date }>(
    `SELECT p.id, p.nickname, p.header, p.created_at,
            (SELECT COUNT(*) FROM topic_unlocks u WHERE u.person_id = p.id AND u.topic = ANY($2)) AS unlocked,
            (SELECT COUNT(*) FROM topic_basics b WHERE b.person_id = p.id) AS basics,
            (SELECT COUNT(*) FROM readings r WHERE r.person_id = p.id) AS tastes
       FROM persons p WHERE p.user_id = $1 ORDER BY p.created_at DESC LIMIT 100`,
    [userId, TOPIC_KEYS as unknown as string[]]
  );
  return r.rows.map((x) => ({
    id: x.id,
    nickname: x.nickname,
    birth: x.header.birth,
    unlockedCount: Number(x.unlocked),
    basicCount: Number(x.basics),
    hasTaste: Number(x.tastes) > 0,
    createdAt: x.created_at.toISOString(),
  }));
}

// ───────────────────────── 공통: 잠금 + 잔액 ─────────────────────────

async function lockAndBalance(client: PoolClient, userId: string): Promise<number> {
  await client.query(`SELECT id FROM users WHERE id = $1 FOR UPDATE`, [userId]);
  const bal = await client.query<{ total: string | null }>(`SELECT SUM(amount) AS total FROM bokchae_ledger WHERE user_id = $1`, [userId]);
  return Number(bal.rows[0]?.total ?? 0);
}

async function inTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const pool = await db();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const out = await fn(client);
    await client.query("COMMIT");
    return out;
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

// ───────────────────────── 맛보기 ─────────────────────────

export async function findReadingByKey(userId: string, sourceKey: string): Promise<{ id: string; personId: string | null } | null> {
  const pool = await db();
  const r = await pool.query<{ id: string; person_id: string | null }>(
    `SELECT id, person_id FROM readings WHERE user_id = $1 AND product = $2 AND source_key = $3`,
    [userId, PRODUCT_SAJU_990, sourceKey]
  );
  return r.rows[0] ? { id: r.rows[0].id, personId: r.rows[0].person_id } : null;
}

/** 맛보기: 사람 저장 + 엽전 차감 + 풀이 저장 (한 트랜잭션). 이미 산 것이면 그대로 돌려준다. */
export async function purchaseTaste(args: {
  userId: string;
  saju: SajuJson;
  nickname: string;
  hanjaName?: string;
  focus: Focus | undefined;
  content: ReadingContent;
}): Promise<{ id: string; personId: string }> {
  const sourceKey = readingSourceKey(args.saju, args.nickname, args.focus);
  return inTransaction(async (client) => {
    const balance = await lockAndBalance(client, args.userId);
    const personId = await upsertPerson(client, args);
    const existing = await client.query<{ id: string }>(
      `SELECT id FROM readings WHERE user_id = $1 AND product = $2 AND source_key = $3`,
      [args.userId, PRODUCT_SAJU_990, sourceKey]
    );
    if (existing.rows[0]) return { id: existing.rows[0].id, personId };
    if (balance < PRICE.TASTE) throw new InsufficientYeopjeonError(balance);
    const header = readingHeader(args.saju, args.nickname, args.hanjaName);
    const ins = await client.query<{ id: string }>(
      `INSERT INTO readings (user_id, product, source_key, nickname, focus, header, content, person_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [args.userId, PRODUCT_SAJU_990, sourceKey, args.nickname, args.focus ?? null, JSON.stringify(header), JSON.stringify(args.content), personId]
    );
    const id = ins.rows[0].id;
    await client.query(`INSERT INTO bokchae_ledger (user_id, amount, kind, label, ref) VALUES ($1, $2, 'spend', $3, $4)`, [
      args.userId,
      -PRICE.TASTE,
      `[맛보기] ${args.nickname}`,
      id,
    ]);
    return { id, personId };
  });
}

interface ReadingRow {
  id: string;
  person_id: string | null;
  product: string;
  nickname: string;
  focus: string | null;
  header: ReadingHeader;
  content: ReadingContent;
  created_at: Date;
}

export async function getReading(userId: string, id: string): Promise<StoredReading | null> {
  if (!UUID_RE.test(id)) return null;
  const pool = await db();
  const r = await pool.query<ReadingRow>(
    `SELECT id, person_id, product, nickname, focus, header, content, created_at FROM readings WHERE id = $1 AND user_id = $2`,
    [id, userId]
  );
  const row = r.rows[0];
  if (!row) return null;
  return {
    id: row.id,
    personId: row.person_id,
    product: row.product,
    nickname: row.nickname,
    focus: isFocus(row.focus) ? row.focus : null,
    header: row.header,
    content: row.content,
    createdAt: row.created_at.toISOString(),
  };
}

// ───────────────────────── 깊게 보기 · 몰아보기 · 전부 보기 ─────────────────────────

/**
 * 구매하려는 주제를 검사하고 열 주제 목록·가격을 정한다 (순수 함수 - 시험 가능).
 *  - basic: 운세 보기(990) - 12가지 중 하나, 아직 깊게 보기가 안 열린 것 (이미 본 운세인지는 저장소에서 따로 확인)
 *  - deep: 아직 안 연 주제 1개
 *  - bundle3: 아직 안 연 서로 다른 주제 3개
 *  - bundle12: 12가지 + 월별 운세·개운법 중 아직 안 연 것 전부 (이미 연 것이 있어도 가격은 같음 - 화면에서 안내)
 */
export function planPurchase(mode: PurchaseMode, requested: unknown, owned: AnyTopicKey[]): { topics: AnyTopicKey[]; price: number } {
  const ownedSet = new Set(owned);
  if (mode === "bundle12") {
    const all: AnyTopicKey[] = [...TOPIC_KEYS, ...EXTRA_KEYS];
    const topics = all.filter((t) => !ownedSet.has(t));
    if (topics.length === 0) throw new PurchaseError("ALREADY_OWNED", "이미 모든 운세가 열려 있어요.");
    return { topics, price: PRICE.BUNDLE12 };
  }
  const list = Array.isArray(requested) ? requested : [];
  const need = mode === "bundle3" ? 3 : 1;
  const uniq = [...new Set(list)];
  if (uniq.length !== need || !uniq.every(isTopicKey)) {
    throw new PurchaseError("INVALID_TOPICS", need === 1 ? "볼 운세를 하나 골라 주세요." : "서로 다른 운세 3가지를 골라 주세요.");
  }
  const topics = uniq as TopicKey[];
  if (mode === "basic") {
    if (ownedSet.has(topics[0])) throw new PurchaseError("ALREADY_OWNED", "이미 깊게 보기가 열린 운세예요.");
    return { topics, price: PRICE.BASIC };
  }
  if (topics.some((t) => ownedSet.has(t))) throw new PurchaseError("ALREADY_OWNED", "이미 열린 운세가 들어 있어요. 다른 운세를 골라 주세요.");
  return { topics, price: mode === "deep" ? PRICE.DEEP : PRICE.BUNDLE3 };
}

const MODE_LABEL: Record<PurchaseMode, string> = { basic: "운세 보기", deep: "깊게 보기", bundle3: "몰아보기", bundle12: "전부 보기" };

export async function purchaseTopics(args: { userId: string; personId: string; mode: PurchaseMode; topics: unknown }): Promise<AnyTopicKey[]> {
  if (!UUID_RE.test(args.personId)) throw new PurchaseError("NOT_FOUND", "풀이 대상을 찾을 수 없어요.");
  return inTransaction((client) => purchaseWithClient(client, args));
}

/** 구매 한 건 (이미 열린 트랜잭션 안에서). 카드 결제 승인 직후에도 같은 트랜잭션에서 이걸 부른다. */
export async function purchaseWithClient(
  client: PoolClient,
  args: { userId: string; personId: string; mode: PurchaseMode; topics: unknown }
): Promise<AnyTopicKey[]> {
  const balance = await lockAndBalance(client, args.userId);
  const plan = await planForPerson(client, args);
  if (balance < plan.price) throw new InsufficientYeopjeonError(balance);
  for (const t of plan.topics) {
    if (args.mode === "basic") {
      await client.query(`INSERT INTO topic_basics (person_id, topic) VALUES ($1, $2)`, [args.personId, t]);
    } else {
      await client.query(`INSERT INTO topic_unlocks (person_id, topic, via) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`, [args.personId, t, args.mode]);
    }
  }
  const names = args.mode === "bundle12" ? "" : ` · ${plan.topics.map((t) => TOPICS[t].title).join(", ")}`;
  const ref = `${args.mode}:${args.personId}:${[...plan.topics].sort().join(",")}`;
  await client.query(`INSERT INTO bokchae_ledger (user_id, amount, kind, label, ref) VALUES ($1, $2, 'spend', $3, $4)`, [
    args.userId,
    -plan.price,
    `[${MODE_LABEL[args.mode]}] ${plan.nickname}${names}`,
    ref,
  ]);
  return plan.topics;
}

/** 이 사람에게 이 상품을 팔 수 있는지 확인하고 열 주제·가격을 정한다 (차감은 하지 않음) */
export async function planForPerson(
  q: Pick<PoolClient, "query">,
  args: { userId: string; personId: string; mode: PurchaseMode; topics: unknown }
): Promise<{ topics: AnyTopicKey[]; price: number; nickname: string }> {
  if (!UUID_RE.test(args.personId)) throw new PurchaseError("NOT_FOUND", "풀이 대상을 찾을 수 없어요.");
  const person = await q.query<{ nickname: string }>(`SELECT nickname FROM persons WHERE id = $1 AND user_id = $2`, [args.personId, args.userId]);
  if (!person.rows[0]) throw new PurchaseError("NOT_FOUND", "풀이 대상을 찾을 수 없어요.");
  const owned = await q.query<{ topic: string }>(`SELECT topic FROM topic_unlocks WHERE person_id = $1`, [args.personId]);
  const plan = planPurchase(args.mode, args.topics, owned.rows.map((r) => r.topic).filter(isAnyTopicKey));
  if (args.mode === "basic") {
    const seen = await q.query(`SELECT 1 FROM topic_basics WHERE person_id = $1 AND topic = $2`, [args.personId, plan.topics[0]]);
    if ((seen.rowCount ?? 0) > 0) throw new PurchaseError("ALREADY_OWNED", "이미 본 운세예요. 다시 열어도 엽전은 빠지지 않아요.");
  }
  return { ...plan, nickname: person.rows[0].nickname };
}

/** 결제 창에 쓰는 상품 이름: "재물 운세 보기" / "재물 깊게 보기" / "3가지 운세 몰아보기" / "12가지 운세 전부 보기" */
export function productName(mode: PurchaseMode, topics: AnyTopicKey[]): string {
  if (mode === "basic") return `${TOPICS[topics[0]].title} 운세 보기`;
  if (mode === "deep") return `${TOPICS[topics[0]].title} 깊게 보기`;
  if (mode === "bundle3") return "3가지 운세 몰아보기";
  return "12가지 운세 전부 보기";
}

export { inTransaction };

export async function isUnlocked(personId: string, topic: AnyTopicKey): Promise<boolean> {
  const pool = await db();
  const r = await pool.query(`SELECT 1 FROM topic_unlocks WHERE person_id = $1 AND topic = $2`, [personId, topic]);
  return (r.rowCount ?? 0) > 0;
}

export async function getTopicReading(personId: string, topic: AnyTopicKey): Promise<DeepContent | null> {
  const pool = await db();
  const r = await pool.query<{ content: DeepContent }>(`SELECT content FROM topic_readings WHERE person_id = $1 AND topic = $2`, [personId, topic]);
  return r.rows[0]?.content ?? null;
}

/** 저장 (먼저 저장된 것이 있으면 그것을 돌려준다 - 두 번 눌러 동시에 써진 경우) */
export async function saveTopicReading(personId: string, topic: AnyTopicKey, content: DeepContent): Promise<DeepContent> {
  const pool = await db();
  await pool.query(
    `INSERT INTO topic_readings (person_id, topic, content, model) VALUES ($1, $2, $3, $4) ON CONFLICT (person_id, topic) DO NOTHING`,
    [personId, topic, JSON.stringify(content), content.model]
  );
  return (await getTopicReading(personId, topic)) ?? content;
}

// ───────────────────────── 운세 보기 (990) ─────────────────────────

/** 운세 보기를 샀는지 + 저장된 풀이 (아직 안 썼으면 content null) */
export async function getTopicBasic(personId: string, topic: TopicKey): Promise<{ owned: boolean; content: BasicContent | null }> {
  const pool = await db();
  const r = await pool.query<{ content: BasicContent | null }>(`SELECT content FROM topic_basics WHERE person_id = $1 AND topic = $2`, [personId, topic]);
  if (!r.rows[0]) return { owned: false, content: null };
  return { owned: true, content: r.rows[0].content };
}

/** 풀이 채우기 (먼저 채워진 것이 있으면 그것을 돌려준다) */
export async function saveTopicBasic(personId: string, topic: TopicKey, content: BasicContent): Promise<BasicContent> {
  const pool = await db();
  await pool.query(`UPDATE topic_basics SET content = $3, model = $4 WHERE person_id = $1 AND topic = $2 AND content IS NULL`, [
    personId,
    topic,
    JSON.stringify(content),
    content.model,
  ]);
  return (await getTopicBasic(personId, topic)).content ?? content;
}

/** 12가지 + 전부 보기 전용 풀이까지 모두 열렸는지 (= 전부 보기 손님) - 배경음 장면용 */
export async function isAllUnlocked(personId: string): Promise<boolean> {
  const pool = await db();
  const r = await pool.query<{ n: string }>(`SELECT COUNT(*) AS n FROM topic_unlocks WHERE person_id = $1 AND topic = ANY($2)`, [
    personId,
    [...TOPIC_KEYS, ...EXTRA_KEYS] as unknown as string[],
  ]);
  return Number(r.rows[0]?.n ?? 0) >= TOPIC_KEYS.length + EXTRA_KEYS.length;
}
