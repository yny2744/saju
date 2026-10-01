import type { CompletionProvider } from "../CompletionProvider";
/**
 * Anthropic Messages API를 호출하는 CompletionProvider 구현체.
 *
 * 명세서 9조: "API Key 등 민감한 정보는 소스코드에 직접 작성하지 않는다.
 * 환경변수 기반으로 처리한다." 를 그대로 따른다 - API Key와 모델명은
 * 생성자 인자로 주입하거나, 주입하지 않으면 환경변수에서 읽는다.
 * 소스코드 어디에도 실제 키 값을 하드코딩하지 않는다.
 */
export interface AnthropicProviderConfig {
    /** 생략 시 process.env.ANTHROPIC_API_KEY 사용 */
    apiKey?: string;
    /** 생략 시 process.env.SAJU_AI_MODEL, 그것도 없으면 기본값(claude-sonnet-5) 사용 */
    model?: string;
    /** 응답 최대 토큰 수. 기본 2000 */
    maxTokens?: number;
}
export declare class AnthropicCompletionProvider implements CompletionProvider {
    readonly providerName = "anthropic";
    readonly modelName: string;
    private readonly apiKey?;
    private readonly maxTokens;
    constructor(config?: AnthropicProviderConfig);
    complete(system: string, user: string): Promise<string>;
}
