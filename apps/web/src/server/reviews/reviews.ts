import { db } from "@/server/auth/db";
import { getUserBySessionToken } from "@/server/auth/session";
import { requireAdmin } from "@/server/admin/admin";
import { inTransaction } from "@/server/readings/readings";
import { isAnyTopicKey, isTopicKey } from "@/lib/topics";
import { REVIEW_ANGEL_NO, REVIEW_ANGEL_GIFT, REVIEW_GIFT, REVIEW_MIN_CHARS, maskName, reviewProductLabel } from "@/lib/reviews";

/**
 * 1004 천사의 한마디 - 후기 (2026-10-12 수정안 47).
 *  - 실제로 산(그리고 열어 본) 상품에만, 상품마다 한 번씩 쓸 수 있다.
 *  - 계정의 첫 후기에는 엽전 990냥을 바로 지급(계정당 1회, 장부 유니크로 두 번 들어가지 않음).
 *  - 사이트 전체에서 1,004번째로 들어온 후기에는 29,500냥을 바로 지급하고 관리자 화면에 알린다.
 *  - 대문·후기 화면에는 관리자가 "올리기"한 것만 보인다. 이름은 가리고, 다른 이름으로 바꿔 올리는 기능은 없다.
 */

type Out = { status: number; body: unknown };
const err = (status: number, code: string, message: string): Out => ({ status, body: { error: { code, message } } });
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface PublicReview {
  id: string;
  name: string;
  product: string;
  productLabel: string;
  rating: number;
  body: string;
  gifted: boolean;
  createdAt: string;
}

const pool = db;

/** 상품 키: basic:<운세> · deep:<운세> · naming · rename · business · face (face 는 personId 자리에 관상 풀이 번호) */
export function parseProduct(v: unknown): { kind: "basic" | "deep"; topic: string } | { kind: "naming" | "rename" | "face" | "business" } | null {
  if (v === "naming" || v === "rename" || v === "face" || v === "business") return { kind: v };
  if (typeof v !== "string") return null;
  const [k, t] = v.split(":");
  if (k === "basic" && isTopicKey(t)) return { kind: "basic", topic: t };
  if (k === "deep" && isAnyTopicKey(t)) return { kind: "deep", topic: t };
  return null;
}

/** 이 사람으로 이 상품을 실제로 열어 봤는지 */
async function usedProduct(q: { query: (s: string, a: unknown[]) => Promise<{ rowCount: number | null }> }, personId: string, product: string): Promise<boolean> {
  const p = parseProduct(product);
  if (!p) return false;
  let r;
  if (p.kind === "basic") r = await q.query(`SELECT 1 FROM topic_basics WHERE person_id = $1 AND topic = $2 AND content IS NOT NULL`, [personId, p.topic]);
  else if (p.kind === "deep") r = await q.query(`SELECT 1 FROM topic_readings WHERE person_id = $1 AND topic = $2`, [personId, p.topic]);
  else if (p.kind === "face") r = await q.query(`SELECT 1 FROM face_readings WHERE id = $1 AND content IS NOT NULL`, [personId]);
  else r = await q.query(`SELECT 1 FROM name_reports WHERE person_id = $1 AND kind = $2`, [personId, p.kind]);
  return (r.rowCount ?? 0) > 0;
}

function toPublic(r: { id: string; display_name: string; product: string; rating: number; body: string; gifted: boolean; created_at: Date }): PublicReview {
  return {
    id: r.id,
    name: r.display_name,
    product: r.product,
    productLabel: reviewProductLabel(r.product),
    rating: r.rating,
    body: r.body,
    gifted: r.gifted,
    createdAt: r.created_at.toISOString(),
  };
}

/** 내가 이 상품에 남긴 후기 (결과 화면 아래 칸) */
export async function handleMyReview(token: string | undefined, personId: string | null, product: string | null): Promise<Out> {
  const user = await getUserBySessionToken(token);
  if (!user) return err(401, "LOGIN_REQUIRED", "로그인 후 이용할 수 있어요.");
  if (!personId || !UUID_RE.test(personId) || !parseProduct(product)) return err(400, "INVALID_INPUT", "상품을 확인해 주세요.");
  const p = await pool();
  const r = await p.query(`SELECT id, display_name, product, rating, body, gifted, created_at FROM reviews WHERE user_id = $1 AND person_id = $2 AND product = $3`, [
    user.id,
    personId,
    product,
  ]);
  const g = await p.query(`SELECT 1 FROM reviews WHERE user_id = $1 AND gifted`, [user.id]);
  return { status: 200, body: { review: r.rows[0] ? toPublic(r.rows[0]) : null, giftLeft: (g.rowCount ?? 0) === 0 } };
}

/** 후기 남기기 + 선물 (한 트랜잭션) */
export async function handleCreateReview(token: string | undefined, raw: unknown): Promise<Out> {
  const user = await getUserBySessionToken(token);
  if (!user) return err(401, "LOGIN_REQUIRED", "로그인 후 이용할 수 있어요.");
  if (!user.termsAgreed) return err(403, "CONSENT_REQUIRED", "약관 동의 후 이용할 수 있어요.");
  const b = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  const personId = typeof b.personId === "string" ? b.personId : "";
  const product = typeof b.product === "string" ? b.product : "";
  const rating = Number(b.rating);
  const body = typeof b.body === "string" ? b.body.replace(/\s+/g, " ").trim() : "";
  if (!UUID_RE.test(personId) || !parseProduct(product)) return err(400, "INVALID_INPUT", "상품을 확인해 주세요.");
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return err(400, "INVALID_RATING", "별을 눌러 주세요.");
  if ([...body].length < REVIEW_MIN_CHARS) return err(400, "TOO_SHORT", `느낀 점을 ${REVIEW_MIN_CHARS}자 이상 적어 주세요.`);
  if ([...body].length > 500 || /<[a-z/!]/i.test(body)) return err(400, "INVALID_BODY", "500자 이하로, 글자로만 적어 주세요.");

  return inTransaction(async (client) => {
    const owner = await client.query(
      product === "face" ? `SELECT 1 FROM face_readings WHERE id = $1 AND user_id = $2` : `SELECT 1 FROM persons WHERE id = $1 AND user_id = $2`,
      [personId, user.id]
    );
    if ((owner.rowCount ?? 0) === 0) return err(404, "NOT_FOUND", "풀이 대상을 찾을 수 없어요.");
    if (!(await usedProduct(client, personId, product))) return err(403, "NOT_USED", "풀이를 받아 본 뒤에 남길 수 있어요.");
    // 같은 계정의 후기가 동시에 들어와 선물이 두 번 나가지 않게 계정 단위로 잠근다
    await client.query(`SELECT pg_advisory_xact_lock(hashtext($1))`, [`review:${user.id}`]);
    const dup = await client.query(`SELECT 1 FROM reviews WHERE user_id = $1 AND person_id = $2 AND product = $3`, [user.id, personId, product]);
    if ((dup.rowCount ?? 0) > 0) return err(409, "ALREADY", "이 풀이에는 이미 한마디를 남겨 주셨어요.");
    const giftedBefore = await client.query(`SELECT 1 FROM reviews WHERE user_id = $1 AND gifted`, [user.id]);
    const gift = (giftedBefore.rowCount ?? 0) === 0;
    const ins = await client.query<{ id: string; seq: string; display_name: string; product: string; rating: number; body: string; gifted: boolean; created_at: Date }>(
      `INSERT INTO reviews (user_id, person_id, product, rating, body, display_name, gifted)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, seq, display_name, product, rating, body, gifted, created_at`,
      [user.id, personId, product, rating, body, maskName(user.nickname), gift]
    );
    const row = ins.rows[0];
    if (gift) {
      await client.query(
        `INSERT INTO bokchae_ledger (user_id, amount, kind, label, ref) VALUES ($1, $2, 'review', $3, 'first') ON CONFLICT (user_id, kind, ref) DO NOTHING`,
        [user.id, REVIEW_GIFT, "1004 천사의 한마디 선물"]
      );
    }
    const angel = Number(row.seq) === REVIEW_ANGEL_NO;
    if (angel) {
      await client.query(`UPDATE reviews SET angel = true WHERE id = $1`, [row.id]);
      await client.query(
        `INSERT INTO bokchae_ledger (user_id, amount, kind, label, ref) VALUES ($1, $2, 'review', $3, 'angel1004') ON CONFLICT (user_id, kind, ref) DO NOTHING`,
        [user.id, REVIEW_ANGEL_GIFT, "1,004번째 천사 선물"]
      );
    }
    return { status: 200, body: { review: toPublic(row), gift: gift ? REVIEW_GIFT : 0, angel } };
  });
}

/** 손님에게 보이는 후기 - 관리자가 올린 것만 */
export async function publicReviews(opts: { topic?: string | null; naming?: boolean; face?: boolean; limit?: number } = {}): Promise<PublicReview[]> {
  const p = await pool();
  const limit = Math.min(Math.max(opts.limit ?? 30, 1), 100);
  const where = ["featured", "NOT hidden"];
  const args: unknown[] = [];
  if (opts.topic && isAnyTopicKey(opts.topic)) {
    args.push(`basic:${opts.topic}`, `deep:${opts.topic}`);
    where.push(`product IN ($${args.length - 1}, $${args.length})`);
  } else if (opts.naming) where.push(`product IN ('naming', 'rename', 'business')`);
  else if (opts.face) where.push(`product = 'face'`);
  args.push(limit);
  const r = await p.query(
    `SELECT id, display_name, product, rating, body, gifted, created_at FROM reviews WHERE ${where.join(" AND ")} ORDER BY created_at DESC LIMIT $${args.length}`,
    args
  );
  return r.rows.map(toPublic);
}

// ───────────────────────── 관리자 ─────────────────────────

export interface AdminReview extends PublicReview {
  seq: number;
  featured: boolean;
  hidden: boolean;
  angel: boolean;
  userId: string;
}

export async function adminReviews(): Promise<{ list: AdminReview[]; angel: AdminReview | null; total: number }> {
  const p = await pool();
  const [r, a, c] = await Promise.all([
    p.query(`SELECT id, seq, user_id, display_name, product, rating, body, gifted, featured, hidden, angel, created_at FROM reviews ORDER BY created_at DESC LIMIT 100`),
    p.query(`SELECT id, seq, user_id, display_name, product, rating, body, gifted, featured, hidden, angel, created_at FROM reviews WHERE angel LIMIT 1`),
    p.query<{ n: string }>(`SELECT COUNT(*) AS n FROM reviews`),
  ]);
  const map = (x: Record<string, unknown>): AdminReview => ({
    ...toPublic(x as never),
    seq: Number(x.seq),
    featured: Boolean(x.featured),
    hidden: Boolean(x.hidden),
    angel: Boolean(x.angel),
    userId: String(x.user_id),
  });
  return { list: r.rows.map(map), angel: a.rows[0] ? map(a.rows[0]) : null, total: Number(c.rows[0].n) };
}

export async function handleAdminReview(token: string | undefined, id: string, raw: unknown): Promise<Out> {
  const a = await requireAdmin(token);
  if (!a.ok) return a;
  if (!UUID_RE.test(id)) return err(400, "INVALID_INPUT", "후기 번호가 올바르지 않아요.");
  const b = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  const p = await pool();
  if (typeof b.featured === "boolean") await p.query(`UPDATE reviews SET featured = $2 WHERE id = $1`, [id, b.featured]);
  if (typeof b.hidden === "boolean") await p.query(`UPDATE reviews SET hidden = $2, featured = CASE WHEN $2 THEN false ELSE featured END WHERE id = $1`, [id, b.hidden]);
  return { status: 200, body: { ok: true } };
}

