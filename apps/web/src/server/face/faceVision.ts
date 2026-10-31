import { TENANT } from "@/tenants";
import { PRICE } from "@/lib/yeopjeon";
import { parseAIResponse } from "saju-engine";
import type { FaceAiResult, FaceFeatureBuckets } from "./types";
import { validateFaceAiResult } from "./validateFaceAiResult";
import { getFaceCompletionProvider } from "./faceAiProvider";
import { interpretFace } from "./faceAiInterpreter";
import { RETRY, getReadingProvider, isTransientAiError } from "@/server/readings/generateReading";
import { partnerBuckets, partnerSummary } from "@/lib/facePartner";

/**
 * 관상 심층 풀이 (2026-10-12 수정안 53) - 유료 4,900냥.
 *
 *  - 손님이 동의하면 사진(작은 JPEG)을 Gemini에 함께 보내 AI가 얼굴을 직접 보고 풀이한다.
 *    사진은 이 요청 안에서만 쓰고 어디에도 저장하지 않는다.
 *  - 사진이 없거나(동의 안 함·다른 기기) 사진 풀이가 끝내 안 되면 얼굴 비율(버킷)만으로 AI가 풀이한다.
 *  - 무료 관상은 여기를 쓰지 않는다 (규칙 엔진, AI 없음).
 */

export interface FaceDeepResult extends FaceAiResult {
  /** 사진에서 직접 본 특징 (눈썹 결·점·주름·인상 등). 사진 없이 쓴 풀이는 null */
  photoHighlights: string | null;
  /** 관상과 사주가 만나는 자리 (수정안 59). 사주 없이 쓴 풀이는 null */
  sajuLink?: string | null;
  /** 사진을 실제로 보고 썼는지 */
  photoUsed: boolean;
  model: string;
}

const BUCKET_LABEL: Record<string, string> = { low: "낮음", mid: "보통", high: "높음" };

export const FACE_DEEP_SYSTEM = `당신은 한국 전통 관상학(觀相學) 해석가 "${TENANT.brand.persona}"입니다. 손님이 ${PRICE.FACE.toLocaleString("ko-KR")}냥을 내고 받는 심층 풀이를 씁니다.

# 원칙
1. [얼굴 비율 데이터]는 이미 측정된 값입니다. 다시 재거나 바꾸지 마세요.
2. 사진이 함께 오면 사진에서 실제로 보이는 것(눈썹 결과 모양, 눈매, 콧방울, 입꼬리, 귀, 점, 이마 주름, 전체 인상)을 근거로 쓰세요.
   보이지 않는 것은 지어내지 마세요. 사진이 없으면 비율 데이터만 근거로 쓰고, 사진을 본 것처럼 쓰지 마세요.
3. 사진으로 나이·성별·인종·건강·질병·감정 상태를 추측하지 마세요(나이·성별은 [사주]에 적힌 것만 씁니다). 실존 인물(연예인 등)과 닮았다는 말도 하지 마세요.
4. 운명·재산·궁합을 단정하지 마세요("반드시", "확실히" 금지). "~한 상으로 봅니다", "~라고 전해집니다"처럼 쓰세요.
5. 단점도 숨기지 말되, 늘 "이렇게 채우면 좋다"는 방향으로 따뜻하게 마무리하세요.
6. 인연(상대) 이야기는 실제 특정 인물이 아니라 "이런 상과 잘 어울린다고 전해진다"는 일반론입니다.
7. 손님을 "손님"이라 부르고, 존댓말로 쉽게 쓰세요. 한자 용어는 괄호로 짧게 풀어 주세요.
8. [사주]가 주어지면 관상과 사주를 함께 봅니다. 얼굴에 드러난 기운과 사주의 일간·오행·남은 작은 빈자리(가장 약한 기운)가 어떻게 맞물리는지,
   얼굴이 사주의 아쉬운 기운을 채워 주는지 또는 더 드러내는지를 sajuLink에 풀어 주세요. [사주]의 사실만 근거로 쓰고 새 간지를 지어내지 마세요.
   인연 항목에서도 사주의 남은 작은 빈자리를 채워 줄 인연이라는 관점을 함께 담아 주세요. "부족한" 대신 "남은 작은 빈자리"라고 쓰세요.

# 분량
- 부위별(faceShape·forehead·eyes·nose·mouth·jaw): 각 3~4문장
- overallSummary: 6~8문장 (삼정의 균형, 이 얼굴의 가장 큰 복, 아쉬운 점과 채우는 법)
- photoHighlights: 사진이 있으면 사진에서 눈에 띈 특징 3~5가지를 4~6문장으로, 사진이 없으면 null
- sajuLink: [사주]가 있으면 6~8문장 (관상과 사주가 만나는 자리 · 채우는 법), 없으면 null
- 인연 항목 넷: 각 3~5문장

# 출력 - 아래 JSON만 (다른 글 붙이지 말 것)
{
  "selfAnalysis": { "faceShape": "", "forehead": "", "eyes": "", "nose": "", "mouth": "", "jaw": "", "overallSummary": "" },
  "photoHighlights": "" 또는 null,
  "sajuLink": "" 또는 null,
  "relationshipInsight": {
    "traditionalLoveTendency": "연애·관계에서 보이는 이 얼굴의 전통적 경향",
    "idealPartnerTraits": "잘 어울리는 인연의 관상 (이마·눈·코·입·턱을 구체적으로)",
    "partnerFeatureNotes": "그런 인연의 얼굴에서 흔히 이야기되는 성품 (일반론)",
    "harmonyPoints": "함께할 때 살필 점과 서로 채워 주는 법",
    "userPreferenceNote": "손님이 적은 선호에 대한 코멘트, 없으면 null"
  },
  "disclaimer": "이 풀이는 전통 관상학을 바탕으로 한 문화 콘텐츠이며 미래를 확정하지 않습니다."
}`;

/** 관상 심층 풀이에 함께 넣는 사주 (수정안 59) - sajuFacts로 만든 확정 사실 목록 */
export interface FaceSaju {
  name: string;
  hanjaName: string | null;
  birth: string;
  facts: string;
}

export function buildFaceDeepPrompt(buckets: FaceFeatureBuckets, preference: string | null, hasPhoto: boolean, saju: FaceSaju | null = null): string {
  const lines = [
    "[얼굴 비율 데이터 - 측정 완료]",
    `얼굴형(길이/너비): ${BUCKET_LABEL[buckets.faceShape]}`,
    `이마 비율: ${BUCKET_LABEL[buckets.forehead]}`,
    `눈 사이 간격: ${BUCKET_LABEL[buckets.eyeSpacing]}`,
    `코 비율(길이/너비): ${BUCKET_LABEL[buckets.nose]}`,
    `입 너비: ${BUCKET_LABEL[buckets.mouth]}`,
    `턱 너비: ${BUCKET_LABEL[buckets.jaw]}`,
    "",
    hasPhoto ? "[사진] 손님이 해석에 쓰도록 동의한 정면 사진이 함께 있습니다." : "[사진] 없음 - 비율 데이터만으로 쓰세요. photoHighlights는 null.",
    "",
    "[손님과 음양이 맞는 인연의 얼굴 특징 (규칙으로 정함)]",
    partnerSummary(partnerBuckets(buckets)),
    "idealPartnerTraits는 위 인연의 특징과 어긋나지 않게, 왜 손님과 잘 맞는지 함께 풀어 주세요. 성별은 정하지 마세요.",
  ];
  if (saju) {
    lines.push("", `[사주 - 같은 손님: ${saju.name}${saju.hanjaName ? `(${saju.hanjaName})` : ""} · ${saju.birth}]`, saju.facts);
  } else {
    lines.push("", "[사주] 없음 - sajuLink는 null.");
  }
  if (preference) lines.push("", "[손님이 적은 연애·관계 선호]", preference);
  lines.push("", "위 원칙과 분량을 지켜 JSON으로만 답하세요.");
  return lines.join("\n");
}

/** AI 답 → 검사 (사진 특징 칸은 사진을 봤을 때만 남긴다) */
export function parseFaceDeep(raw: string, photoUsed: boolean, model: string): FaceDeepResult {
  const obj = parseAIResponse(raw) as Record<string, unknown>;
  const base = validateFaceAiResult(obj);
  const ph = obj.photoHighlights;
  const sl = obj.sajuLink;
  return {
    ...base,
    photoHighlights: photoUsed && typeof ph === "string" && ph.trim() ? ph.trim() : null,
    sajuLink: typeof sl === "string" && sl.trim() ? sl.trim() : null,
    photoUsed,
    model,
  };
}

/** data:image/jpeg;base64,... → { mime, data } (그 밖의 형식·너무 큰 사진은 null) */
export const MAX_PHOTO_BYTES = 1_500_000;
export function parsePhotoDataUrl(v: unknown): { mime: string; data: string } | null {
  if (typeof v !== "string") return null;
  const m = v.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
  if (!m) return null;
  if (Math.floor((m[2].length * 3) / 4) > MAX_PHOTO_BYTES) return null;
  return { mime: m[1], data: m[2] };
}

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function callGeminiVision(system: string, user: string, photo: { mime: string; data: string }): Promise<{ text: string; model: string }> {
  const model = process.env.SAJU_GEMINI_MODEL || "gemini-2.5-flash-lite";
  let res: Response;
  try {
    res = await fetch(`${GEMINI_BASE}/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ inline_data: { mime_type: photo.mime, data: photo.data } }, { text: user }] }],
        generationConfig: { maxOutputTokens: 6000, responseMimeType: "application/json" },
      }),
    });
  } catch (e) {
    throw new Error(`Gemini 사진 풀이 네트워크 오류: ${e instanceof Error ? e.message : String(e)}`);
  }
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`Gemini 사진 풀이 오류 (status ${res.status}): ${t.slice(0, 300)}`);
  }
  const data = (await res.json().catch(() => null)) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> }; finishReason?: string }> } | null;
  const text = data?.candidates?.[0]?.content?.parts?.find((p) => typeof p?.text === "string")?.text;
  if (!text) throw new Error(`Gemini 사진 풀이 응답이 비었어요 (${data?.candidates?.[0]?.finishReason ?? "이유 없음"})`);
  return { text, model };
}

/**
 * 심층 풀이 쓰기 (전체 55초 안에서). photo 가 있고 Gemini 키가 있으면 사진을 보고 쓰고(붐빔 오류는 다시 시도),
 * 끝내 안 되면 사진 없이 비율만으로 쓴다. 사진 없이 쓴 풀이는 photoUsed=false.
 */
export async function writeFaceDeep(
  buckets: FaceFeatureBuckets,
  preference: string | null,
  photo: { mime: string; data: string } | null,
  saju: FaceSaju | null = null
): Promise<FaceDeepResult> {
  const start = Date.now();
  const left = () => RETRY.budgetMs - (Date.now() - start);

  if (photo && process.env.GEMINI_API_KEY) {
    const user = buildFaceDeepPrompt(buckets, preference, true, saju);
    for (let i = 0; ; i++) {
      try {
        const { text, model } = await callGeminiVision(FACE_DEEP_SYSTEM, user, photo);
        return parseFaceDeep(text, true, model);
      } catch (e) {
        const delay = RETRY.delays[i];
        // 사진 풀이를 다시 해 볼 시간이 없거나(사진 없는 풀이 몫 25초는 남긴다), 붐빔이 아닌 오류가 두 번이면 사진 없이 쓴다
        const giveUp = delay === undefined || left() - delay < 25_000 + 20_000 || (!isTransientAiError(e) && i >= 1);
        if (giveUp) {
          // eslint-disable-next-line no-console
          console.warn("[face] 사진 풀이 실패 - 비율만으로 씁니다:", e instanceof Error ? e.message : e);
          break;
        }
        await sleep(delay);
      }
    }
  }

  // 사진 없이: 같은 원칙의 글을 비율만으로 (키가 없는 개발 환경은 개발용 글)
  if (!process.env.ANTHROPIC_API_KEY && !process.env.GEMINI_API_KEY) {
    const dev = getFaceCompletionProvider();
    const base = await interpretFace(dev, buckets, preference);
    return { ...base, photoHighlights: null, sajuLink: saju ? `${saju.name}님의 사주와 관상이 만나는 자리 (개발 환경 - 실제 AI 풀이 아님)` : null, photoUsed: false, model: dev.modelName };
  }
  const provider = getReadingProvider(6000);
  const user = buildFaceDeepPrompt(buckets, preference, false, saju);
  let last: unknown;
  for (let i = 0; ; i++) {
    try {
      return parseFaceDeep(await provider.complete(FACE_DEEP_SYSTEM, user), false, provider.modelName);
    } catch (e) {
      last = e;
      const delay = RETRY.delays[i];
      if (delay === undefined || left() - delay < 20_000) break;
      await sleep(delay);
    }
  }
  throw last;
}
