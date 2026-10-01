"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnthropicCompletionProvider = void 0;
const errors_1 = require("../errors");
const DEFAULT_MODEL = "claude-sonnet-5";
const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";
class AnthropicCompletionProvider {
    constructor(config = {}) {
        this.providerName = "anthropic";
        this.apiKey = config.apiKey ?? process.env.ANTHROPIC_API_KEY;
        this.modelName = config.model ?? process.env.SAJU_AI_MODEL ?? DEFAULT_MODEL;
        this.maxTokens = config.maxTokens ?? 2000;
    }
    async complete(system, user) {
        if (!this.apiKey) {
            throw new errors_1.AIProviderError("ANTHROPIC_API_KEY 환경변수가 설정되어 있지 않습니다. .env 또는 배포 환경변수에 설정하세요.");
        }
        let response;
        try {
            response = await fetch(ANTHROPIC_API_URL, {
                method: "POST",
                headers: {
                    "content-type": "application/json",
                    "x-api-key": this.apiKey,
                    "anthropic-version": ANTHROPIC_VERSION,
                },
                body: JSON.stringify({
                    model: this.modelName,
                    max_tokens: this.maxTokens,
                    system,
                    messages: [{ role: "user", content: user }],
                }),
            });
        }
        catch (err) {
            throw new errors_1.AIProviderError("Anthropic API 호출 중 네트워크 오류가 발생했습니다.", err);
        }
        if (!response.ok) {
            const bodyText = await response.text().catch(() => "");
            throw new errors_1.AIProviderError(`Anthropic API가 오류를 반환했습니다 (status ${response.status}): ${bodyText}`);
        }
        let data;
        try {
            data = await response.json();
        }
        catch (err) {
            throw new errors_1.AIProviderError("Anthropic API 응답을 JSON으로 파싱하지 못했습니다.", err);
        }
        const textBlock = data?.content?.find((block) => block?.type === "text" && typeof block.text === "string");
        if (!textBlock?.text) {
            throw new errors_1.AIProviderError("Anthropic API 응답에서 text 블록을 찾을 수 없습니다.");
        }
        return textBlock.text;
    }
}
exports.AnthropicCompletionProvider = AnthropicCompletionProvider;
