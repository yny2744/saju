"use strict";
/**
 * AI Interpretation Engine 전용 에러 타입.
 *
 * 명세서 11조 "결과 검증" 요구사항(JSON 파싱 실패 처리 / AI API 오류 처리 /
 * timeout·retry 처리)과 "AI 입력 검증" 요구사항(계산 결과와 다른 데이터를 AI가
 * 만들어내지 않는지)을 각각 구분된 에러 타입으로 표현해서, 호출부와 테스트가
 * 실패 원인을 명확히 구분할 수 있게 한다.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIInterpretationFailedError = exports.AIDataMismatchError = exports.AIValidationError = exports.AIParsingError = exports.AITimeoutError = exports.AIProviderError = void 0;
/** AI Provider 호출 자체가 실패한 경우 (네트워크 오류, API 오류 응답, 인증 실패 등) */
class AIProviderError extends Error {
    constructor(message, cause) {
        super(message);
        this.cause = cause;
        this.name = "AIProviderError";
    }
}
exports.AIProviderError = AIProviderError;
/** Provider 호출이 timeoutMs 안에 끝나지 않은 경우 */
class AITimeoutError extends AIProviderError {
    constructor(timeoutMs) {
        super(`AI Provider 응답이 ${timeoutMs}ms 안에 도착하지 않았습니다.`);
        this.name = "AITimeoutError";
    }
}
exports.AITimeoutError = AITimeoutError;
/** AI 응답이 유효한 JSON이 아닌 경우 */
class AIParsingError extends Error {
    constructor(message, rawResponse) {
        super(message);
        this.rawResponse = rawResponse;
        this.name = "AIParsingError";
    }
}
exports.AIParsingError = AIParsingError;
/** JSON 파싱은 성공했지만 InterpretationResult 스키마(필수 필드/타입)를 만족하지 않는 경우 */
class AIValidationError extends Error {
    constructor(message, issues) {
        super(message);
        this.issues = issues;
        this.name = "AIValidationError";
    }
}
exports.AIValidationError = AIValidationError;
/**
 * AI가 Saju Engine이 이미 계산한 값과 다른 값을 스스로 만들어낸 경우
 * (명세서 3조 절대 원칙 위반 - 예: 일간을 다른 천간으로 바꾸거나, 오행 우세를 다르게 서술).
 */
class AIDataMismatchError extends Error {
    constructor(message, issues) {
        super(message);
        this.issues = issues;
        this.name = "AIDataMismatchError";
    }
}
exports.AIDataMismatchError = AIDataMismatchError;
/** 재시도를 모두 소진한 뒤 최종적으로 실패했을 때 던지는 최상위 에러. 마지막 원인을 보존한다. */
class AIInterpretationFailedError extends Error {
    constructor(message, lastError, attempts) {
        super(message);
        this.lastError = lastError;
        this.attempts = attempts;
        this.name = "AIInterpretationFailedError";
    }
}
exports.AIInterpretationFailedError = AIInterpretationFailedError;
