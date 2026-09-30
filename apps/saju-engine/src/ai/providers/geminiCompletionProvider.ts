import type { CompletionProvider } from "../CompletionProvider";
import { AIProviderError } from "../errors";

/**
 * Google Gemini API(Generative Language API)를 호출하는 CompletionProvider 구현체.
 *
 * CompletionProvider.ts 9~12행에 명시된 설계 의도("Anthropic/OpenAI/Gemini 등
 * 실제 벤더별 구현체가 이 인터페이스만 구현하면 AIInterpretationEngine 코드는
 * 전혀 수정할 필요가 없다")를 그대로 실현한 것으로, AnthropicCompletionProvider와
 * 동일한 구조(설정 주입 우선, 없으면 환경변수 사용 / 에러는 전부 AIProviderError로
 * 감싸서 던짐)를 따른다. AIInterpretationEngine의 검증 파이프라인
 * (parseAIResponse → validateInterpretationResult → checkDataConsistency)은
 * 이 provider가 무엇을 반환하든 동일하게 적용되므로 여기서는 변경하지 않는다.
 */
export interface GeminiProviderConfig {
  /** 생략 시 process.env.GEMINI_API_KEY 사용 */
  apiKey?: string;
  /** 생략 시 process.env.SAJU_GEMINI_MODEL, 그것도 없으면 기본값(gemini-2.5-flash-lite) 사용 */
  model?: string;
  /** 응답 최대 토큰 수. 기본 2000 */
  maxOutputTokens?: number;
}

const DEFAULT_MODEL = "gemini-2.5-flash-lite";
const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

export class GeminiCompletionProvider implements CompletionProvider {
  readonly providerName = "gemini";
  readonly modelName: string;

  private readonly apiKey?: string;
  private readonly maxOutputTokens: number;

  constructor(config: GeminiProviderConfig = {}) {
    this.apiKey = config.apiKey ?? process.env.GEMINI_API_KEY;
    this.modelName = config.model ?? process.env.SAJU_GEMINI_MODEL ?? DEFAULT_MODEL;
    this.maxOutputTokens = config.maxOutputTokens ?? 2000;
  }

  async complete(system: string, user: string): Promise<string> {
    if (!this.apiKey) {
      throw new AIProviderError(
        "GEMINI_API_KEY 환경변수가 설정되어 있지 않습니다. .env 또는 배포 환경변수에 설정하세요."
      );
    }

    const url = `${GEMINI_API_BASE}/${this.modelName}:generateContent?key=${this.apiKey}`;

    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: system }] },
          contents: [{ role: "user", parts: [{ text: user }] }],
          generationConfig: { maxOutputTokens: this.maxOutputTokens },
        }),
      });
    } catch (err) {
      throw new AIProviderError("Gemini API 호출 중 네트워크 오류가 발생했습니다.", err);
    }

    if (!response.ok) {
      const bodyText = await response.text().catch(() => "");
      throw new AIProviderError(
        `Gemini API가 오류를 반환했습니다 (status ${response.status}): ${bodyText}`
      );
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch (err) {
      throw new AIProviderError("Gemini API 응답을 JSON으로 파싱하지 못했습니다.", err);
    }

    const text = (
      data as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      }
    )?.candidates?.[0]?.content?.parts?.find((part) => typeof part?.text === "string")?.text;

    if (!text) {
      throw new AIProviderError("Gemini API 응답에서 text를 찾을 수 없습니다.");
    }

    return text;
  }
}
