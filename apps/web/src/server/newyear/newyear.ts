import { calculateSeun, type CompletionProvider, type SajuJson } from "saju-engine";
import { db } from "@/server/auth/db";
import { NAME_TOKEN, completeWithRetry, extractJson, fillName, getReadingProvider, inventedDaeun } from "@/server/readings/generateReading";
import { composeBasic, type BasicReadingV2 } from "@/lib/basic/compose";
import { factsForPrompt, sajuFacts } from "@/lib/sajuFacts";
import { monthPillarsOfYear } from "@/lib/monthPillars";
import { NY_FULL, NY_YEAR } from "@/lib/newyear2027";

/**
 * 2027 신년운 풀이 (2026-11-03 유샘 지시서, lib/newyear2027.ts).
 *   세운만 2027년으로 바꿔 끼운다 - 엔진의 calculateSeun 을 연도 2027로 부를 뿐 계산 방식은 그대로 (정미년).
 *   총운(무료 맛보기·990원 끝까지): 엔진 문장 창고(composeBasic "year")로 - AI 없음.
 *   전체 보기(9,900원): 엔진이 확정한 사실 + 2027년 열두 달 월건만 근거로 AI 가 쓴다. topic_readings.topic = ny2027_full.
 */

/** 원국은 그대로, 세운만 2027년 */
export function withNyYear(saju: SajuJson): SajuJson {
  return { ...saju, seun: calculateSeun(saju.pillars, NY_YEAR) };
}

export const NY_TOTAL_TITLE = `${NY_YEAR}년 정미년 총운`;

/** 문장 창고의 "올해"는 지금 해를 뜻하므로 2027 신년운에서는 "2027년"으로 */
// 받침이 생기므로 뒤 조사도 맞춘다 (올해와 → 2027년과, 올해는 → 2027년은 ...)
const JOSA: Record<string, string> = { 와: "과", 는: "은", 가: "이", 를: "을", 로: "으로" };
const yearWord = (t: string) => t.replace(/올해(와|는|가|를|로)?/g, (_, j?: string) => `${NY_YEAR}년${j ? JOSA[j] : ""}`);

/** 2027 총운 (엔진 문장) */
export function composeNyTotal(saju: SajuJson, nickname: string): BasicReadingV2 {
  const r = composeBasic(withNyYear(saju), nickname, "year");
  return {
    ...r,
    title: NY_TOTAL_TITLE,
    summary: yearWord(r.summary),
    keywords: r.keywords.map(yearWord),
    sections: r.sections.map((s) => ({ heading: yearWord(s.heading), body: yearWord(s.body) })),
    lack: { ...r.lack, heading: yearWord(r.lack.heading), body: yearWord(r.lack.body) },
    deeper: r.deeper.map(yearWord),
    body: yearWord(r.body),
  };
}

/** 무료 맛보기: 요약 + 2027년 흐름을 짚는 한 단락만, 나머지는 소제목만 */
export function nyPreview(total: BasicReadingV2): { title: string; summary: string; keywords: string[]; free: { heading: string; body: string }; locked: string[] } {
  const i = Math.max(
    0,
    total.sections.findIndex((s) => s.body.includes(`${NY_YEAR}년`))
  );
  return {
    title: total.title,
    summary: total.summary,
    keywords: total.keywords,
    free: total.sections[i],
    locked: [...total.sections.filter((_, k) => k !== i).map((s) => s.heading), total.lack.heading],
  };
}

// ───────────────────────── 전체 보기 (AI) ─────────────────────────

export interface NyFull {
  year: number;
  title: string;
  summary: string;
  parts: Array<{ heading: string; body: string }>;
  model: string;
}

export function buildNyFullPrompt(saju: SajuJson): string {
  const f = sajuFacts(withNyYear(saju));
  const months = monthPillarsOfYear(NY_YEAR).map((m) => `- ${m.label}: ${m.ganzhi}월`);
  return `# 확정 사실 (계산 엔진이 판정까지 끝낸 값 - 근거는 이 목록에서만 가져오세요)
${factsForPrompt(f)}

# ${NY_YEAR}년 열두 달 월건 (입춘 기준 인월~축월, 계산 완료 - 그대로 인용)
${months.join("\n")}

# 요청: 깊게 보기 - ${NY_YEAR} 신년운 전체 보기 (정미년 총운 · 열두 달 · 재물·연애·건강)

손님을 "${NAME_TOKEN}님"이라고 부르세요. "${NAME_TOKEN}"은 실제 이름 대신 쓰는 표시이니 중괄호까지 글자 그대로 쓰세요.
아래 순서대로 소제목을 하나씩 써 주세요.
- "${NY_YEAR}년 정미년 총운": 한 해 전체의 흐름 (세운 십신과 지금 대운을 함께)
- 열두 달: 위 월건 목록의 달마다 소제목 하나씩, 소제목은 목록의 달 이름 그대로 (예: "${monthPillarsOfYear(NY_YEAR)[0].label}")
- "${NY_YEAR}년 재물 흐름"
- "${NY_YEAR}년 연애 흐름"
- "${NY_YEAR}년 건강 흐름"

규칙:
- 소제목 16개. 총운 600~800자, 달마다 200~300자, 재물·연애·건강 각각 400~600자.
- 소제목마다 위 [확정 사실]이나 월건 중 근거를 하나 이상 짚으세요. 목록에 없는 합·충·대운 이름은 쓰지 마세요.
- 사고·질병·이별을 단정하거나 겁주지 마세요. 조심할 점은 할 수 있는 행동으로 말하세요.
- "부족한"·"모자란"·"결핍" 같은 말 대신 "남은 작은 빈자리"라고 쓰세요.
- summary: 맨 위에 놓을 두 문장 요약.

JSON 형식:
{"summary":"...","parts":[{"heading":"...","body":"..."},...]}`;
}

export function parseNyFull(raw: string, allowedDaeun: string[]): { summary: string; parts: Array<{ heading: string; body: string }> } {
  const parsed = extractJson(raw) as { summary?: string; parts?: Array<{ heading?: string; body?: string }> };
  const parts = (parsed.parts ?? [])
    .filter((p) => typeof p.heading === "string" && typeof p.body === "string" && p.body.trim().length >= 20)
    .map((p) => ({ heading: p.heading!.trim(), body: p.body!.trim() }));
  if (parts.length < 13) throw new Error("AI 응답의 2027 신년운 전체 풀이가 너무 짧습니다.");
  const bad = inventedDaeun(parts.map((p) => p.body).join("\n"), allowedDaeun);
  if (bad) throw new Error(`AI가 확정 사실에 없는 대운(${bad})을 썼습니다.`);
  return { summary: typeof parsed.summary === "string" ? parsed.summary.trim() : "", parts };
}

export async function generateNyFull(saju: SajuJson, nickname: string, provider: CompletionProvider = getReadingProvider(9000)): Promise<NyFull> {
  const allowed = sajuFacts(saju).daeunList.map((d) => d.ganzhi);
  const body = await completeWithRetry(provider, buildNyFullPrompt(saju), (raw) => parseNyFull(raw, allowed));
  return {
    year: NY_YEAR,
    title: `${NY_YEAR} 신년운 전체 보기`,
    summary: fillName(body.summary, nickname),
    parts: body.parts.map((p) => ({ heading: fillName(p.heading, nickname), body: fillName(p.body, nickname) })),
    model: provider.modelName,
  };
}

export async function getNyFull(personId: string): Promise<NyFull | null> {
  const pool = await db();
  const r = await pool.query<{ content: NyFull }>(`SELECT content FROM topic_readings WHERE person_id = $1 AND topic = $2`, [personId, NY_FULL]);
  return r.rows[0]?.content ?? null;
}

export async function saveNyFull(personId: string, content: NyFull): Promise<NyFull> {
  const pool = await db();
  await pool.query(`INSERT INTO topic_readings (person_id, topic, content, model) VALUES ($1, $2, $3, $4) ON CONFLICT (person_id, topic) DO NOTHING`, [
    personId,
    NY_FULL,
    JSON.stringify(content),
    content.model,
  ]);
  return (await getNyFull(personId)) ?? content;
}
