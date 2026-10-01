"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeminiCompletionProvider = void 0;
const errors_1 = require("../errors");
const DEFAULT_MODEL = "gemini-2.5-flash-lite";
const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
class GeminiCompletionProvider {
    constructor(config = {}) {
        this.providerName = "gemini";
        this.apiKey = config.apiKey ?? process.env.GEMINI_API_KEY;
        this.modelName = config.model ?? process.env.SAJU_GEMINI_MODEL ?? DEFAULT_MODEL;
        this.maxOutputTokens = config.maxOutputTokens ?? 2000;
    }
    async complete(system, user) {
        if (!this.apiKey) {
            throw new errors_1.AIProviderError("GEMINI_API_KEY 환경변수가 설정되어 있지 않습니다. .env 또는 배포 환경변수에 설정하세요.");
        }
        const url = `${GEMINI_API_BASE}/${this.modelName}:generateContent?key=${this.apiKey}`;
        let response;
        try {
            response = await fetch(url, {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                    system_instruction: { parts: [{ text: system }] },
                    contents: [{ role: "user", parts: [{ text: user }] }],
                    generationConfig: { maxOutputTokens: this.maxOutputTokens },
                }),
            });
        }
        catch (err) {
            throw new errors_1.AIProviderError("Gemini API 호출 중 네트워크 오류가 발생했습니다.", err);
        }
        if (!response.ok) {
            const bodyText = await response.text().catch(() => "");
            throw new errors_1.AIProviderError(`Gemini API가 오류를 반환했습니다 (status ${response.status}): ${bodyText}`);
        }
        let data;
        try {
            data = await response.json();
        }
        catch (err) {
            throw new errors_1.AIProviderError("Gemini API 응답을 JSON으로 파싱하지 못했습니다.", err);
        }
        const text = data?.candidates?.[0]?.content?.parts?.find((part) => typeof part?.text === "string")?.text;
        if (!text) {
            throw new errors_1.AIProviderError("Gemini API 응답에서 text를 찾을 수 없습니다.");
        }
        return text;
    }
}
exports.GeminiCompletionProvider = GeminiCompletionProvider;
