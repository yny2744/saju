import { buildSajuPrompt, AnthropicCompletionProvider, GeminiCompletionProvider } from "saju-engine";
import type { CompletionProvider, SajuJson } from "saju-engine";
import { focusLabel, type Focus } from "@/lib/focus";
import { FOCUS_TOPICS, TOPICS, TOPIC_KEYS, type AnyTopicKey, type TopicKey } from "@/lib/topics";
import { monthPillarsOfYear } from "@/lib/monthPillars";
import { neededEnergy, ENERGY_GUIDE } from "@/lib/neededEnergy";
import { factsForPrompt, sajuFacts } from "@/lib/sajuFacts";
import { FILL } from "@/lib/basic/common";

/**
 * AI 풀이 생성 (2026-10-08 12가지 운 구조).
 *
 *  - 운세 보기(990냥, 2026-10-09~): 고른 운세 하나를 한 번 호출로 풀이. 끝에 "깊게 보기에서 더 볼 거리" 한 줄.
 *  - (예전) 맛보기: 12가지 운을 짧게 한 번씩. 더 이상 팔지 않지만 코드는 시험용으로 남겨 둔다. 4묶음 × 3주제로 나눠 AI를 동시에 부른다(Vercel 60초 제한).
 *    관심 분야 주제는 가장 길게. 주제마다 "깊게 보기에서 더 볼 거리"를 한 줄 남긴다.
 *  - 깊게 보기(주제 하나): 손님이 주제를 누를 때 그 주제만 쓴다(한 번 호출, 소제목 3~4개).
 *
 * 사주 계산 데이터 블록은 엔진의 buildSajuPrompt가 만든 것을 그대로 쓴다(값 재계산 금지).
 * 엔진(saju-engine) 코드는 고치지 않는다 → zip 배포 그대로 가능.
 */

export interface ReadingSection {
  key: string;
  title: string;
  body: string;
  /** 깊게 보기에서 더 다룰 내용 한 줄 */
  deeper: string;
}

export interface ReadingContent {
  sections: ReadingSection[];
  model: string;
}

export interface BasicContent {
  topic: TopicKey;
  title: string;
  body: string;
  /** 깊게 보기에서 더 다룰 내용 한 줄 */
  deeper: string;
  model: string;
}

export interface DeepContent {
  topic: AnyTopicKey;
  title: string;
  summary: string;
  parts: Array<{ heading: string; body: string }>;
  model: string;
}

/** 맛보기 병렬 묶음 */
const TASTE_GROUPS: TopicKey[][] = [
  ["nature", "year", "daeun"],
  ["love", "marriage", "family"],
  ["money", "job", "promotion"],
  ["business", "health", "relationship"],
];

const SYSTEM = `당신은 한국 전통 명리학(사주팔자)을 40년 넘게 풀어 온 정통 명리 해석가입니다.
4070 세대 손님에게 존댓말로, 따뜻하고 품위 있게, 그러나 구체적으로 풀이합니다.

# 데이터 원칙 (절대 규칙)
- [사주 계산 데이터]의 여덟 글자·오행·십신·지장간·합충형파해·12운성·대운·세운·월건은 계산 엔진이 확정한 값입니다.
  다시 계산하거나 다른 값으로 바꾸지 말고, 근거로 인용만 하세요.
- 출생 시간이 없으면 시주 관련 내용은 추측하지 마세요.
- [확정 사실]이 주어지면 그 목록이 최우선입니다. 합·충·12운성·대운·세운은 목록에 있는 것만 말하고, 목록에 없는 합·충이나 다른 대운 이름을 새로 만들지 마세요.
- "지금 지나는 대운"은 [확정 사실]에 적힌 것만 말하세요. 없으면 단정하지 마세요.

# 표현 원칙
- 의학적 진단, 사망·사고·이혼 단정, 투자 종목 추천은 하지 않습니다. 건강은 "기운이 약한 곳·생활 습관" 수준으로.
- 겁주는 말 대신, 조심할 점은 "이렇게 하면 좋습니다"로 바꿔 말합니다.
- 명리 용어(정재, 편관 등)는 쓰되 바로 쉬운 말로 풀어 줍니다.
- 첫 문장은 인사·이름 확인("존함이 ~시군요")·나이대 언급("4070 세대") 없이 바로 풀이로 시작합니다.
- 말투는 "참 좋은 사주인데, 딱 하나 이것이 아쉬워요. 이것만은 꼭 채워 주세요"처럼 칭찬 뒤에 살며시 짚습니다.
- 반드시 지정된 JSON 형식으로만 답합니다. 마크다운·코드블록 없이 JSON만.`;

/**
 * 손님 이름은 AI로 보내지 않는다 (2026-10-09 수정안 14, 개인정보처리방침 "성명 전달 안 함"과 맞춤).
 * AI에는 NAME_TOKEN 만 보내고, 돌아온 풀이에서 서버가 실제 이름으로 바꿔 넣는다.
 */
export const NAME_TOKEN = "{이름}";
const NAME_TOKEN_RE = /[{｛]\s*이름\s*[}｝]/g;

export function fillName(text: string, nickname: string): string {
  return text.replace(NAME_TOKEN_RE, () => nickname); // 함수로 넘겨 이름 속 $ 기호가 특수 문자로 해석되지 않게
}

const NAME_RULE = `손님을 "${NAME_TOKEN}님"이라고 부르세요. "${NAME_TOKEN}"은 실제 이름 대신 쓰는 표시이니 중괄호까지 글자 그대로 쓰세요.`;

function dataBlock(saju: SajuJson): string {
  const user = buildSajuPrompt(saju, "FREE_BASIC").user;
  const cut = user.indexOf("\n# 요청 상품:");
  return cut > 0 ? user.slice(0, cut).trim() : user;
}

// ───────────────────────── 맛보기 ─────────────────────────

export function buildTastePrompt(saju: SajuJson, keys: TopicKey[], focus: Focus | undefined, year: number): string {
  const focusKeys = focus ? FOCUS_TOPICS[focus] : [];
  const lines = keys.map((k) => {
    const isFocus = focusKeys.includes(k);
    const len = isFocus ? "450~600자 (손님이 가장 궁금해한 주제 - 가장 자세히)" : "200~300자";
    const extra = k === "year" ? ` (${year}년 세운 기준)` : "";
    return `- "${k}": ${TOPICS[k].title}${extra} — ${len}`;
  });
  return `${dataBlock(saju)}

# 요청: 맛보기${focus ? ` (가장 궁금한 것: ${focusLabel(focus)})` : ""}

아래 주제를 각각 짧게 풀이하세요. ${NAME_RULE} 맛보기이므로 핵심만 담되 뻔한 말은 피하세요.
${lines.join("\n")}

각 주제마다:
- body: 근거가 되는 사주 요소를 한 번 짚고, 핵심 성향·흐름·조언을 단락 1~2개로.
- deeper: 깊게 보기에서 더 풀어 드릴 내용 한 문장 (예: "재물이 크게 움직이는 나이와 그때의 처신은 깊게 보기에서 자세히 풀어 드립니다.")

JSON 형식:
{"sections":[{"key":"${keys[0]}","body":"...","deeper":"..."}${keys.length > 1 ? ",..." : ""}]}`;
}

/** AI 응답에서 JSON을 꺼낸다 (코드블록·앞뒤 말이 섞여 와도 첫 { ~ 마지막 } 사이를 읽음) */
function extractJson(raw: string): unknown {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("AI 응답에서 JSON을 찾지 못했습니다.");
  return JSON.parse(raw.slice(start, end + 1));
}

export function parseTasteResponse(raw: string, keys: TopicKey[]): ReadingSection[] {
  const parsed = extractJson(raw) as { sections?: Array<{ key?: string; body?: string; deeper?: string }> };
  return keys.map((key) => {
    const s = parsed.sections?.find((x) => x.key === key);
    if (!s || typeof s.body !== "string" || s.body.trim().length < 20) throw new Error(`AI 응답에 "${key}" 풀이가 없습니다.`);
    return { key, title: TOPICS[key].title, body: s.body.trim(), deeper: typeof s.deeper === "string" ? s.deeper.trim() : "" };
  });
}

/** 관심 분야 주제를 맨 앞에, 나머지는 기본 순서 */
export function orderSections(sections: ReadingSection[], focus: Focus | undefined): ReadingSection[] {
  const first: string[] = focus ? FOCUS_TOPICS[focus] : [];
  const order = [...first, ...TOPIC_KEYS.filter((k) => !first.includes(k))];
  return order.map((k) => sections.find((s) => s.key === k)).filter((s): s is ReadingSection => Boolean(s));
}

/** 한 번 실패하면 한 번만 다시 시도 (60초 제한 안에서) */
async function completeWithRetry<T>(provider: CompletionProvider, prompt: string, parse: (raw: string) => T): Promise<T> {
  try {
    return parse(await provider.complete(SYSTEM, prompt));
  } catch {
    return parse(await provider.complete(SYSTEM, prompt));
  }
}

export async function generateTaste(
  saju: SajuJson,
  nickname: string,
  focus: Focus | undefined,
  year: number,
  provider: CompletionProvider = getReadingProvider()
): Promise<ReadingContent> {
  const groups = await Promise.all(
    TASTE_GROUPS.map((keys) => completeWithRetry(provider, buildTastePrompt(saju, keys, focus, year), (raw) => parseTasteResponse(raw, keys)))
  );
  const sections = groups.flat().map((s) => ({ ...s, body: fillName(s.body, nickname), deeper: fillName(s.deeper, nickname) }));
  return { sections: orderSections(sections, focus), model: provider.modelName };
}

// ───────────────────────── 운세 보기 (990) ─────────────────────────

export function buildBasicPrompt(saju: SajuJson, topic: TopicKey, year: number): string {
  const info = TOPICS[topic];
  const extra = topic === "year" ? ` (${year}년 세운 기준)` : "";
  return `${dataBlock(saju)}

# 요청: 운세 보기 - ${info.title}${extra}

아래 운세 하나를 풀이하세요. ${NAME_RULE}
- "${topic}": ${info.title}${extra} — 600~800자, 단락 2~3개

- body: 근거가 되는 사주 요소를 짚고, 타고난 흐름·지금의 흐름·생활 속 조언을 구체적으로. 뻔한 말은 피하세요.
- deeper: 깊게 보기(더 자세한 풀이)에서 이어서 풀어 드릴 내용 한 문장 (예: "재물이 크게 움직이는 나이와 그때의 처신은 깊게 보기에서 자세히 풀어 드립니다.")

JSON 형식:
{"sections":[{"key":"${topic}","body":"...","deeper":"..."}]}`;
}

export async function generateBasic(
  saju: SajuJson,
  nickname: string,
  topic: TopicKey,
  year: number,
  provider: CompletionProvider = getReadingProvider()
): Promise<BasicContent> {
  const [section] = await completeWithRetry(provider, buildBasicPrompt(saju, topic, year), (raw) => parseTasteResponse(raw, [topic]));
  return {
    topic,
    title: TOPICS[topic].title,
    body: fillName(section.body, nickname),
    deeper: fillName(section.deeper, nickname),
    model: provider.modelName,
  };
}

// ───────────────────────── 깊게 보기 ─────────────────────────

/** 주제별로 덧붙일 확정 데이터 (월건·필요한 기운 등 - 계산값이라 AI에게 맡기지 않는다) */
function topicExtraData(saju: SajuJson, topic: AnyTopicKey, year: number): string {
  if (topic === "monthly") {
    const rows = monthPillarsOfYear(year).map((m) => `${m.label}: ${m.ganzhi}월`);
    return `## ${year}년 월건(月建) - 계산 완료, 이 값을 그대로 인용할 것\n${rows.join("\n")}`;
  }
  if (topic === "gaeun") {
    const need = neededEnergy(saju);
    const rows = need.elements.map((el) => {
      const g = ENERGY_GUIDE[el];
      return `${el}: 색 ${g.colors.map((c) => c.name).join("·")} / 방향 ${g.direction} / 숫자 ${g.numbers} / 가까이할 것 ${g.near.join("·")}`;
    });
    return `## 보완하면 좋은 오행 - 계산 완료 (${need.reason === "lacking" ? "원국에 비어 있음" : "원국에서 가장 약함"})\n${rows.join("\n")}`;
  }
  return "";
}

/**
 * 깊게 보기 (2026-10-10 수정안 30): 판정은 엔진이 끝낸 "확정 사실 목록"만 근거로 쓰게 묶는다.
 * 가벼운 모델(flash-lite)이 표를 잘못 읽어 근거를 지어내던 문제를 막고, 분량을 4,000~5,000자로 늘린다.
 * 마지막 소제목은 늘 "꼭 채워야 할 하나" (부족한 기운 → 채우는 것) - 류결사주 핵심 수익화 원칙.
 */
export function buildDeepPrompt(saju: SajuJson, topic: AnyTopicKey, year: number, today?: string): string {
  const info = TOPICS[topic];
  const extra = topicExtraData(saju, topic, year);
  const f = sajuFacts(saju, today);
  const need = f.needed.elements[0];
  const fl = FILL[need];
  const monthly = topic === "monthly";
  const lengthRule = monthly
    ? "열두 달을 빠짐없이 달마다 하나의 소제목(12개), 달마다 4~6문장, 전체 3,500~4,500자. 마지막에 13번째 소제목으로 \"꼭 채워야 할 하나\"를 덧붙이세요"
    : "소제목 5개, 소제목마다 800~1,000자, 전체 4,000~5,000자";
  return `# 확정 사실 (계산 엔진이 판정까지 끝낸 값 - 근거는 이 목록에서만 가져오세요)
${factsForPrompt(f)}
- 부족한 기운을 채우는 것(${need}): 색 ${fl.colors} / 방위 ${fl.direction} / 숫자 ${fl.numbers} / 동물 ${fl.animal} / 식물 ${fl.plant} / 물건 ${fl.object} / 생활 ${fl.habit}
${extra ? `\n${extra}\n` : ""}
# 요청: 깊게 보기 - ${info.title}${topic === "year" || monthly ? ` (기준 연도: ${year}년)` : ""}

${NAME_RULE} 아래 내용을 깊이 있게 풀이하세요.
${info.deepPoints.map((p) => `- ${p}`).join("\n")}
- (마지막 소제목, 반드시) "꼭 채워야 할 하나": 칭찬으로 시작해 "딱 하나 아쉬운 것"으로 부족한 기운(${f.needed.elements.join("·")})을 살며시 짚고, 그것이 ${info.title}에서 어떤 아쉬움으로 나타나는지, 위 "채우는 것" 목록으로 어떻게 채우는지, 곁에 두면 좋은 사람까지. 겁주지 말 것.

규칙:
- ${lengthRule}.
- 소제목마다 위 [확정 사실] 중 근거를 하나 이상 짚으세요. 목록에 없는 합·충·대운 이름은 쓰지 마세요.
- 시기를 말할 때는 대운 흐름의 나이와 ${year}년 같은 연도를 구체적으로 쓰세요.
- summary: 맨 위에 놓을 두 문장 요약 (첫 문장은 칭찬, 둘째 문장은 "딱 하나" 아쉬운 점).

JSON 형식:
{"summary":"...","parts":[{"heading":"...","body":"..."},...]}`;
}

/** 확정 사실에 없는 대운 이름을 지어냈는지 (예: "무술 대운" - 목록에 있는 대운만 허용) */
export function inventedDaeun(text: string, allowed: string[]): string | null {
  for (const m of text.matchAll(/([갑을병정무기경신임계][자축인묘진사오미신유술해])\s*대운/g)) {
    if (!allowed.includes(m[1])) return m[1];
  }
  return null;
}

export function parseDeepResponse(raw: string, topic: AnyTopicKey, allowedDaeun?: string[]): Omit<DeepContent, "model"> {
  const parsed = extractJson(raw) as { summary?: string; parts?: Array<{ heading?: string; body?: string }> };
  const parts = (parsed.parts ?? [])
    .filter((p) => typeof p.heading === "string" && typeof p.body === "string" && p.body.trim().length >= 20)
    .map((p) => ({ heading: p.heading!.trim(), body: p.body!.trim() }));
  const min = topic === "monthly" ? 10 : 3;
  if (parts.length < min) throw new Error(`AI 응답의 "${topic}" 깊은 풀이가 너무 짧습니다.`);
  if (allowedDaeun) {
    const bad = inventedDaeun(parts.map((p) => p.body).join("\n"), allowedDaeun);
    if (bad) throw new Error(`AI가 확정 사실에 없는 대운(${bad})을 썼습니다.`);
  }
  return { topic, title: TOPICS[topic].title, summary: typeof parsed.summary === "string" ? parsed.summary.trim() : "", parts };
}

export async function generateDeep(
  saju: SajuJson,
  nickname: string,
  topic: AnyTopicKey,
  year: number,
  provider: CompletionProvider = getReadingProvider(9000)
): Promise<DeepContent> {
  const allowed = sajuFacts(saju).daeunList.map((d) => d.ganzhi);
  const body = await completeWithRetry(provider, buildDeepPrompt(saju, topic, year), (raw) => parseDeepResponse(raw, topic, allowed));
  return {
    ...body,
    summary: fillName(body.summary, nickname),
    parts: body.parts.map((p) => ({ heading: fillName(p.heading, nickname), body: fillName(p.body, nickname) })),
    model: provider.modelName,
  };
}

// ───────────────────────── AI 제공자 ─────────────────────────

export function getReadingProvider(maxTokens = 3500): CompletionProvider {
  if (process.env.ANTHROPIC_API_KEY) {
    return new AnthropicCompletionProvider({ model: process.env.SAJU_READING_MODEL || undefined, maxTokens });
  }
  if (process.env.GEMINI_API_KEY) return new GeminiCompletionProvider({ maxOutputTokens: maxTokens });
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_MOCK_IN_PRODUCTION !== "true") {
    throw new Error("ANTHROPIC_API_KEY가 설정되지 않아 유료 풀이를 만들 수 없습니다.");
  }
  return devReadingProvider();
}

/** 키가 없는 로컬 개발용 - 실제 풀이가 아님을 분명히 적는다 */
function devReadingProvider(): CompletionProvider {
  const NOTE = "(개발 환경 - 실제 AI 풀이 아님)";
  return {
    providerName: "dev-fallback",
    modelName: "dev-fallback-no-llm",
    async complete(_system: string, user: string): Promise<string> {
      if (user.includes("# 요청: 깊게 보기")) {
        const n = user.includes("열두 달") ? 13 : 5;
        return JSON.stringify({
          summary: `${NOTE} 요약 자리입니다.`,
          parts: Array.from({ length: n }, (_, i) => ({ heading: `소제목 ${i + 1}`, body: `${NOTE} 깊은 풀이 단락 자리입니다. 실제 배포에서는 AI가 씁니다.` })),
        });
      }
      const keys = [...user.matchAll(/^- "(\w+)":/gm)].map((m) => m[1]);
      return JSON.stringify({
        sections: keys.map((key) => ({
          key,
          body: `${NOTE} ${TOPICS[key as TopicKey]?.title ?? key} 풀이 자리입니다. 실제 배포에서는 AI가 씁니다.`,
          deeper: "더 깊은 내용은 깊게 보기에서 풀어 드립니다.",
        })),
      });
    },
  };
}
