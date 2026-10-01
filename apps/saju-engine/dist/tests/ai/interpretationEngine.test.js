"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("../../src/index");
const errors_1 = require("../../src/ai/errors");
const interpretationEngine_1 = require("../../src/ai/interpretationEngine");
const mockCompletionProvider_1 = require("../../src/ai/providers/mockCompletionProvider");
function saju() {
    return (0, index_1.calculateSaju)({ calendarType: "solar", date: "1990-05-20", time: "14:30", gender: "female" }, 2025);
}
function validResponseJson(s) {
    return JSON.stringify({
        elements: {
            wood: "목 설명",
            fire: "화 설명",
            earth: "토 설명",
            metal: "금 설명",
            water: "수 설명",
            dominant: s.elements.summary.dominant,
            lacking: s.elements.summary.lacking[0] ?? null,
        },
        tenGods: {
            dayMaster: s.tenGods.dayMaster.stem,
            summary: "십신 요약",
        },
        analysis: {
            temperament: "성향",
            career: "직업",
            wealth: "재물",
            love: "연애",
            relationship: "인간관계",
            yearlyFlow: "올해 흐름",
            caution: "주의점",
            opportunity: "기회",
        },
        disclaimer: "이 해석은 문화·오락 목적의 콘텐츠입니다.",
    });
}
describe("AIInterpretationEngine", () => {
    test("정상 응답이면 InterpretationResult와 meta를 반환한다", async () => {
        const s = saju();
        const provider = new mockCompletionProvider_1.MockCompletionProvider([validResponseJson(s)]);
        const engine = new interpretationEngine_1.AIInterpretationEngine(provider);
        const result = await engine.interpret(s, { productType: "FREE_BASIC" });
        expect(result.tenGods.dayMaster).toBe(s.tenGods.dayMaster.stem);
        expect(result.meta.attempts).toBe(1);
        expect(result.meta.provider).toBe("mock");
        expect(result.meta.productType).toBe("FREE_BASIC");
    });
    test("```json 코드펜스로 감싸진 응답도 정상 파싱한다", async () => {
        const s = saju();
        const fenced = "```json\n" + validResponseJson(s) + "\n```";
        const provider = new mockCompletionProvider_1.MockCompletionProvider([fenced]);
        const engine = new interpretationEngine_1.AIInterpretationEngine(provider);
        const result = await engine.interpret(s);
        expect(result.disclaimer).toContain("문화·오락");
    });
    test("첫 시도에서 손상된 JSON이 오면 재시도해서 두 번째 시도에서 성공한다", async () => {
        const s = saju();
        const provider = new mockCompletionProvider_1.MockCompletionProvider(["이건 JSON이 아님 {{{", validResponseJson(s)]);
        const engine = new interpretationEngine_1.AIInterpretationEngine(provider);
        const result = await engine.interpret(s, { maxRetries: 2 });
        expect(result.meta.attempts).toBe(2);
        expect(provider.calls).toBe(2);
    });
    test("재시도를 모두 소진하면 AIInterpretationFailedError를 던진다", async () => {
        const provider = new mockCompletionProvider_1.MockCompletionProvider(["부서진 JSON 1", "부서진 JSON 2"]);
        const engine = new interpretationEngine_1.AIInterpretationEngine(provider);
        const s = saju();
        await expect(engine.interpret(s, { maxRetries: 1 })).rejects.toBeInstanceOf(errors_1.AIInterpretationFailedError);
        expect(provider.calls).toBe(2); // 최초 시도 1 + 재시도 1
    });
    test("Provider가 에러를 던지면(API 오류) 재시도 대상이 되고, 계속 실패하면 최종 실패한다", async () => {
        const provider = new mockCompletionProvider_1.MockCompletionProvider([
            new Error("네트워크 오류"),
            new Error("네트워크 오류"),
        ]);
        const engine = new interpretationEngine_1.AIInterpretationEngine(provider);
        await expect(engine.interpret(saju(), { maxRetries: 1 })).rejects.toBeInstanceOf(errors_1.AIInterpretationFailedError);
    });
    test("스키마는 맞지만 필수 analysis 필드가 빠지면 실패로 취급되고 재시도 후 실패한다", async () => {
        const s = saju();
        const incomplete = JSON.stringify({
            elements: {
                wood: "x",
                fire: "x",
                earth: "x",
                metal: "x",
                water: "x",
                dominant: s.elements.summary.dominant,
                lacking: null,
            },
            tenGods: { dayMaster: s.tenGods.dayMaster.stem, summary: "x" },
            analysis: { temperament: "성향만 있음" },
            disclaimer: "면책",
        });
        const provider = new mockCompletionProvider_1.MockCompletionProvider([incomplete]);
        const engine = new interpretationEngine_1.AIInterpretationEngine(provider);
        await expect(engine.interpret(s, { maxRetries: 0 })).rejects.toBeInstanceOf(errors_1.AIInterpretationFailedError);
    });
    test("AI가 엔진과 다른 일간을 지어내면(데이터 불일치) 실패로 취급한다", async () => {
        const s = saju();
        const wrongStem = s.tenGods.dayMaster.stem === "갑" ? "을" : "갑";
        const mismatched = JSON.stringify({
            elements: {
                wood: "x",
                fire: "x",
                earth: "x",
                metal: "x",
                water: "x",
                dominant: s.elements.summary.dominant,
                lacking: s.elements.summary.lacking[0] ?? null,
            },
            tenGods: { dayMaster: wrongStem, summary: "x" },
            analysis: {
                temperament: "x",
                career: "x",
                wealth: "x",
                love: "x",
                relationship: "x",
                yearlyFlow: "x",
                caution: "x",
                opportunity: "x",
            },
            disclaimer: "면책",
        });
        const provider = new mockCompletionProvider_1.MockCompletionProvider([mismatched]);
        const engine = new interpretationEngine_1.AIInterpretationEngine(provider);
        await expect(engine.interpret(s, { maxRetries: 0 })).rejects.toBeInstanceOf(errors_1.AIInterpretationFailedError);
    });
    test("timeoutMs 안에 응답이 오지 않으면 타임아웃으로 실패 처리된다", async () => {
        const slowProvider = {
            providerName: "slow-mock",
            modelName: "slow-model",
            complete: () => new Promise((resolve) => setTimeout(() => resolve("{}"), 200)),
        };
        const engine = new interpretationEngine_1.AIInterpretationEngine(slowProvider);
        await expect(engine.interpret(saju(), { maxRetries: 0, timeoutMs: 10 })).rejects.toBeInstanceOf(errors_1.AIInterpretationFailedError);
    });
    test("maxRetries=0이면 정확히 1회만 시도한다", async () => {
        const provider = new mockCompletionProvider_1.MockCompletionProvider([new Error("실패"), validResponseJson(saju())]);
        const engine = new interpretationEngine_1.AIInterpretationEngine(provider);
        await expect(engine.interpret(saju(), { maxRetries: 0 })).rejects.toBeInstanceOf(errors_1.AIInterpretationFailedError);
        expect(provider.calls).toBe(1);
    });
});
