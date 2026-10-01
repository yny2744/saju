import type { SajuJson } from "../types";
import type { CompletionProvider } from "./CompletionProvider";
import { AIProviderError } from "./errors";
import { AnthropicProviderConfig } from "./providers/anthropicCompletionProvider";
import { GeminiProviderConfig } from "./providers/geminiCompletionProvider";
import type { AIInterpreter, InterpretationOptions, InterpretationResult } from "./types";
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
export declare class AIInterpretationEngine implements AIInterpreter {
    private readonly provider;
    constructor(provider: CompletionProvider);
    interpret(saju: SajuJson, options?: InterpretationOptions): Promise<InterpretationResult>;
}
/** AnthropicCompletionProvider를 사용하는 기본 엔진을 편하게 생성하기 위한 헬퍼. */
export declare function createAnthropicInterpretationEngine(config?: AnthropicProviderConfig): AIInterpretationEngine;
/** GeminiCompletionProvider를 사용하는 기본 엔진을 편하게 생성하기 위한 헬퍼. */
export declare function createGeminiInterpretationEngine(config?: GeminiProviderConfig): AIInterpretationEngine;
export { AIProviderError };
