import type { CompletionProvider, SajuJson } from "saju-engine";
import { db } from "@/server/auth/db";
import { NAME_TOKEN, completeWithRetry, extractJson, fillName, getReadingProvider, inventedDaeun } from "@/server/readings/generateReading";
import { sajuFacts } from "@/lib/sajuFacts";
import { kstDateString } from "@/lib/manseView";
import { examProfileLines, type ExamProfile } from "@/lib/examProfile";
import { EXAM_DEEP_POINTS, SEASON_INFO, examFactsForPrompt, examSeason, examUnlockTopic, type ExamSeason } from "@/lib/suneung";

/**
 * 수능운 깊게 보기 (5,500냥, 수정안 17) - 엔진이 확정한 사실 목록만 근거로 AI가 쓴다.
 * 시즌마다 따로 저장 (topic_readings.topic = exam_<시즌>_deep). 손님 이름은 AI로 보내지 않는다.
 */

export interface ExamDeep {
  season: ExamSeason;
  title: string;
  summary: string;
  parts: Array<{ heading: string; body: string }>;
  model: string;
}

export function buildExamDeepPrompt(saju: SajuJson, today: string = kstDateString(), profile: ExamProfile | null = null): string {
  const season = examSeason(today);
  const info = SEASON_INFO[season];
  // 2026-10-30: 수험생이 고른 과목 (없으면 이 칸을 넣지 않는다)
  const subj = examProfileLines(profile);
  const subjBlock = subj
    ? `
# 수험생이 알려 준 과목 (사주 근거가 아니라 풀이를 구체적으로 만드는 정보)
${subj}
- 수능 교시: 1교시 국어 · 2교시 수학 · 3교시 영어 · 4교시 한국사·탐구 · 5교시 제2외국어/한문
"과목별 공부 리듬"과 "교시마다 기운의 흐름"에서는 위 과목 이름을 직접 짚어 주세요. 과목 성적을 짐작하거나 단정하지는 마세요.
`
    : "";
  return `# 확정 사실 (계산 엔진이 판정까지 끝낸 값 - 근거는 이 목록에서만 가져오세요)
${examFactsForPrompt(saju, today)}
${subjBlock}
# 요청: 깊게 보기 - ${info.title}

이 풀이는 수험생 본인이나 수험생의 부모님이 읽습니다. 수험생을 "${NAME_TOKEN}님"이라고 부르세요. "${NAME_TOKEN}"은 실제 이름 대신 쓰는 표시이니 중괄호까지 글자 그대로 쓰세요.
아래 내용을 소제목 하나씩 깊이 있게 풀이하세요.
${EXAM_DEEP_POINTS[season].map((p) => `- ${p}`).join("\n")}

규칙:
- 소제목 5개, 소제목마다 700~900자, 전체 3,500~4,500자.
- 합격·불합격이나 점수를 점치거나 단정하지 마세요. "붙는다/떨어진다" 같은 말은 쓰지 마세요. 응원하고, 할 수 있는 행동으로 말하세요.
- 소제목마다 위 [확정 사실] 중 근거를 하나 이상 짚으세요. 목록에 없는 합·충·대운 이름은 쓰지 마세요.
- 마지막 소제목 "꼭 채워야 할 하나"는 부족한 오행과 행운 꾸러미(색·숫자·방위·물건·간식)로 마음을 단단히 하는 법을 써 주세요. 겁주지 마세요.
- summary: 맨 위에 놓을 두 문장 응원 요약.

JSON 형식:
{"summary":"...","parts":[{"heading":"...","body":"..."},...]}`;
}

export function parseExamDeep(raw: string, allowedDaeun: string[]): { summary: string; parts: Array<{ heading: string; body: string }> } {
  const parsed = extractJson(raw) as { summary?: string; parts?: Array<{ heading?: string; body?: string }> };
  const parts = (parsed.parts ?? [])
    .filter((p) => typeof p.heading === "string" && typeof p.body === "string" && p.body.trim().length >= 20)
    .map((p) => ({ heading: p.heading!.trim(), body: p.body!.trim() }));
  if (parts.length < 3) throw new Error("AI 응답의 수능운 깊은 풀이가 너무 짧습니다.");
  const text = parts.map((p) => p.body).join("\n");
  const bad = inventedDaeun(text, allowedDaeun);
  if (bad) throw new Error(`AI가 확정 사실에 없는 대운(${bad})을 썼습니다.`);
  if (/(합격|시험|대학|학교)[^.!?]{0,12}(붙는|붙을|붙습|떨어지|떨어질|떨어집)/.test(text)) throw new Error("AI가 합격·불합격을 단정했습니다.");
  return { summary: typeof parsed.summary === "string" ? parsed.summary.trim() : "", parts };
}

export async function generateExamDeep(saju: SajuJson, nickname: string, profile: ExamProfile | null = null, provider: CompletionProvider = getReadingProvider(9000)): Promise<ExamDeep> {
  const today = kstDateString();
  const season = examSeason(today);
  const allowed = sajuFacts(saju, today).daeunList.map((d) => d.ganzhi);
  const body = await completeWithRetry(provider, buildExamDeepPrompt(saju, today, profile), (raw) => parseExamDeep(raw, allowed));
  return {
    season,
    title: SEASON_INFO[season].title,
    summary: fillName(body.summary, nickname),
    parts: body.parts.map((p) => ({ heading: fillName(p.heading, nickname), body: fillName(p.body, nickname) })),
    model: provider.modelName,
  };
}

export async function getExamDeep(personId: string, season: ExamSeason): Promise<ExamDeep | null> {
  const pool = await db();
  const r = await pool.query<{ content: ExamDeep }>(`SELECT content FROM topic_readings WHERE person_id = $1 AND topic = $2`, [personId, examUnlockTopic(season, true)]);
  return r.rows[0]?.content ?? null;
}

export async function saveExamDeep(personId: string, content: ExamDeep): Promise<ExamDeep> {
  const pool = await db();
  await pool.query(`INSERT INTO topic_readings (person_id, topic, content, model) VALUES ($1, $2, $3, $4) ON CONFLICT (person_id, topic) DO NOTHING`, [
    personId,
    examUnlockTopic(content.season, true),
    JSON.stringify(content),
    content.model,
  ]);
  return (await getExamDeep(personId, content.season)) ?? content;
}
