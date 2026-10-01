"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fortuneRuleEngine_1 = require("../../../src/fortune/rules/fortuneRuleEngine");
function makeFortune(overrides) {
    return {
        date: "2026-09-22",
        dayGanzhi: { stem: "기", branch: "축", ganzhi: "기축" },
        calculationMeta: { timezone: "Asia/Seoul", resolvedDate: "2026-09-22" },
        relationToday: {
            tenGodOfDay: "정재",
            twelveStageOfDay: "관대",
            perPillar: {},
            ...overrides,
        },
    };
}
describe("interpretFortune (Rule Engine, AI 미사용)", () => {
    test("모든 카테고리(overall/money/love/relationship/work)를 항상 채운다", () => {
        const result = (0, fortuneRuleEngine_1.interpretFortune)(makeFortune({}));
        expect(result.categories.overall).toBeTruthy();
        expect(result.categories.money).toBeTruthy();
        expect(result.categories.love).toBeTruthy();
        expect(result.categories.relationship).toBeTruthy();
        expect(result.categories.work).toBeTruthy();
    });
    test("관계 데이터가 전혀 없으면(perPillar 비어있음) fallback 문구를 쓴다", () => {
        const result = (0, fortuneRuleEngine_1.interpretFortune)(makeFortune({ perPillar: {} }));
        // 정재는 money 규칙을 갖고 있으므로 money는 fallback이 아니어야 하고,
        // relationship은 십신/12운성 어느 쪽도 relationship 카테고리 규칙이 없으므로 fallback이어야 한다.
        expect(result.ruleMeta.appliedRules).not.toContain(undefined);
        expect(result.categories.relationship).toMatch(/평소와 비슷한 흐름/);
    });
    test("일지 충(沖)이 있으면 advice에 충 관련 주의 문구가 채택된다", () => {
        const withClash = makeFortune({
            perPillar: {
                day: {
                    position: "day",
                    stemCombination: false,
                    branchCombination: false,
                    branchClash: true,
                    branchDestruction: false,
                    branchHarm: false,
                    branchPunishment: null,
                },
            },
        });
        const result = (0, fortuneRuleEngine_1.interpretFortune)(withClash);
        expect(result.advice).toMatch(/변수|부딪히거나/);
        expect(result.ruleMeta.appliedRules.some((id) => id.includes("clash"))).toBe(true);
    });
    test("충/형/파/해가 전혀 없으면 advice는 12운성 기반 일반 조언으로 대체된다", () => {
        const noCaution = makeFortune({ twelveStageOfDay: "병" });
        const result = (0, fortuneRuleEngine_1.interpretFortune)(noCaution);
        expect(result.advice).toMatch(/몸을 챙기는/);
    });
    test("키워드는 1개 이상 4개 이하이며 중복이 없다", () => {
        const result = (0, fortuneRuleEngine_1.interpretFortune)(makeFortune({}));
        expect(result.keywords.length).toBeGreaterThan(0);
        expect(result.keywords.length).toBeLessThanOrEqual(4);
        expect(new Set(result.keywords).size).toBe(result.keywords.length);
    });
    test("ruleMeta.appliedRules에는 실제로 사용자에게 보이는 문구를 만든 규칙만 담기고 중복이 없다", () => {
        const result = (0, fortuneRuleEngine_1.interpretFortune)(makeFortune({}));
        expect(new Set(result.ruleMeta.appliedRules).size).toBe(result.ruleMeta.appliedRules.length);
        expect(result.ruleMeta.appliedRules.length).toBeGreaterThan(0);
    });
    test("summary는 categories.overall과 동일하다", () => {
        const result = (0, fortuneRuleEngine_1.interpretFortune)(makeFortune({}));
        expect(result.summary).toBe(result.categories.overall);
    });
    test("같은 입력이면 항상 같은 결과다 (결정론성)", () => {
        const input = makeFortune({
            perPillar: {
                day: {
                    position: "day",
                    stemCombination: true,
                    branchCombination: false,
                    branchClash: false,
                    branchDestruction: false,
                    branchHarm: false,
                    branchPunishment: null,
                },
            },
        });
        expect((0, fortuneRuleEngine_1.interpretFortune)(input)).toEqual((0, fortuneRuleEngine_1.interpretFortune)(input));
    });
});
