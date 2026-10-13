import { createHash } from "crypto";
import { db } from "@/server/auth/db";
import { getUserBySessionToken } from "@/server/auth/session";
import { getBalance } from "@/server/yeopjeon/ledger";
import { notifyError } from "@/server/alert";
import { PRICE } from "@/lib/yeopjeon";
import { getFaceResult } from "./faceResultStore";
import { parsePhotoDataUrl, writeFaceDeep, type FaceDeepResult, type FaceSaju } from "./faceVision";
import { listProfiles } from "@/server/auth/profiles";
import { validateAnalyzeInput } from "@/server/validateAnalyzeInput";
import { analyzeSaju } from "@/server/analyzeSaju";
import { getResult } from "@/server/resultStore";
import { createPerson, getPersonRow } from "@/server/readings/readings";
import { factsForPrompt, sajuFacts } from "@/lib/sajuFacts";
import type { FaceFeatureBuckets, FaceRuleResult } from "./types";

/**
 * 관상 심층 풀이 (2026-10-12 수정안 53).
 *   1) 무료 관상 결과(30분 임시 토큰) → 로그인한 회원의 관상 풀이(face_readings)로 옮겨 둔다 (결제 전)
 *   2) 4,900냥 구매는 사주 상품과 같은 길 (readings.ts mode "face" · 모자라면 카드 결제)
 *   3) 산 뒤 "풀이 받기" - 동의한 사진이 있으면 AI가 사진을 보고, 없으면 비율만으로 쓴다. 사진은 저장하지 않는다.
 *   4) 내 복주머니에서 언제든 다시 본다.
 */

type Out = { status: number; body: unknown };
const err = (status: number, code: string, message: string): Out => ({ status, body: { error: { code, message } } });
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function member(token: string | undefined) {
  const user = await getUserBySessionToken(token);
  if (!user) return { error: err(401, "LOGIN_REQUIRED", "로그인 후 이용할 수 있어요.") } as const;
  if (!user.termsAgreed) return { error: err(403, "CONSENT_REQUIRED", "약관 동의 후 이용할 수 있어요.") } as const;
  return { user } as const;
}

interface FaceRow {
  id: string;
  nickname: string;
  buckets: FaceFeatureBuckets;
  rule_result: FaceRuleResult;
  preference: string | null;
  paid_at: Date | null;
  content: FaceDeepResult | null;
  photo_used: boolean;
  person_id: string | null;
  created_at: Date;
}

async function getRow(userId: string, id: string): Promise<FaceRow | null> {
  if (!UUID_RE.test(id)) return null;
  const pool = await db();
  const r = await pool.query<FaceRow>(
    `SELECT id, nickname, buckets, rule_result, preference, paid_at, content, photo_used, person_id, created_at FROM face_readings WHERE id = $1 AND user_id = $2`,
    [id, userId]
  );
  return r.rows[0] ?? null;
}

/** 무료 결과 토큰 → 내 관상 풀이 (같은 결과를 두 번 옮겨도 하나) */
export async function handleCreateFaceReading(token: string | undefined, raw: unknown): Promise<Out> {
  const m = await member(token);
  if ("error" in m) return m.error!;
  const resultId = typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>).resultId : undefined;
  if (typeof resultId !== "string" || !resultId) return err(400, "INVALID_INPUT", "관상 결과 정보가 없어요.");
  const result = getFaceResult(resultId);
  if (!result) return err(410, "RESULT_EXPIRED", "관상 결과 보관 시간(30분)이 지났어요. 사진을 다시 찍어 주세요.");
  const sourceKey = createHash("sha256").update(resultId).digest("hex").slice(0, 32);
  const pool = await db();
  const r = await pool.query<{ id: string }>(
    `INSERT INTO face_readings (user_id, source_key, nickname, buckets, rule_result, preference)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (user_id, source_key) DO UPDATE SET nickname = face_readings.nickname
     RETURNING id`,
    [m.user.id, sourceKey, result.nickname, JSON.stringify(result.buckets), JSON.stringify(result.result), result.relationshipPreference]
  );
  return { status: 200, body: { id: r.rows[0].id } };
}

/** 관상 풀이에 붙은 사주 (수정안 59) */
async function personOf(userId: string, personId: string | null) {
  if (!personId) return null;
  const p = await getPersonRow(userId, personId);
  return p ? { id: p.id, nickname: p.nickname, hanjaName: p.hanja_name, birth: p.header.birth, row: p } : null;
}

/**
 * 누구의 사주로 볼지 정하기 (수정안 59). body 하나만: { profileId } 저장한 사람 · { personId } 이미 있는 풀이 대상 · { resultId } 방금 입력한 사주.
 * 풀이를 다 받은 뒤에는 바꿀 수 없다.
 */
export async function handleAttachFaceSaju(token: string | undefined, id: string, raw: unknown): Promise<Out> {
  const m = await member(token);
  if ("error" in m) return m.error!;
  const row = await getRow(m.user.id, id);
  if (!row) return err(404, "NOT_FOUND", "관상 풀이를 찾을 수 없어요.");
  if (row.content) return err(409, "ALREADY_WRITTEN", "이미 풀이를 받아서 사주를 바꿀 수 없어요.");
  const b = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  let personId: string | null = null;

  if (typeof b.personId === "string") {
    const p = await getPersonRow(m.user.id, b.personId);
    if (!p) return err(404, "NOT_FOUND", "사주를 찾을 수 없어요.");
    personId = p.id;
  } else if (typeof b.profileId === "string") {
    const prof = (await listProfiles(m.user.id)).find((x) => x.id === b.profileId);
    if (!prof) return err(404, "NOT_FOUND", "저장한 사람을 찾을 수 없어요.");
    const v = validateAnalyzeInput({
      nickname: prof.name,
      hanjaName: prof.hanjaName ?? undefined,
      gender: prof.gender,
      calendarType: prof.calendarType,
      isLeapMonth: prof.calendarType === "lunar" ? prof.isLeapMonth : undefined,
      date: prof.date,
      time: prof.time ?? undefined,
      birthCity: prof.birthCity ?? undefined,
    });
    if (!v.ok) return err(400, "INVALID_PROFILE", "저장한 생년월일을 다시 확인해 주세요.");
    const r = await analyzeSaju(v.value).catch(() => null);
    if (!r) return err(422, "SAJU_CALCULATION_FAILED", "사주를 계산하지 못했어요. 생년월일을 다시 확인해 주세요.");
    personId = await createPerson({ userId: m.user.id, saju: r.saju, nickname: r.nickname, hanjaName: r.hanjaName });
  } else if (typeof b.resultId === "string") {
    const r = getResult(b.resultId);
    if (!r) return err(410, "RESULT_EXPIRED", "입력한 사주 보관 시간이 지났어요. 다시 입력해 주세요.");
    personId = await createPerson({ userId: m.user.id, saju: r.saju, nickname: r.nickname, hanjaName: r.hanjaName });
  } else {
    return err(400, "INVALID_INPUT", "누구의 사주인지 골라 주세요.");
  }

  const pool = await db();
  await pool.query(`UPDATE face_readings SET person_id = $3 WHERE id = $1 AND user_id = $2 AND content IS NULL`, [id, m.user.id, personId]);
  const p = await personOf(m.user.id, personId);
  return { status: 200, body: { person: p && { id: p.id, nickname: p.nickname, hanjaName: p.hanjaName, birth: p.birth } } };
}

/** 관상 풀이 화면: locked(사기 전) · write(샀고 아직 안 씀) · ready(다 씀) */
export async function handleGetFaceReading(token: string | undefined, id: string): Promise<Out> {
  const m = await member(token);
  if ("error" in m) return m.error!;
  const row = await getRow(m.user.id, id);
  if (!row) return err(404, "NOT_FOUND", "관상 풀이를 찾을 수 없어요.");
  const base = {
    id: row.id,
    nickname: row.nickname,
    buckets: row.buckets,
    rule: row.rule_result,
    hasPreference: !!row.preference,
    price: PRICE.FACE,
    person: await personOf(m.user.id, row.person_id).then((p) => p && { id: p.id, nickname: p.nickname, hanjaName: p.hanjaName, birth: p.birth }),
    createdAt: row.created_at.toISOString(),
  };
  if (!row.paid_at) return { status: 200, body: { ...base, status: "locked", balance: await getBalance(m.user.id) } };
  if (!row.content) return { status: 200, body: { ...base, status: "write" } };
  return { status: 200, body: { ...base, status: "ready", content: row.content } };
}

/** 풀이 쓰기 - 산 사람만, 한 번만 (먼저 써진 게 있으면 그걸 돌려준다). body: { photo?: dataURL, consent?: true } */
export async function handleWriteFaceReading(token: string | undefined, id: string, raw: unknown): Promise<Out> {
  const m = await member(token);
  if ("error" in m) return m.error!;
  const row = await getRow(m.user.id, id);
  if (!row) return err(404, "NOT_FOUND", "관상 풀이를 찾을 수 없어요.");
  if (!row.paid_at) return err(402, "NOT_PAID", "관상 심층 풀이를 연 뒤에 받을 수 있어요.");
  if (row.content) return { status: 200, body: { content: row.content } };

  const b = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  let photo = null;
  if (b.photo !== undefined && b.photo !== null) {
    if (b.consent !== true) return err(400, "CONSENT_REQUIRED", "사진을 풀이에 쓰려면 동의에 체크해 주세요.");
    photo = parsePhotoDataUrl(b.photo);
    if (!photo) return err(400, "INVALID_PHOTO", "사진을 읽지 못했어요. 다른 사진으로 다시 골라 주세요.");
  }

  let content: FaceDeepResult;
  try {
    const p = await personOf(m.user.id, row.person_id);
    let saju: FaceSaju | null = null;
    if (p) {
      try {
        saju = { name: p.nickname, hanjaName: p.hanjaName, birth: p.birth, facts: factsForPrompt(sajuFacts(p.row.saju)) };
      } catch (e) {
        notifyError("관상 풀이 - 사주 사실 만들기", e);
      }
    }
    content = await writeFaceDeep(row.buckets, row.preference, photo, saju);
  } catch (e) {
    notifyError("관상 심층 풀이 쓰기", e);
    return err(503, "AI_BUSY", "풀이를 쓰는 곳이 붐벼요. 잠시 후 다시 눌러 주세요. 엽전은 다시 빠지지 않아요.");
  } finally {
    photo = null; // 사진은 여기서 버린다 (저장하지 않음)
  }
  const pool = await db();
  await pool.query(`UPDATE face_readings SET content = $3, photo_used = $4 WHERE id = $1 AND user_id = $2 AND content IS NULL`, [
    id,
    m.user.id,
    JSON.stringify(content),
    content.photoUsed,
  ]);
  const saved = await getRow(m.user.id, id);
  return { status: 200, body: { content: saved?.content ?? content } };
}

/** 내 복주머니: 연 관상 풀이 */
export async function listFaceReadings(userId: string): Promise<Array<{ id: string; nickname: string; written: boolean; createdAt: string }>> {
  const pool = await db();
  const r = await pool.query<{ id: string; nickname: string; written: boolean; created_at: Date }>(
    `SELECT id, nickname, content IS NOT NULL AS written, created_at FROM face_readings
      WHERE user_id = $1 AND paid_at IS NOT NULL ORDER BY created_at DESC LIMIT 50`,
    [userId]
  );
  return r.rows.map((x) => ({ id: x.id, nickname: x.nickname, written: x.written, createdAt: x.created_at.toISOString() }));
}
