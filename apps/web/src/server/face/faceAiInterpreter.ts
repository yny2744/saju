import { parseAIResponse, AIInterpretationFailedError } from "saju-engine";
import type { CompletionProvider } from "saju-engine";
import type { FaceFeatureBuckets, FaceAiResult } from "./types";
import { validateFaceAiResult } from "./validateFaceAiResult";

const BUCKET_LABEL: Record<string, string> = { low: "낮음", mid: "보통", high: "높음" };

const SYSTEM_PROMPT = `당신은 한국 전통 관상학(觀相學) 해석가입니다.

# 데이터 원칙 - 절대 규칙
아래 [얼굴 특징 데이터]는 이미 클라이언트에서 계산되어 검증을 통과한 확정값입니다.
1. 이 값을 재계산하거나 의심하거나 다른 값으로 바꾸지 마세요. 당신은 계산하지 않고 해석만 합니다.
2. 실제 사진을 본 것처럼 묘사하지 마세요("사진 속 눈매가..." 같은 표현 금지) - 주어진 버킷 라벨만 근거로 문장을 작성하세요.
3. 나이, 성별, 인종, 건강 상태, 감정 상태를 추론하거나 언급하지 마세요.
4. 신원 확인이나 실존 인물 식별과 무관한 문화적 해석임을 명심하세요.

# 인연(궁합) 해석 원칙 - 매우 중요
5. 사용자는 상대방의 사진을 제공하지 않았습니다. "상대방의 관상적 특징"은 실제 특정 인물을 분석한 결과가 아니라,
   전통 관상학에서 일반적으로 "이런 얼굴형과 조화롭다"고 이야기되는 통속적 설명입니다. 실제로 관찰하거나
   분석한 것처럼 서술하지 마세요 ("상대방의 얼굴을 보니" 같은 표현 금지).
6. [사용자가 직접 입력한 선호]가 주어진 경우, 이를 참고해서 relationshipInsight.userPreferenceNote에
   반영하세요. 주어지지 않았다면 userPreferenceNote는 null로 응답하세요.
7. 성격·운명·재산·건강·연애 성공 여부나 궁합을 과학적으로 확정하는 표현을 쓰지 마세요("반드시", "확실히" 금지).
   경향성·가능성을 나타내는 표현을 쓰세요("~한 경향이 있다고 전해집니다" 등).

# 출력 형식
반드시 아래 JSON 형식으로만 응답하세요. JSON 외의 다른 텍스트를 붙이지 마세요.
{
  "selfAnalysis": {
    "faceShape": "...", "forehead": "...", "eyes": "...", "nose": "...", "mouth": "...", "jaw": "...",
    "overallSummary": "전통 관상학에 따른 종합 해석 (3~4문장)"
  },
  "relationshipInsight": {
    "traditionalLoveTendency": "연애·관계에서 참고할 수 있는 전통적 해석",
    "idealPartnerTraits": "본인에게 어울리는 인연의 관상적 특징 (전통 관상학 기반 일반론)",
    "partnerFeatureNotes": "그런 인연에게서 흔히 이야기되는 얼굴형·특징에 대한 전통적 해석 (일반론, 실제 인물 아님)",
    "harmonyPoints": "관계에서 조화롭게 살펴볼 수 있는 특징과 유의점",
    "userPreferenceNote": "사용자가 입력한 선호를 반영한 코멘트, 입력이 없으면 null"
  },
  "disclaimer": "이 해석은 전통 문화 콘텐츠이며 실제 인물을 분석하거나 미래를 확정하지 않습니다."
}`;

function buildFacePrompt(buckets: FaceFeatureBuckets, relationshipPreference: string | null): string {
  const lines = [
    "[얼굴 특징 데이터 - 이미 계산 완료, 재계산 금지]",
    `얼굴형(길이/너비 비율): ${BUCKET_LABEL[buckets.faceShape]}`,
    `이마 비율: ${BUCKET_LABEL[buckets.forehead]}`,
    `눈 사이 간격 비율: ${BUCKET_LABEL[buckets.eyeSpacing]}`,
    `코 비율: ${BUCKET_LABEL[buckets.nose]}`,
    `입 비율: ${BUCKET_LABEL[buckets.mouth]}`,
    `턱선 비율: ${BUCKET_LABEL[buckets.jaw]}`,
  ];

  if (relationshipPreference) {
    lines.push("", "[사용자가 직접 입력한 선호]", relationshipPreference);
  }

  lines.push(
    "",
    "위 데이터를 바탕으로 전통 관상학 관점의 해석을 지정된 JSON 형식으로만 작성하세요.",
    "재계산하거나 다른 값으로 바꾸지 마세요."
  );

  return lines.join("\n");
}

const MAX_RETRIES = 2;
const TIMEOUT_MS = 30_000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`관상 AI 응답이 ${ms}ms 안에 도착하지 않았습니다.`)), ms);
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      }
    );
  });
}

/**
 * 유료 관상 심층 해석을 생성한다. saju-engine의 AIInterpretationEngine과 같은
 * 흐름(프롬프트 조립 → Provider 호출(타임아웃) → 파싱 → 스키마 검증 → 실패 시
 * 재시도)을 관상 도메인에 맞게 독립적으로 구현했다 - SajuJson 전용 오케스트레이터를
 * 억지로 재사용하지 않는다(지시서 3조).
 */
export async function interpretFace(
  provider: CompletionProvider,
  buckets: FaceFeatureBuckets,
  relationshipPreference: string | null
): Promise<FaceAiResult> {
  const user = buildFacePrompt(buckets, relationshipPreference);
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_RETRIES + 1; attempt += 1) {
    try {
      const raw = await withTimeout(provider.complete(SYSTEM_PROMPT, user), TIMEOUT_MS);
      const parsed = parseAIResponse(raw);
      return validateFaceAiResult(parsed);
    } catch (err) {
      lastError = err;
    }
  }

  throw new AIInterpretationFailedError("관상 AI 해석 생성에 실패했습니다.", lastError, MAX_RETRIES + 1);
}
