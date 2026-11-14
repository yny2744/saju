import { isOnSale } from "@/lib/sale";
import { randomBytes } from "crypto";
import type { PoolClient } from "pg";
import { db } from "@/server/auth/db";
import { InsufficientYeopjeonError, insertSpend } from "@/server/yeopjeon/ledger";
import { EXAM_MODE_NAME, examModePrice, inTransaction, lockAndBalance, type ExamMode } from "@/server/readings/readings";
import { EXAM_DEEP_POINTS, SEASON_INFO, examModeTopics, examSaleOpen, examSeason, type ExamSeason } from "@/lib/suneung";
import { EXAM_EXTRA_KINDS, EXAM_EXTRA_SUB, isExamExtraKind } from "@/lib/examProductsView";

/**
 * 수능대박운 보호자(지인) 결제 부탁 (2026-10-30 유샘, 2026-11-14 유샘: 심층분석 2~4·네 가지 모두 보기까지).
 *   수험생(본인 계정)이 [보호자(지인)께 결제 부탁하기]를 누르면 그 상품 전용 링크(토큰)가 생기고, 카카오톡 등으로 보낸다.
 *   받은 사람은 링크를 열어 본인 계정으로 로그인 → 본인 엽전·카드로 결제 → 수험생의 그 사람(person)에 그 상품이 열린다.
 *   미성년자가 결제하지 않고 성인이 결제하는 구조 (GuardianPayNote 정책과 같음). 링크에는 생년월일 등 개인 정보가 없다.
 *   열람 표시는 via = 'gift:<토큰>' - 환불하면 그 링크가 연 풀이만 다시 잠근다 (예전 링크는 via = 'gift').
 */

/** 부탁 링크로 팔 수 있는 상품 */
export const GIFT_MODES = ["exam_deep", "exam_goal", "exam_focus", "exam_calm", "exam_all"] as const;
export type GiftMode = (typeof GIFT_MODES)[number];
export function isGiftMode(v: unknown): v is GiftMode {
  return typeof v === "string" && (GIFT_MODES as readonly string[]).includes(v);
}
export const giftVia = (token: string) => `gift:${token}`;

/** 상품 이름 (받는 사람 화면·카톡 미리보기) */
export function giftProductTitle(season: ExamSeason, mode: GiftMode): string {
  return `${SEASON_INFO[season].title} ${mode === "exam_deep" ? "심층분석" : EXAM_MODE_NAME[mode as ExamMode]}`;
}
function giftPoints(season: ExamSeason, mode: GiftMode): string[] {
  if (mode === "exam_deep") return EXAM_DEEP_POINTS[season];
  if (mode === "exam_all") return ["수능대박운 심층분석", ...EXAM_EXTRA_KINDS.map((k) => EXAM_MODE_NAME[`exam_${k}` as ExamMode])];
  const k = mode.replace(/^exam_/, "");
  return isExamExtraKind(k) ? EXAM_EXTRA_SUB[k] : [];
}

export class GiftError extends Error {
  constructor(readonly code: "NOT_FOUND" | "ALREADY_OWNED" | "SALE_ENDED", message: string) {
    super(message);
    this.name = "GiftError";
  }
}

export interface ExamGiftView {
  token: string;
  mode: GiftMode;
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

/** 그 상품을 이미 열었는지 - 하나라도 열렸으면 다시 팔지 않는다 (네 가지 모두 보기도 일부라도 열렸으면 막는다 - planForPerson 과 같다) */
async function owned(q: Pick<PoolClient, "query">, personId: string, season: ExamSeason, mode: GiftMode): Promise<boolean> {
  const r = await q.query(`SELECT 1 FROM topic_unlocks WHERE person_id = $1 AND topic = ANY($2::text[])`, [personId, examModeTopics(season, mode)]);
  return (r.rowCount ?? 0) > 0;
}

/** 수험생이 결제 부탁 링크 만들기 (같은 사람·같은 시즌·같은 상품이면 있던 링크를 다시 쓴다) */
export async function createExamGift(childUserId: string, personId: string, mode: GiftMode = "exam_deep"): Promise<string> {
  assertGiftOnSale(mode);
  const pool = await db();
  const season = examSeason();
  const p = await pool.query(`SELECT 1 FROM persons WHERE id = $1 AND user_id = $2`, [personId, childUserId]);
  if ((p.rowCount ?? 0) === 0) throw new GiftError("NOT_FOUND", "사람을 찾을 수 없어요.");
  if (await owned(pool, personId, season, mode)) throw new GiftError("ALREADY_OWNED", "이미 열려 있어요.");
  const have = await pool.query<{ token: string }>(
    `SELECT token FROM exam_gifts WHERE person_id = $1 AND season = $2 AND mode = $3 AND paid_at IS NULL ORDER BY created_at DESC LIMIT 1`,
    [personId, season, mode]
  );
  if (have.rows[0]) return have.rows[0].token;
  const token = randomBytes(18).toString("base64url");
  await pool.query(`INSERT INTO exam_gifts (token, person_id, child_user_id, season, mode) VALUES ($1, $2, $3, $4, $5)`, [token, personId, childUserId, season, mode]);
  return token;
}

/** 부탁 링크 보기 (로그인 없이도 - 이름·상품만) */
export async function getExamGift(token: string, viewerId: string | null): Promise<ExamGiftView | null> {
  if (!TOKEN_RE.test(token)) return null;
  const pool = await db();
  const r = await pool.query<{ token: string; person_id: string; child_user_id: string; season: ExamSeason; mode: string; paid_by: string | null; nickname: string }>(
    `SELECT g.token, g.person_id, g.child_user_id, g.season, g.mode, g.paid_by, p.nickname
       FROM exam_gifts g JOIN persons p ON p.id = g.person_id WHERE g.token = $1`,
    [token]
  );
  const g = r.rows[0];
  if (!g || !isGiftMode(g.mode)) return null;
  return {
    token: g.token,
    mode: g.mode,
    personId: g.person_id,
    childUserId: g.child_user_id,
    nickname: g.nickname,
    season: g.season,
    title: giftProductTitle(g.season, g.mode),
    points: giftPoints(g.season, g.mode),
    price: examModePrice(g.mode),
    owned: await owned(pool, g.person_id, g.season, g.mode),
    paidByMe: !!viewerId && g.paid_by === viewerId,
  };
}

/** 결제 한 건 (이미 열린 트랜잭션 안에서 - 카드 승인 직후에도 이걸 부른다) */
export async function giftWithClient(client: PoolClient, payerId: string, token: string): Promise<void> {
  const g = await client.query<{ person_id: string; season: ExamSeason; mode: string; nickname: string }>(
    `SELECT g.person_id, g.season, g.mode, p.nickname FROM exam_gifts g JOIN persons p ON p.id = g.person_id WHERE g.token = $1 FOR UPDATE OF g`,
    [token]
  );
  const gift = g.rows[0];
  if (!gift || !isGiftMode(gift.mode)) throw new GiftError("NOT_FOUND", "결제 부탁 링크를 찾을 수 없어요.");
  const mode = gift.mode;
  if (await owned(client, gift.person_id, gift.season, mode)) throw new GiftError("ALREADY_OWNED", "이미 열려 있어요.");
  const price = examModePrice(mode);
  if (!price) throw new GiftError("SALE_ENDED", "지금은 결제할 수 없어요. 판매 기간이 끝났거나 준비 중이에요.");
  const balance = await lockAndBalance(client, payerId);
  if (balance < price) throw new InsufficientYeopjeonError(balance);
  for (const t of examModeTopics(gift.season, mode)) {
    await client.query(`INSERT INTO topic_unlocks (person_id, topic, via) VALUES ($1, $2, $3)`, [gift.person_id, t, giftVia(token)]);
  }
  // 장부 이름표는 예전(깊게 보기) 그대로 exam_deep_gift:… - 같은 이름표가 있으면 insertSpend 가 번호를 붙인다
  await insertSpend(client, payerId, -price, `[${giftProductTitle(gift.season, mode)} 결제 부탁] ${gift.nickname}`, `${mode}_gift:${gift.person_id}:${gift.season}`);
  await client.query(`UPDATE exam_gifts SET paid_by = $2, paid_at = now() WHERE token = $1`, [token, payerId]);
}

/** 엽전이 충분할 때 바로 결제 */
export async function giftExamDeep(payerId: string, token: string): Promise<void> {
  if (!TOKEN_RE.test(token)) throw new GiftError("NOT_FOUND", "결제 부탁 링크를 찾을 수 없어요.");
  const g = await getExamGift(token, payerId);
  if (!g) throw new GiftError("NOT_FOUND", "결제 부탁 링크를 찾을 수 없어요.");
  assertGiftOnSale(g.mode);
  await inTransaction((client) => giftWithClient(client, payerId, token));
}

/** 2026-11-13 결제 검수: 부탁 링크 결제도 판매 잠금·판매 기간을 똑같이 지킨다 (2026-11-14 상품별) */
export function assertGiftOnSale(mode: GiftMode = "exam_deep"): void {
  if (!isOnSale(mode) || !examSaleOpen() || !examModePrice(mode)) throw new GiftError("SALE_ENDED", "지금은 결제할 수 없어요. 판매 기간이 끝났거나 준비 중이에요.");
}
