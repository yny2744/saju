import { randomBytes } from "crypto";
import type { PoolClient } from "pg";
import { db } from "@/server/auth/db";
import { InsufficientYeopjeonError } from "@/server/yeopjeon/ledger";
import { inTransaction, lockAndBalance } from "@/server/readings/readings";
import { EXAM_DEEP_POINTS, SEASON_INFO, examSeason, examUnlockTopic, type ExamSeason } from "@/lib/suneung";
import { PRICE } from "@/lib/yeopjeon";

/**
 * 수능운 깊게 보기 - 부모님 선물 (2026-10-30 유샘).
 *   수험생(본인 계정)이 "부모님께 선물 부탁하기"를 누르면 선물 링크(토큰)가 생기고, 카카오톡 등으로 보낸다.
 *   부모님은 링크를 열어 본인 계정으로 로그인 → 본인 엽전·카드로 결제 → 수험생의 그 사람(person)에 깊게 보기가 열린다.
 *   미성년자가 결제하지 않고 보호자가 결제하는 구조 (GuardianPayNote 정책과 같음). 링크에는 개인 정보가 없다.
 */

export class GiftError extends Error {
  constructor(readonly code: "NOT_FOUND" | "ALREADY_OWNED", message: string) {
    super(message);
    this.name = "GiftError";
  }
}

export interface ExamGiftView {
  token: string;
  personId: string;
  childUserId: string;
  nickname: string;
  season: ExamSeason;
  title: string;
  points: string[];
  price: number;
  owned: boolean;
  paidByMe: boolean;
}

const TOKEN_RE = /^[A-Za-z0-9_-]{16,64}$/;

async function owned(q: Pick<PoolClient, "query">, personId: string, season: ExamSeason): Promise<boolean> {
  const r = await q.query(`SELECT 1 FROM topic_unlocks WHERE person_id = $1 AND topic = $2`, [personId, examUnlockTopic(season, true)]);
  return (r.rowCount ?? 0) > 0;
}

/** 수험생이 선물 부탁 링크 만들기 (같은 사람·같은 시즌이면 있던 링크를 다시 쓴다) */
export async function createExamGift(childUserId: string, personId: string): Promise<string> {
  const pool = await db();
  const season = examSeason();
  const p = await pool.query(`SELECT 1 FROM persons WHERE id = $1 AND user_id = $2`, [personId, childUserId]);
  if ((p.rowCount ?? 0) === 0) throw new GiftError("NOT_FOUND", "사람을 찾을 수 없어요.");
  if (await owned(pool, personId, season)) throw new GiftError("ALREADY_OWNED", "이미 깊게 보기가 열려 있어요.");
  const have = await pool.query<{ token: string }>(
    `SELECT token FROM exam_gifts WHERE person_id = $1 AND season = $2 AND paid_at IS NULL ORDER BY created_at DESC LIMIT 1`,
    [personId, season]
  );
  if (have.rows[0]) return have.rows[0].token;
  const token = randomBytes(18).toString("base64url");
  await pool.query(`INSERT INTO exam_gifts (token, person_id, child_user_id, season) VALUES ($1, $2, $3, $4)`, [token, personId, childUserId, season]);
  return token;
}

/** 선물 링크 보기 (로그인 없이도 - 이름·상품만) */
export async function getExamGift(token: string, viewerId: string | null): Promise<ExamGiftView | null> {
  if (!TOKEN_RE.test(token)) return null;
  const pool = await db();
  const r = await pool.query<{ token: string; person_id: string; child_user_id: string; season: ExamSeason; paid_by: string | null; nickname: string }>(
    `SELECT g.token, g.person_id, g.child_user_id, g.season, g.paid_by, p.nickname
       FROM exam_gifts g JOIN persons p ON p.id = g.person_id WHERE g.token = $1`,
    [token]
  );
  const g = r.rows[0];
  if (!g) return null;
  return {
    token: g.token,
    personId: g.person_id,
    childUserId: g.child_user_id,
    nickname: g.nickname,
    season: g.season,
    title: SEASON_INFO[g.season].title,
    points: EXAM_DEEP_POINTS[g.season],
    price: PRICE.EXAM_DEEP,
    owned: await owned(pool, g.person_id, g.season),
    paidByMe: !!viewerId && g.paid_by === viewerId,
  };
}

/** 선물 결제 한 건 (이미 열린 트랜잭션 안에서 - 카드 승인 직후에도 이걸 부른다) */
export async function giftWithClient(client: PoolClient, payerId: string, token: string): Promise<void> {
  const g = await client.query<{ person_id: string; season: ExamSeason; nickname: string }>(
    `SELECT g.person_id, g.season, p.nickname FROM exam_gifts g JOIN persons p ON p.id = g.person_id WHERE g.token = $1 FOR UPDATE OF g`,
    [token]
  );
  const gift = g.rows[0];
  if (!gift) throw new GiftError("NOT_FOUND", "선물 링크를 찾을 수 없어요.");
  if (await owned(client, gift.person_id, gift.season)) throw new GiftError("ALREADY_OWNED", "이미 깊게 보기가 열려 있어요.");
  const price = PRICE.EXAM_DEEP;
  const balance = await lockAndBalance(client, payerId);
  if (balance < price) throw new InsufficientYeopjeonError(balance);
  await client.query(`INSERT INTO topic_unlocks (person_id, topic, via) VALUES ($1, $2, 'gift')`, [gift.person_id, examUnlockTopic(gift.season, true)]);
  await client.query(`INSERT INTO bokchae_ledger (user_id, amount, kind, label, ref) VALUES ($1, $2, 'spend', $3, $4)`, [
    payerId,
    -price,
    `[${SEASON_INFO[gift.season].title} 깊게 보기 선물] ${gift.nickname}`,
    `exam_deep_gift:${gift.person_id}:${gift.season}`,
  ]);
  await client.query(`UPDATE exam_gifts SET paid_by = $2, paid_at = now() WHERE token = $1`, [token, payerId]);
}

/** 엽전이 충분할 때 바로 선물 */
export async function giftExamDeep(payerId: string, token: string): Promise<void> {
  if (!TOKEN_RE.test(token)) throw new GiftError("NOT_FOUND", "선물 링크를 찾을 수 없어요.");
  await inTransaction((client) => giftWithClient(client, payerId, token));
}
