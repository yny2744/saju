import type { CompletionProvider, SajuJson } from "saju-engine";
import { db } from "@/server/auth/db";
import { NAME_TOKEN, completeWithRetry, extractJson, fillName, getReadingProvider, inventedDaeun } from "@/server/readings/generateReading";
import { sajuFacts } from "@/lib/sajuFacts";
import { BRANCH_HANJA, STEM_HANJA } from "@/lib/pillarView";
import { kstDateString } from "@/lib/manseView";
import { examProfileLines, type ExamProfile } from "@/lib/examProfile";
import { EXAM_DEEP_POINTS, SEASON_INFO, examFactsForPrompt, examSeason, examUnlockTopic, type ExamSeason } from "@/lib/suneung";

/**
 * 수능대박운 깊게 보기 (5,500냥, 수정안 17) - 엔진이 확정한 사실 목록만 근거로 AI가 쓴다.
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
- 소제목 ${EXAM_DEEP_POINTS[season].length}개, 소제목마다 700~900자.
- 합격·불합격이나 점수를 점치거나 단정하지 마세요. "붙는다/떨어진다" 같은 말은 쓰지 마세요. 응원하고, 할 수 있는 행동으로 말하세요.
- 소제목마다 위 [확정 사실] 중 근거를 하나 이상 짚으세요. 목록에 없는 합·충·대운 이름은 쓰지 마세요.
- 마지막 소제목 "남은 작은 빈자리 채우기"는 남은 작은 빈자리(가장 약한 오행)를 행운 꾸러미(색·숫자·방위·물건·간식)로 채우며 마음을 단단히 하는 법을 써 주세요. 겁주지 마세요.
- "부족한"·"모자란"·"결핍" 같은 말 대신 "남은 작은 빈자리"라고 쓰세요. 거의 다 찼고 조금만 채우면 된다는 희망의 말투로 (2026-10-31 유샘).
${EXAM_QUALITY_RULES}
- summary: 맨 위에 놓을 두 문장 응원 요약.

JSON 형식:
{"summary":"...","parts":[{"heading":"...","body":"..."},...]}`;
}

/**
 * 풀이 품질 규칙 (2026-11-13 유샘 - 검수 원칙: 모델이 달라도 사실은 같다 · 근거·자연스러움·중복 없음 · 무료와 유료의 깊이 구분 · 엔진 계산을 바꾸지 않는다)
 */
/** 수능 심층분석 쓰기 시간 한도 - 한 번에 30초쯤 걸려 60초 안에는 다시 쓸 틈이 없다. 라우트 maxDuration 120 (2026-11-13) */
export const EXAM_BUDGET_MS = 110_000;

export const EXAM_QUALITY_RULES = `- 호칭은 늘 "${NAME_TOKEN}님"으로 쓰세요. "님" 한 글자나 "갑목 일간님" 같은 호칭으로 부르지 마세요.
- 무료 풀이가 이미 주제마다 결론 한 줄을 보여 주었습니다. 그 결론을 되풀이하지 말고 왜 그런지(근거), 언제 그런지(시기), 그래서 무엇을 하면 되는지(실천법)까지 풀어 쓰세요.
- "가능성이 높다", "좋은 결과를 얻는다", 점수·등급 상승처럼 결과를 내다보는 말은 쓰지 마세요.
- 확정 사실에 없는 십신·오행·간지 이야기(예: "재성이 드러나지 않는다")는 쓰지 마세요. 간지를 쓸 때는 확정 사실에 적힌 것만 쓰세요.
- 같은 문장이나 같은 조언을 소제목마다 되풀이하지 마세요.`;

const STEMS_KO = ["갑", "을", "병", "정", "무", "기", "경", "신", "임", "계"];
const BRANCHES_KO = ["자", "축", "인", "묘", "진", "사", "오", "미", "신", "유", "술", "해"];
const STEM_H = "甲乙丙丁戊己庚辛壬癸";
const BRANCH_H = "子丑寅卯辰巳午未申酉戌亥";
const HANJA_GZ = new RegExp(`[${STEM_H}][${BRANCH_H}]`, "g");
const HANGUL_GZ = /([갑을병정무기경신임계][자축인묘진사오미신유술해])\s*(?=\(|대운|세운|일진|년)/g;

/** 확정 사실(과 대운 목록)에 나오는 간지만 쓸 수 있다. 다른 간지를 쓰면 그 간지를 돌려준다 */
export function inventedGanzhi(text: string, facts: string, daeun: Array<{ ganzhi: string; hanja: string }> = []): string | null {
  const okH = new Set([...(facts.match(HANJA_GZ) ?? []), ...daeun.map((d) => d.hanja)]);
  const okK = new Set([...Array.from(facts.matchAll(/([갑을병정무기경신임계][자축인묘진사오미신유술해])\(/g)).map((m) => m[1]), ...daeun.map((d) => d.ganzhi)]);
  for (const m of text.match(HANJA_GZ) ?? []) if (!okH.has(m)) return m;
  for (const m of text.matchAll(HANGUL_GZ)) if (!okK.has(m[1])) return m[1];
  return null;
}

/**
 * 간지 검사에 쓰는 "확정 사실" - 지시문에 준 사실 + 원국 네 기둥(엔진 값). 2026-11-13 실결제 시험에서
 *   AI가 원국 기둥(예: 일주)을 짚으면 사실 목록에 없다고 떨어져 풀이가 실패해, 엔진이 계산한 원국 기둥은 허용한다.
 */
export function examCheckFacts(saju: SajuJson, today: string): { text: string; daeun: Array<{ ganzhi: string; hanja: string }> } {
  const sf = sajuFacts(saju, today);
  const p = saju.pillars as unknown as Record<string, { heavenlyStem?: string; earthlyBranch?: string } | null | undefined>;
  const pillars = ["year", "month", "day", "hour"]
    .map((k) => p[k])
    .filter((x): x is { heavenlyStem: string; earthlyBranch: string } => !!x?.heavenlyStem && !!x?.earthlyBranch)
    .map((x) => `${x.heavenlyStem}${x.earthlyBranch}(${STEM_HANJA[x.heavenlyStem] ?? ""}${BRANCH_HANJA[x.earthlyBranch] ?? ""})`);
  // 2026-11-14 검수: 앞뒤 해(작년·올해·내년)의 해 간지도 허용 - "내년 정미년" 같은 자연스러운 말로 풀이가 떨어지지 않게 (60갑자 순서 그대로)
  const y = Number(today.slice(0, 4));
  const years = [y - 1, y, y + 1].map((yy) => {
    const st = STEMS_KO[(((yy - 4) % 10) + 10) % 10];
    const br = BRANCHES_KO[(((yy - 4) % 12) + 12) % 12];
    return `${st}${br}(${STEM_HANJA[st] ?? ""}${BRANCH_HANJA[br] ?? ""})`;
  });
  return { text: `${examFactsForPrompt(saju, today)}\n${pillars.join(" ")}\n${years.join(" ")}`, daeun: sf.daeunList };
}

export function examQualityProblem(text: string): string | null {
  if (/가능성이\s*(매우\s*|아주\s*)?높/.test(text)) return "결과를 내다보는 말(가능성이 높다)";
  if (/좋은\s*결과를\s*(얻|거두|이끌|낼)/.test(text)) return "결과를 내다보는 말(좋은 결과)";
  if (/(^|[\s,.])님(께서|의|은|이|을|에게)\s/.test(text)) return "호칭 '님' 단독 사용";
  return null;
}

export function parseExamDeep(
  raw: string,
  allowedDaeun: string[],
  facts?: { text: string; daeun: Array<{ ganzhi: string; hanja: string }> }
): { summary: string; parts: Array<{ heading: string; body: string }> } {
  const parsed = extractJson(raw) as { summary?: string; parts?: Array<{ heading?: string; body?: string }> };
  const parts = (parsed.parts ?? [])
    .filter((p) => typeof p.heading === "string" && typeof p.body === "string" && p.body.trim().length >= 20)
    .map((p) => ({ heading: p.heading!.trim(), body: p.body!.trim() }));
  if (parts.length < 3) throw new Error("AI 응답의 수능대박운 깊은 풀이가 너무 짧습니다.");
  const text = parts.map((p) => p.body).join("\n");
  const bad = inventedDaeun(text, allowedDaeun);
  if (bad) throw new Error(`AI가 확정 사실에 없는 대운(${bad})을 썼습니다.`);
  if (/(합격|시험|대학|학교)[^.!?]{0,12}(붙는|붙을|붙습|떨어지|떨어질|떨어집)/.test(text)) throw new Error("AI가 합격·불합격을 단정했습니다.");
  if (facts) {
    const all = [typeof parsed.summary === "string" ? parsed.summary : "", ...parts.map((p) => `${p.heading}\n${p.body}`)].join("\n");
    const gz = inventedGanzhi(all, facts.text, facts.daeun);
    if (gz) throw new Error(`AI가 확정 사실에 없는 간지(${gz})를 썼습니다.`);
    const q = examQualityProblem(all);
    if (q) throw new Error(`풀이 품질 규칙 위반: ${q}`);
  }
  return { summary: typeof parsed.summary === "string" ? parsed.summary.trim() : "", parts };
}

export async function generateExamDeep(saju: SajuJson, nickname: string, profile: ExamProfile | null = null, provider: CompletionProvider = getReadingProvider(9000)): Promise<ExamDeep> {
  const today = kstDateString();
  const season = examSeason(today);
  const sf = sajuFacts(saju, today);
  const allowed = sf.daeunList.map((d) => d.ganzhi);
  const facts = examCheckFacts(saju, today);
  const body = await completeWithRetry(provider, buildExamDeepPrompt(saju, today, profile), (raw) => parseExamDeep(raw, allowed, facts), 30_000, EXAM_BUDGET_MS);
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
