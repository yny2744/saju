import type { CompletionProvider } from "../CompletionProvider";
/**
 * 네트워크 호출 없이 AIInterpretationEngine을 테스트하기 위한 CompletionProvider.
 * 실제 서비스 코드에서는 사용하지 않는다 - tests/ai/*.test.ts 전용.
 *
 * responses에 순서대로 응답을 등록해두면 complete() 호출마다 하나씩 꺼내 쓴다.
 * - 문자열을 등록하면 그 텍스트를 그대로 반환한다.
 * - Error 인스턴스를 등록하면 그 에러를 throw한다 (재시도/오류 처리 테스트용).
 * responses를 모두 소진하면 마지막 항목을 계속 반환(또는 throw)한다.
 */
export declare class MockCompletionProvider implements CompletionProvider {
    private readonly responses;
    readonly providerName = "mock";
    readonly modelName = "mock-model";
    private callCount;
    constructor(responses: Array<string | Error>);
    get calls(): number;
    complete(_system: string, _user: string): Promise<string>;
}
