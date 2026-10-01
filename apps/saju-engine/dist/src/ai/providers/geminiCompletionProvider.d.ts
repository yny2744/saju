import type { CompletionProvider } from "../CompletionProvider";
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
export declare class GeminiCompletionProvider implements CompletionProvider {
    readonly providerName = "gemini";
    readonly modelName: string;
    private readonly apiKey?;
    private readonly maxOutputTokens;
    constructor(config?: GeminiProviderConfig);
    complete(system: string, user: string): Promise<string>;
}
