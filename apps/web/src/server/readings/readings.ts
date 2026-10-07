import { createHash } from "crypto";
import type { SajuJson } from "saju-engine";
import { db } from "@/server/auth/db";
import { InsufficientBokchaeError } from "@/server/bokchae/ledger";
import { SAJU_READING_PRICE } from "@/lib/bokchae";
import type { Focus } from "@/lib/focus";
import type { ReadingContent } from "./generateReading";

/**
 * 저장된 유료 풀이 (2026-10-06). 한 번 쓴 풀이는 DB에 남아 내 사주함에서 언제든 다시 본다(AI 재호출 없음).
 * 복채 차감과 풀이 저장은 한 트랜잭션 - 둘 중 하나만 되는 일이 없다.
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
  product: string;
  nickname: string;
  focus: Focus | null;
  header: ReadingHeader;
  content: ReadingContent;
  createdAt: string;
}

/** 같은 사람·같은 관심 분야면 같은 키 → 두 번 결제되지 않음 */
export function readingSourceKey(saju: SajuJson, nickname: string, focus: Focus | undefined): string {
  const b = saju.birth;
  return createHash("sha256")
    .update([b.calendarType, b.date, b.time ?? "", b.gender, nickname.trim(), focus ?? ""].join("|"))
    .digest("hex")
    .slice(0, 32);
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

interface Row {
  id: string;
  product: string;
  nickname: string;
  focus: string | null;
  header: ReadingHeader;
  content: ReadingContent;
  created_at: Date;
}

function toReading(r: Row): StoredReading {
  return {
    id: r.id,
    product: r.product,
    nickname: r.nickname,
    focus: (r.focus as Focus | null) ?? null,
    header: r.header,
    content: r.content,
    createdAt: r.created_at.toISOString(),
  };
}

export async function findReadingByKey(userId: string, product: string, sourceKey: string): Promise<string | null> {
  const pool = await db();
  const r = await pool.query<{ id: string }>(`SELECT id FROM readings WHERE user_id = $1 AND product = $2 AND source_key = $3`, [
    userId,
    product,
    sourceKey,
  ]);
  return r.rows[0]?.id ?? null;
}

/**
 * 복채 차감 + 풀이 저장 (한 트랜잭션). 잔액이 모자라면 InsufficientBokchaeError.
 * 동시에 두 번 눌러도 users 행 잠금(FOR UPDATE)으로 한 번만 차감된다.
 */
export async function purchaseAndSave(args: {
  userId: string;
  sourceKey: string;
  nickname: string;
  focus: Focus | undefined;
  header: ReadingHeader;
  content: ReadingContent;
  price?: number;
}): Promise<string> {
  const price = args.price ?? SAJU_READING_PRICE;
  const pool = await db();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(`SELECT id FROM users WHERE id = $1 FOR UPDATE`, [args.userId]);
    const existing = await client.query<{ id: string }>(
      `SELECT id FROM readings WHERE user_id = $1 AND product = $2 AND source_key = $3`,
      [args.userId, PRODUCT_SAJU_990, args.sourceKey]
    );
    if (existing.rows[0]) {
      await client.query("ROLLBACK");
      return existing.rows[0].id;
    }
    const bal = await client.query<{ total: string | null }>(`SELECT SUM(amount) AS total FROM bokchae_ledger WHERE user_id = $1`, [
      args.userId,
    ]);
    const balance = Number(bal.rows[0]?.total ?? 0);
    if (balance < price) {
      await client.query("ROLLBACK");
      throw new InsufficientBokchaeError(balance);
    }
    const ins = await client.query<{ id: string }>(
      `INSERT INTO readings (user_id, product, source_key, nickname, focus, header, content)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [args.userId, PRODUCT_SAJU_990, args.sourceKey, args.nickname, args.focus ?? null, JSON.stringify(args.header), JSON.stringify(args.content)]
    );
    const id = ins.rows[0].id;
    await client.query(`INSERT INTO bokchae_ledger (user_id, amount, kind, label, ref) VALUES ($1, $2, 'spend', $3, $4)`, [
      args.userId,
      -price,
      `[사주보기] ${args.nickname}`,
      id,
    ]);
    await client.query("COMMIT");
    return id;
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

export async function getReading(userId: string, id: string): Promise<StoredReading | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const pool = await db();
  const r = await pool.query<Row>(
    `SELECT id, product, nickname, focus, header, content, created_at FROM readings WHERE id = $1 AND user_id = $2`,
    [id, userId]
  );
  return r.rows[0] ? toReading(r.rows[0]) : null;
}

export async function listReadings(userId: string): Promise<Array<Pick<StoredReading, "id" | "nickname" | "focus" | "createdAt" | "product">>> {
  const pool = await db();
  const r = await pool.query<{ id: string; product: string; nickname: string; focus: string | null; created_at: Date }>(
    `SELECT id, product, nickname, focus, created_at FROM readings WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100`,
    [userId]
  );
  return r.rows.map((x) => ({ id: x.id, product: x.product, nickname: x.nickname, focus: (x.focus as Focus | null) ?? null, createdAt: x.created_at.toISOString() }));
}
