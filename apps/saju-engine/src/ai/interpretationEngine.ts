import { buildSajuPrompt } from "../prompts/promptBuilder";
import type { ProductType } from "../prompts/productTemplates";
import type { SajuJson } from "../types";
import { checkDataConsistency } from "./checkDataConsistency";
import type { CompletionProvider } from "./CompletionProvider";
import { AIInterpretationFailedError, AIProviderError, AITimeoutError } from "./errors";
import { parseAIResponse } from "./parseAIResponse";
import { AnthropicCompletionProvider, AnthropicProviderConfig } from "./providers/anthropicCompletionProvider";
import { GeminiCompletionProvider, GeminiProviderConfig } from "./providers/geminiCompletionProvider";
import type { AIInterpreter, InterpretationOptions, InterpretationResult } from "./types";
import { validateInterpretationResult } from "./validateInterpretationResult";

const DEFAULT_PRODUCT_TYPE: ProductType = "FREE_BASIC";
const DEFAULT_MAX_RETRIES = 2;
const DEFAULT_TIMEOUT_MS = 30_000;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new AITimeoutError(timeoutMs)), timeoutMs);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

/**
 * 명세서 9조의 AIInterpreter를 구현하는 실제 엔진.
 *
 * 책임 분리(명세서 10조)를 그대로 코드 구조로 반영한다:
 *   - "무엇이 계산되었는가?" → Saju Engine (이 클래스는 관여하지 않음, saju 인자로 받기만 함)
 *   - "계산된 결과가 무엇을 의미하는가?" → 이 클래스 (프롬프트 조립 → LLM 호출 →
 *     파싱 → 스키마 검증 → 데이터 일치 검증 → 재시도)
 *
 * CompletionProvider만 교체하면(Anthropic/OpenAI/Gemini 등) 이 클래스의 로직은
 * 전혀 바뀌지 않는다.
 */
export class AIInterpretationEngine implements AIInterpreter {
  constructor(private readonly provider: CompletionProvider) {}

  async interpret(saju: SajuJson, options: InterpretationOptions = {}): Promise<InterpretationResult> {
    const productType = options.productType ?? DEFAULT_PRODUCT_TYPE;
    const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
    const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const totalAttempts = maxRetries + 1;

    const { system, user } = buildSajuPrompt(saju, productType);

    let lastError: unknown;

    for (let attempt = 1; attempt <= totalAttempts; attempt += 1) {
      try {
        const raw = await withTimeout(this.provider.complete(system, user), timeoutMs);
        const parsed = parseAIResponse(raw);
        const validated = validateInterpretationResult(parsed, productType);
        checkDataConsistency(saju, validated);

        return {
          ...validated,
          meta: {
            productType,
            provider: this.provider.providerName,
            model: this.provider.modelName,
            generatedAt: new Date().toISOString(),
            attempts: attempt,
          },
        };
      } catch (err) {
        lastError = err;
        // AIProviderError(네트워크/API 오류), AITimeoutError, JSON 파싱 실패,
        // 스키마 검증 실패, 데이터 불일치 - 모두 "이번 시도가 실패했다"는 신호로
        // 취급하고 다음 시도로 넘어간다. 마지막 시도까지 실패하면 아래에서 던진다.
        continue;
      }
    }

    throw new AIInterpretationFailedError(
      `AI 해석 생성에 ${totalAttempts}회 시도 후에도 실패했습니다.`,
      lastError,
      totalAttempts
    );
  }
}

/** AnthropicCompletionProvider를 사용하는 기본 엔진을 편하게 생성하기 위한 헬퍼. */
export function createAnthropicInterpretationEngine(
  config?: AnthropicProviderConfig
): AIInterpretationEngine {
  return new AIInterpretationEngine(new AnthropicCompletionProvider(config));
}

/** GeminiCompletionProvider를 사용하는 기본 엔진을 편하게 생성하기 위한 헬퍼. */
export function createGeminiInterpretationEngine(config?: GeminiProviderConfig): AIInterpretationEngine {
  return new AIInterpretationEngine(new GeminiCompletionProvider(config));
}

export { AIProviderError };
