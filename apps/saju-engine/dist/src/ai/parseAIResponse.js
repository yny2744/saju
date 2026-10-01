"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseAIResponse = parseAIResponse;
const errors_1 = require("./errors");
/**
 * systemPrompt.ts는 "JSON 외의 다른 텍스트를 절대 붙이지 말라"고 명시하지만,
 * 실제 LLM은 종종 ```json ... ``` 코드블록으로 감싸거나 앞뒤에 공백/개행을
 * 붙여서 응답하는 경우가 있다. 파싱 실패를 줄이기 위해 이 정도의 방어적
 * 정리만 수행하고, 그 이상(예: 텍스트 중간에서 JSON을 추출)은 시도하지 않는다 -
 * 과도한 복구 시도는 오히려 손상된 응답을 "그럴듯하게" 통과시켜 버릴 위험이 있다.
 */
function stripCodeFence(raw) {
    const trimmed = raw.trim();
    const fenceMatch = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(trimmed);
    return fenceMatch ? fenceMatch[1].trim() : trimmed;
}
/** AI가 반환한 원문 텍스트를 JSON 객체로 파싱한다. 실패 시 AIParsingError를 던진다. */
function parseAIResponse(raw) {
    const cleaned = stripCodeFence(raw);
    try {
        return JSON.parse(cleaned);
    }
    catch (err) {
        throw new errors_1.AIParsingError(`AI 응답을 JSON으로 파싱하지 못했습니다: ${err instanceof Error ? err.message : String(err)}`, raw);
    }
}
