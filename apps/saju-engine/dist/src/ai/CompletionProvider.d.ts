/**
 * 저수준 AI 호출 추상화.
 *
 * 명세서 9조: "특정 AI API에 코드가 강하게 종속되지 않도록 설계한다"를
 * 두 단계로 나눠서 만족시킨다.
 *
 *   1) AIInterpreter (src/ai/types.ts) - "SajuJson을 넣으면 InterpretationResult가
 *      나온다"는 서비스 레벨 계약. AIInterpretationEngine 하나만 이 계약을 구현한다.
 *   2) CompletionProvider (여기) - "system/user 프롬프트를 넣으면 텍스트 응답이
 *      나온다"는 순수 LLM 호출 계약. Anthropic/OpenAI/Gemini 등 실제 벤더별
 *      구현체가 이 인터페이스만 구현하면 AIInterpretationEngine 코드는
 *      전혀 수정할 필요가 없다 (Provider만 교체).
 */
export interface CompletionProvider {
    /** 로그/메타데이터 표기에 쓰이는 provider 식별자 (예: "anthropic") */
    readonly providerName: string;
    /** 실제 호출에 사용되는 모델명 (예: "claude-sonnet-5") */
    readonly modelName: string;
    /**
     * system/user 프롬프트로 LLM을 호출하고, 텍스트 응답을 그대로 반환한다.
     * JSON 파싱/검증은 이 레벨의 책임이 아니다 (AIInterpretationEngine이 담당).
     */
    complete(system: string, user: string): Promise<string>;
}
