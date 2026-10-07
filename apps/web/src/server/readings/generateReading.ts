import { buildSajuPrompt, AnthropicCompletionProvider, GeminiCompletionProvider } from "saju-engine";
import type { CompletionProvider, SajuJson } from "saju-engine";
import { focusLabel, type Focus } from "@/lib/focus";

/**
 * 990원 사주보기 (2026-10-06, 유샘 확정 상용화 구조의 첫 유료 상품).
 *
 * - 사주 계산 데이터 블록은 엔진의 buildSajuPrompt가 만드는 것을 그대로 쓰고(값 재계산 금지 원칙 유지),
 *   요청 부분만 이 상품용으로 새로 쓴다. 엔진(saju-engine) 코드는 고치지 않는다 → zip 배포 그대로 가능.
 * - Vercel 함수 시간 제한 때문에 주제를 세 묶음으로 나눠 AI를 동시에(병렬) 부른다.
 * - ③ 가장 궁금한 것(focus)이 있으면 그 주제를 가장 길고 자세하게 쓰게 한다.
 * - 각 주제 끝은 다음 단계(4,900원 이어보기)로 자연스럽게 이어지도록 "더 깊이 볼 거리"를 한 줄 남긴다.
 */

export type ReadingSectionKey = "nature" | "love" | "money" | "career" | "health" | "relationship" | "year";

export interface ReadingSection {
  key: ReadingSectionKey;
  title: string;
  body: string;
  /** 4,900원 이어보기에서 더 깊이 다룰 내용 한 줄 (화면에서 "이어보기" 유도) */
  deeper: string;
}

export interface ReadingContent {
  sections: ReadingSection[];
  model: string;
}

export const SECTION_TITLES: Record<ReadingSectionKey, string> = {
  nature: "타고난 성향",
  love: "연애·결혼",
  money: "재물",
  career: "직업·일",
  health: "건강",
  relationship: "인간관계",
  year: "올해의 흐름",
};

/** 관심 분야 → 가장 자세히 쓸 주제 (직업·재물은 둘 다) */
const FOCUS_SECTIONS: Record<Focus, ReadingSectionKey[]> = {
  love: ["love"],
  work: ["career", "money"],
  health: ["health"],
  relationship: ["relationship"],
};

/** 세 묶음 - 병렬 호출 단위 */
const GROUPS: ReadingSectionKey[][] = [
  ["nature", "year"],
  ["love", "money"],
  ["career", "health", "relationship"],
];

const SYSTEM = `당신은 한국 전통 명리학(사주팔자)을 40년 넘게 풀어 온 정통 명리 해석가입니다.
4070 세대 손님에게 존댓말로, 따뜻하고 품위 있게, 그러나 구체적으로 풀이합니다.

# 데이터 원칙 (절대 규칙)
- [사주 계산 데이터]의 여덟 글자·오행·십신·지장간·합충형파해·12운성·대운·세운은 계산 엔진이 확정한 값입니다.
  다시 계산하거나 다른 값으로 바꾸지 말고, 근거로 인용만 하세요.
- 출생 시간이 없으면 시주 관련 내용은 추측하지 마세요.
- "지금 몇 번째 대운"인지 단정하지 마세요(주어진 대운 목록의 흐름으로만 설명).

# 표현 원칙
- 의학적 진단, 사망·사고·이혼 단정, 투자 종목 추천은 하지 않습니다. 건강은 "기운이 약한 곳·생활 습관" 수준으로.
- 겁주는 말 대신, 조심할 점은 "이렇게 하면 좋습니다"로 바꿔 말합니다.
- 명리 용어(정재, 편관 등)는 쓰되 바로 쉬운 말로 풀어 줍니다.
- 반드시 지정된 JSON 형식으로만 답합니다. 마크다운·코드블록 없이 JSON만.`;

function dataBlock(saju: SajuJson): string {
  const user = buildSajuPrompt(saju, "FREE_BASIC").user;
  const cut = user.indexOf("\n# 요청 상품:");
  return cut > 0 ? user.slice(0, cut).trim() : user;
}

export function buildGroupPrompt(
  saju: SajuJson,
  nickname: string,
  keys: ReadingSectionKey[],
  focus: Focus | undefined,
  year: number
): string {
  const focusKeys = focus ? FOCUS_SECTIONS[focus] : [];
  const lines = keys.map((k) => {
    const isFocus = focusKeys.includes(k);
    const len = isFocus ? "700~900자 (손님이 가장 궁금해한 주제 - 가장 자세히)" : "350~500자";
    const extra = k === "year" ? ` (${year}년 세운 기준, 상반기·하반기 흐름 포함)` : "";
    return `- "${k}": ${SECTION_TITLES[k]}${extra} — ${len}`;
  });
  return `${dataBlock(saju)}

# 요청: 990원 사주보기 (손님 이름: ${nickname}${focus ? `, 가장 궁금한 것: ${focusLabel(focus)}` : ""})

아래 주제를 각각 풀이하세요. 손님을 "${nickname}님"이라고 부르세요.
${lines.join("\n")}

각 주제마다:
- body: 근거가 되는 사주 요소(예: "일간 경금에 정재가 없어")를 한두 번 짚고, 성향·흐름·실생활 조언을 단락 2~4개로.
- deeper: 더 깊이 들여다볼 만한 내용 한 문장 (예: "재물이 크게 움직이는 나이와 그때의 처신은 이어보기에서 자세히 풀어 드립니다.")

JSON 형식:
{"sections":[{"key":"${keys[0]}","body":"...","deeper":"..."}${keys.length > 1 ? ',...' : ""}]}`;
}

export function getReadingProvider(): CompletionProvider {
  if (process.env.ANTHROPIC_API_KEY) {
    return new AnthropicCompletionProvider({ model: process.env.SAJU_READING_MODEL || undefined, maxTokens: 3500 });
  }
  if (process.env.GEMINI_API_KEY) return new GeminiCompletionProvider({ maxOutputTokens: 3500 });
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_MOCK_IN_PRODUCTION !== "true") {
    throw new Error("ANTHROPIC_API_KEY가 설정되지 않아 유료 풀이를 만들 수 없습니다.");
  }
  return devReadingProvider();
}

/** 키가 없는 로컬 개발용 - 실제 풀이가 아님을 분명히 적는다 */
function devReadingProvider(): CompletionProvider {
  return {
    providerName: "dev-fallback",
    modelName: "dev-fallback-no-llm",
    async complete(_system: string, user: string): Promise<string> {
      const keys = [...user.matchAll(/^- "(\w+)":/gm)].map((m) => m[1]);
      return JSON.stringify({
        sections: keys.map((key) => ({
          key,
          body: `(개발 환경 - 실제 AI 풀이 아님) ${SECTION_TITLES[key as ReadingSectionKey] ?? key} 풀이 자리입니다.\n\n두 번째 단락 자리입니다.`,
          deeper: "더 깊은 내용은 이어보기에서 풀어 드립니다.",
        })),
      });
    },
  };
}

/** AI 응답에서 JSON을 꺼낸다 (코드블록·앞뒤 말이 섞여 와도 첫 { ~ 마지막 } 사이를 읽음) */
export function parseGroupResponse(raw: string, keys: ReadingSectionKey[]): ReadingSection[] {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("AI 응답에서 JSON을 찾지 못했습니다.");
  const parsed = JSON.parse(raw.slice(start, end + 1)) as { sections?: Array<{ key?: string; body?: string; deeper?: string }> };
  const out: ReadingSection[] = [];
  for (const key of keys) {
    const s = parsed.sections?.find((x) => x.key === key);
    if (!s || typeof s.body !== "string" || s.body.trim().length < 20) throw new Error(`AI 응답에 "${key}" 풀이가 없습니다.`);
    out.push({ key, title: SECTION_TITLES[key], body: s.body.trim(), deeper: typeof s.deeper === "string" ? s.deeper.trim() : "" });
  }
  return out;
}

/** 관심 분야를 맨 앞에, 나머지는 기본 순서 */
export function orderSections(sections: ReadingSection[], focus: Focus | undefined): ReadingSection[] {
  const base: ReadingSectionKey[] = ["nature", "love", "money", "career", "health", "relationship", "year"];
  const first = focus ? FOCUS_SECTIONS[focus] : [];
  const order = [...first, ...base.filter((k) => !first.includes(k))];
  return order.map((k) => sections.find((s) => s.key === k)).filter((s): s is ReadingSection => Boolean(s));
}

async function runGroup(provider: CompletionProvider, prompt: string, keys: ReadingSectionKey[]): Promise<ReadingSection[]> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      return parseGroupResponse(await provider.complete(SYSTEM, prompt), keys);
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr;
}

export async function generateSajuReading(
  saju: SajuJson,
  nickname: string,
  focus: Focus | undefined,
  year: number,
  provider: CompletionProvider = getReadingProvider()
): Promise<ReadingContent> {
  const groups = await Promise.all(GROUPS.map((keys) => runGroup(provider, buildGroupPrompt(saju, nickname, keys, focus, year), keys)));
  return { sections: orderSections(groups.flat(), focus), model: provider.modelName };
}
