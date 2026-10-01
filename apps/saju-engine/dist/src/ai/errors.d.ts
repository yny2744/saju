/**
 * AI Interpretation Engine 전용 에러 타입.
 *
 * 명세서 11조 "결과 검증" 요구사항(JSON 파싱 실패 처리 / AI API 오류 처리 /
 * timeout·retry 처리)과 "AI 입력 검증" 요구사항(계산 결과와 다른 데이터를 AI가
 * 만들어내지 않는지)을 각각 구분된 에러 타입으로 표현해서, 호출부와 테스트가
 * 실패 원인을 명확히 구분할 수 있게 한다.
 */
/** AI Provider 호출 자체가 실패한 경우 (네트워크 오류, API 오류 응답, 인증 실패 등) */
export declare class AIProviderError extends Error {
    readonly cause?: unknown | undefined;
    constructor(message: string, cause?: unknown | undefined);
}
/** Provider 호출이 timeoutMs 안에 끝나지 않은 경우 */
export declare class AITimeoutError extends AIProviderError {
    constructor(timeoutMs: number);
}
/** AI 응답이 유효한 JSON이 아닌 경우 */
export declare class AIParsingError extends Error {
    readonly rawResponse: string;
    constructor(message: string, rawResponse: string);
}
/** JSON 파싱은 성공했지만 InterpretationResult 스키마(필수 필드/타입)를 만족하지 않는 경우 */
export declare class AIValidationError extends Error {
    readonly issues: string[];
    constructor(message: string, issues: string[]);
}
/**
 * AI가 Saju Engine이 이미 계산한 값과 다른 값을 스스로 만들어낸 경우
 * (명세서 3조 절대 원칙 위반 - 예: 일간을 다른 천간으로 바꾸거나, 오행 우세를 다르게 서술).
 */
export declare class AIDataMismatchError extends Error {
    readonly issues: string[];
    constructor(message: string, issues: string[]);
}
/** 재시도를 모두 소진한 뒤 최종적으로 실패했을 때 던지는 최상위 에러. 마지막 원인을 보존한다. */
export declare class AIInterpretationFailedError extends Error {
    readonly lastError: unknown;
    readonly attempts: number;
    constructor(message: string, lastError: unknown, attempts: number);
}
