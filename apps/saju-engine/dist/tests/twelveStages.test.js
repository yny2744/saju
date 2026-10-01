"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const twelveStages_1 = require("../src/twelveStages");
const index_1 = require("../src/index");
function p(stem, branch) {
    return { heavenlyStem: stem, earthlyBranch: branch, ganzhi: `${stem}${branch}` };
}
describe("12운성 - 정상 케이스 (표준 조견표와 전체 대조)", () => {
    test("갑목 일간(양간,순행,장생=해) 기준 12지지 전체가 표준 조견표와 일치한다", () => {
        const expected = {
            해: "장생", 자: "목욕", 축: "관대", 인: "임관", 묘: "제왕", 진: "쇠",
            사: "병", 오: "사", 미: "묘", 신: "절", 유: "태", 술: "양",
        };
        for (const [branch, stage] of Object.entries(expected)) {
            const pillars = {
                year: p("갑", branch),
                month: p("갑", "자"),
                day: p("갑", "자"), // 일간을 갑으로 고정
                hour: null,
            };
            const result = (0, twelveStages_1.calculateTwelveStages)(pillars);
            expect(result.stages.year).toBe(stage);
        }
    });
    test("을목 일간(음간,역행,장생=오) 기준 12지지 전체가 표준 조견표와 일치한다", () => {
        const expected = {
            오: "장생", 사: "목욕", 진: "관대", 묘: "임관", 인: "제왕", 축: "쇠",
            자: "병", 해: "사", 술: "묘", 유: "절", 신: "태", 미: "양",
        };
        for (const [branch, stage] of Object.entries(expected)) {
            const pillars = {
                year: p("을", branch),
                month: p("을", "자"),
                day: p("을", "자"),
                hour: null,
            };
            const result = (0, twelveStages_1.calculateTwelveStages)(pillars);
            expect(result.stages.year).toBe(stage);
        }
    });
    test("1967-04-03 04:50 남성 (정미/계묘/정유/임인) - 일간 정(음,역행,장생=유) 기준 4개 지지 12운성", () => {
        const saju = (0, index_1.calculateSaju)({ calendarType: "solar", date: "1967-04-03", time: "04:50", gender: "male" }, 2024);
        const result = (0, twelveStages_1.calculateTwelveStages)(saju.pillars);
        expect(result.dayMaster).toEqual({ stem: "정", polarity: "음" });
        // 정화 기준(역행, 장생=유): 미=관대, 묘=병, 유=장생, 인=사 (위 표준표에서 검증된 값)
        expect(result.stages.year).toBe("관대"); // 미
        expect(result.stages.month).toBe("병"); // 묘
        expect(result.stages.day).toBe("장생"); // 유
        expect(result.stages.hour).toBe("사"); // 인
    });
});
describe("12운성 - 경계값: 출생시간 미입력", () => {
    test("시주가 null이면 stages.hour가 생략되고, 연/월/일은 정상 계산된다", () => {
        const saju = (0, index_1.calculateSaju)({ calendarType: "solar", date: "1990-05-20", gender: "male" }, 2024);
        const result = (0, twelveStages_1.calculateTwelveStages)(saju.pillars);
        expect(result.stages.hour).toBeUndefined();
        expect(result.stages.year).toBeDefined();
        expect(result.stages.month).toBeDefined();
        expect(result.stages.day).toBeDefined();
    });
});
describe("12운성 - 잘못된 입력", () => {
    test("알 수 없는 일간 천간에 대해 명확한 에러를 던진다", () => {
        const invalidPillars = {
            year: p("갑", "자"),
            month: p("갑", "자"),
            day: p("XX", "자"),
            hour: null,
        };
        expect(() => (0, twelveStages_1.calculateTwelveStages)(invalidPillars)).toThrow(/알 수 없는 일간 천간/);
    });
    test("알 수 없는 지지에 대해 명확한 에러를 던진다", () => {
        const invalidPillars = {
            year: p("갑", "XX"),
            month: p("갑", "자"),
            day: p("갑", "자"),
            hour: null,
        };
        expect(() => (0, twelveStages_1.calculateTwelveStages)(invalidPillars)).toThrow(/알 수 없는 대상 지지/);
    });
});
describe("calculateSaju() 통합 검증 - Phase 2-4까지 반영 여부", () => {
    test("calculateSaju() 결과의 twelveStages가 빈 스키마가 아니라 실제 계산된 구조다", () => {
        const saju = (0, index_1.calculateSaju)({ calendarType: "solar", date: "1967-04-03", time: "04:50", gender: "male" }, 2024);
        expect(saju.twelveStages.dayMaster).toEqual({ stem: "정", polarity: "음" });
        expect(saju.twelveStages.stages.year).toBeDefined();
        // Phase 2-6 완료 - daeun은 Phase 2-5, seun은 Phase 2-6에서 각각 구현 완료되어
        // 더 이상 빈 스키마가 아니므로 검증하지 않는다. Phase 2 전체(2-1~2-6)가 이제 완료됐다.
    });
});
