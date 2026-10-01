"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIProviderError = exports.AIInterpretationEngine = void 0;
exports.createAnthropicInterpretationEngine = createAnthropicInterpretationEngine;
exports.createGeminiInterpretationEngine = createGeminiInterpretationEngine;
const promptBuilder_1 = require("../prompts/promptBuilder");
const checkDataConsistency_1 = require("./checkDataConsistency");
const errors_1 = require("./errors");
Object.defineProperty(exports, "AIProviderError", { enumerable: true, get: function () { return errors_1.AIProviderError; } });
const parseAIResponse_1 = require("./parseAIResponse");
const anthropicCompletionProvider_1 = require("./providers/anthropicCompletionProvider");
const geminiCompletionProvider_1 = require("./providers/geminiCompletionProvider");
const validateInterpretationResult_1 = require("./validateInterpretationResult");
const DEFAULT_PRODUCT_TYPE = "FREE_BASIC";
const DEFAULT_MAX_RETRIES = 2;
const DEFAULT_TIMEOUT_MS = 30000;
function withTimeout(promise, timeoutMs) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new errors_1.AITimeoutError(timeoutMs)), timeoutMs);
        promise.then((value) => {
            clearTimeout(timer);
            resolve(value);
        }, (err) => {
            clearTimeout(timer);
            reject(err);
        });
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
class AIInterpretationEngine {
    constructor(provider) {
        this.provider = provider;
    }
    async interpret(saju, options = {}) {
        const productType = options.productType ?? DEFAULT_PRODUCT_TYPE;
        const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
        const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
        const totalAttempts = maxRetries + 1;
        const { system, user } = (0, promptBuilder_1.buildSajuPrompt)(saju, productType);
        let lastError;
        for (let attempt = 1; attempt <= totalAttempts; attempt += 1) {
            try {
                const raw = await withTimeout(this.provider.complete(system, user), timeoutMs);
                const parsed = (0, parseAIResponse_1.parseAIResponse)(raw);
                const validated = (0, validateInterpretationResult_1.validateInterpretationResult)(parsed, productType);
                (0, checkDataConsistency_1.checkDataConsistency)(saju, validated);
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
            }
            catch (err) {
                lastError = err;
                // AIProviderError(네트워크/API 오류), AITimeoutError, JSON 파싱 실패,
                // 스키마 검증 실패, 데이터 불일치 - 모두 "이번 시도가 실패했다"는 신호로
                // 취급하고 다음 시도로 넘어간다. 마지막 시도까지 실패하면 아래에서 던진다.
                continue;
            }
        }
        throw new errors_1.AIInterpretationFailedError(`AI 해석 생성에 ${totalAttempts}회 시도 후에도 실패했습니다.`, lastError, totalAttempts);
    }
}
exports.AIInterpretationEngine = AIInterpretationEngine;
/** AnthropicCompletionProvider를 사용하는 기본 엔진을 편하게 생성하기 위한 헬퍼. */
function createAnthropicInterpretationEngine(config) {
    return new AIInterpretationEngine(new anthropicCompletionProvider_1.AnthropicCompletionProvider(config));
}
/** GeminiCompletionProvider를 사용하는 기본 엔진을 편하게 생성하기 위한 헬퍼. */
function createGeminiInterpretationEngine(config) {
    return new AIInterpretationEngine(new geminiCompletionProvider_1.GeminiCompletionProvider(config));
}
