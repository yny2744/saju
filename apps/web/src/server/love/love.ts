import type { CompletionProvider, SajuJson } from "saju-engine";
import { db } from "@/server/auth/db";
import { NAME_TOKEN, completeWithRetry, extractJson, fillName, getReadingProvider, inventedDaeun } from "@/server/readings/generateReading";
import { factsForPrompt, sajuFacts } from "@/lib/sajuFacts";
import { nameFill } from "@/lib/coupleMatch";
import { coupleCalendar, loveBase, soloCalendar, type CoupleCalRow, type SoloCalRow } from "@/lib/love/love";
import { loveCalTopic } from "@/lib/love/loveProducts";

/**
 * 2027 연애 달력 (9,900원, 2026-11-09 유샘 지시서 5번).
 *   계산: 엔진 - 2027년 1~12월 월운과 배우자 자리(일지)·배우자 별(여자 관성, 남자 재성)의 관계 (lib/love/love.ts soloCalendar · coupleCalendar)
 *   글: 기존 유료 풀이(AI)와 같은 방식 - 엔진이 정한 달별 판정만 근거로 쓰게 묶는다. 저장 topic_readings.topic = love2027 / love2027c:<상대>
 */

export interface LoveCalMonth {
  month: number;
  ganzhi: string;
  /** 솔로: 인연이 강한 달 / 커플: 좋은 달 */
  good: boolean;
  /** 커플: 조심할 달 */
  care: boolean;
  /** 솔로: 만날 가능성이 있는 곳 */
  place?: string;
  body: string;
}

export interface LoveCal {
  year: 2027;
  kind: "solo" | "couple";
  title: string;
  summary: string;
  months: LoveCalMonth[];
  model: string;
}

const srow = (r: SoloCalRow) => `- ${r.month}월 (${r.ganzhi}월): ${r.strong ? "인연 기운이 강한 달" : "보통의 달"} · 만날 가능성이 있는 곳 "${r.place}" · 근거: ${r.why}`;
const cwon = (r: CoupleCalRow) => `- ${r.month}월 (${r.ganzhi}월): ${r.care ? "조심할 달" : r.good ? "좋은 달" : "보통의 달"} · 근거: ${r.why}`;

export function buildSoloCalPrompt(saju: SajuJson, rows: SoloCalRow[]): string {
  const b = loveBase(saju);
  return `# 확정 사실 (계산 엔진이 판정까지 끝낸 값 - 근거는 이 목록에서만 가져오세요)
${factsForPrompt(sajuFacts(saju))}
- 배우자 자리(일지): ${b.dayBranch} · 배우자 별: ${b.spouseGroup}(${b.spouseEl})

# 2027년 열두 달 연애 판정 (엔진이 월운과 배우자 자리·배우자 별을 비교해 끝낸 값 - 그대로 따르세요)
${rows.map(srow).join("\n")}

# 요청: 깊게 보기 - 2027 연애 달력 (솔로: 인연이 오는 달)

손님을 "${NAME_TOKEN}님"이라고 부르세요. "${NAME_TOKEN}"은 실제 이름 대신 쓰는 표시이니 중괄호까지 글자 그대로 쓰세요.
열두 달을 1월부터 12월까지 순서대로, 달마다 소제목 하나씩 써 주세요. 소제목은 "1월", "2월"처럼 달 이름만.
규칙:
- 달마다 3~4문장. "인연 기운이 강한 달"은 왜 강한지(근거)와 위의 "만날 가능성이 있는 곳"에서 어떻게 움직이면 좋은지, 보통의 달은 그달에 할 일을 쓰세요.
- 판정을 바꾸지 마세요. 목록에 없는 합·충·대운 이름은 쓰지 마세요.
- 겁주지 마세요. 엇갈림이나 부딪힘을 말할 때는 지나가는 방법을 꼭 함께 쓰세요.
- 엽전·냥·가격 이야기는 쓰지 마세요.
- summary: 맨 위에 놓을 두 문장 요약 (인연이 강한 달을 짚어서).

JSON 형식:
{"summary":"...","parts":[{"heading":"1월","body":"..."},...]}`;
}

export function buildCoupleCalPrompt(aSaju: SajuJson, bSaju: SajuJson, rows: CoupleCalRow[]): string {
  const A = loveBase(aSaju);
  const B = loveBase(bSaju);
  const fa = sajuFacts(aSaju);
  const fb = sajuFacts(bSaju);
  return `# 확정 사실 (계산 엔진이 판정까지 끝낸 값 - 근거는 이 목록에서만 가져오세요)
- {A}님: 일간 ${fa.dayStem}(${fa.dayElement}) · 배우자 자리(일지) ${A.dayBranch} · 배우자 별 ${A.spouseGroup}(${A.spouseEl})
- {B}님: 일간 ${fb.dayStem}(${fb.dayElement}) · 배우자 자리(일지) ${B.dayBranch} · 배우자 별 ${B.spouseGroup}(${B.spouseEl})

# 2027년 열두 달 두 사람의 판정 (엔진이 월운과 두 사람의 배우자 자리·배우자 별을 비교해 끝낸 값 - 그대로 따르세요)
${rows.map(cwon).join("\n")}

# 요청: 깊게 보기 - 2027 연애 달력 (커플: 두 사람의 좋은 달과 조심할 달)

두 사람을 "{A}님", "{B}님"이라고 부르세요. 중괄호까지 글자 그대로 쓰세요.
열두 달을 1월부터 12월까지 순서대로, 달마다 소제목 하나씩 써 주세요. 소제목은 "1월", "2월"처럼 달 이름만.
규칙:
- 달마다 3~4문장. "좋은 달"은 함께 하면 좋은 일, "조심할 달"은 무엇이 엇갈리기 쉬운지와 지나가는 방법을 꼭 함께, 보통의 달은 편안하게 보낼 방법을 쓰세요.
- 판정을 바꾸지 마세요. 목록에 없는 합·충·대운 이름은 쓰지 마세요.
- 겁주지 마세요. 이별을 단정하지 마세요.
- 엽전·냥·가격 이야기는 쓰지 마세요.
- summary: 맨 위에 놓을 두 문장 요약.

JSON 형식:
{"summary":"...","parts":[{"heading":"1월","body":"..."},...]}`;
}

export function parseLoveCal(raw: string, allowedDaeun: string[]): { summary: string; parts: string[] } {
  const parsed = extractJson(raw) as { summary?: string; parts?: Array<{ heading?: string; body?: string }> };
  const parts = (parsed.parts ?? []).filter((p) => typeof p.body === "string" && p.body.trim().length >= 20).map((p) => p.body!.trim());
  if (parts.length < 12) throw new Error("AI 응답의 2027 연애 달력이 너무 짧습니다.");
  const bad = inventedDaeun(parts.join("\n"), allowedDaeun);
  if (bad) throw new Error(`AI가 확정 사실에 없는 대운(${bad})을 썼습니다.`);
  return { summary: typeof parsed.summary === "string" ? parsed.summary.trim() : "", parts: parts.slice(0, 12) };
}

export async function generateSoloCal(saju: SajuJson, nickname: string, provider: CompletionProvider = getReadingProvider(6000)): Promise<LoveCal> {
  const rows = soloCalendar(saju);
  const body = await completeWithRetry(provider, buildSoloCalPrompt(saju, rows), (raw) => parseLoveCal(raw, sajuFacts(saju).daeunList.map((d) => d.ganzhi)));
  return {
    year: 2027,
    kind: "solo",
    title: "2027 연애 달력",
    summary: fillName(body.summary, nickname),
    months: rows.map((r, i) => ({ month: r.month, ganzhi: r.ganzhi, good: r.strong, care: false, place: r.place, body: fillName(body.parts[i], nickname) })),
    model: provider.modelName,
  };
}

export async function generateCoupleCal(
  aName: string,
  aSaju: SajuJson,
  bName: string,
  bSaju: SajuJson,
  provider: CompletionProvider = getReadingProvider(6000)
): Promise<LoveCal> {
  const rows = coupleCalendar(aSaju, bSaju);
  const allowed = [...sajuFacts(aSaju).daeunList, ...sajuFacts(bSaju).daeunList].map((d) => d.ganzhi);
  const body = await completeWithRetry(provider, buildCoupleCalPrompt(aSaju, bSaju, rows), (raw) => parseLoveCal(raw, allowed));
  return {
    year: 2027,
    kind: "couple",
    title: "2027 연애 달력",
    summary: nameFill(body.summary, aName, bName),
    months: rows.map((r, i) => ({ month: r.month, ganzhi: r.ganzhi, good: r.good, care: r.care, body: nameFill(body.parts[i], aName, bName) })),
    model: provider.modelName,
  };
}

export async function getLoveCal(personId: string, partnerId?: string | null): Promise<LoveCal | null> {
  const pool = await db();
  const r = await pool.query<{ content: LoveCal }>(`SELECT content FROM topic_readings WHERE person_id = $1 AND topic = $2`, [personId, loveCalTopic(partnerId)]);
  return r.rows[0]?.content ?? null;
}

export async function saveLoveCal(personId: string, partnerId: string | null, content: LoveCal): Promise<LoveCal> {
  const pool = await db();
  await pool.query(`INSERT INTO topic_readings (person_id, topic, content, model) VALUES ($1, $2, $3, $4) ON CONFLICT (person_id, topic) DO NOTHING`, [
    personId,
    loveCalTopic(partnerId),
    JSON.stringify(content),
    content.model,
  ]);
  return (await getLoveCal(personId, partnerId)) ?? content;
}

/** 산 것인지 (짧은 궁합: love_pairs / 연애 달력: topic_unlocks) */
export async function loveOwned(personId: string, partnerId: string | null): Promise<{ pair: boolean; cal: boolean }> {
  const pool = await db();
  const [p, c] = await Promise.all([
    partnerId ? pool.query(`SELECT 1 FROM love_pairs WHERE person_id = $1 AND partner_person_id = $2`, [personId, partnerId]) : Promise.resolve({ rowCount: 0 }),
    pool.query(`SELECT 1 FROM topic_unlocks WHERE person_id = $1 AND topic = $2`, [personId, loveCalTopic(partnerId)]),
  ]);
  return { pair: (p.rowCount ?? 0) > 0, cal: (c.rowCount ?? 0) > 0 };
}

/** 내 복주머니: 산 2027 연애 달력 (솔로는 내 이름, 커플은 두 사람 이름) */
export async function listLoveCals(userId: string): Promise<Array<{ personId: string; partnerId: string | null; me: string; partner: string | null; createdAt: string }>> {
  const pool = await db();
  const r = await pool.query<{ person_id: string; topic: string; me: string; partner: string | null; created_at: Date }>(
    `SELECT u.person_id, u.topic, pa.nickname AS me, pb.nickname AS partner, u.created_at FROM topic_unlocks u
       JOIN persons pa ON pa.id = u.person_id
       LEFT JOIN persons pb ON u.topic LIKE 'love2027c:%' AND pb.id::text = substring(u.topic from 11) AND pb.user_id = pa.user_id
      WHERE pa.user_id = $1 AND (u.topic = 'love2027' OR u.topic LIKE 'love2027c:%') ORDER BY u.created_at DESC LIMIT 100`,
    [userId]
  );
  return r.rows.map((x) => ({
    personId: x.person_id,
    partnerId: x.topic.startsWith("love2027c:") ? x.topic.slice(10) : null,
    me: x.me,
    partner: x.partner,
    createdAt: x.created_at.toISOString(),
  }));
}

/** 내 복주머니: 산 짧은 궁합 (상대 이름으로 쌓인다) */
export async function listLovePairs(userId: string): Promise<Array<{ personId: string; partnerId: string; me: string; partner: string; createdAt: string }>> {
  const pool = await db();
  const r = await pool.query<{ person_id: string; partner_person_id: string; me: string; partner: string; created_at: Date }>(
    `SELECT l.person_id, l.partner_person_id, pa.nickname AS me, pb.nickname AS partner, l.created_at FROM love_pairs l
       JOIN persons pa ON pa.id = l.person_id JOIN persons pb ON pb.id = l.partner_person_id
      WHERE l.user_id = $1 ORDER BY l.created_at DESC LIMIT 100`,
    [userId]
  );
  return r.rows.map((x) => ({ personId: x.person_id, partnerId: x.partner_person_id, me: x.me, partner: x.partner, createdAt: x.created_at.toISOString() }));
}
