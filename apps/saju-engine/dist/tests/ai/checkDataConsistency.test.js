"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("../../src/index");
const checkDataConsistency_1 = require("../../src/ai/checkDataConsistency");
const errors_1 = require("../../src/ai/errors");
function matchingResult(saju) {
    return {
        elements: {
            wood: "설명",
            fire: "설명",
            earth: "설명",
            metal: "설명",
            water: "설명",
            dominant: saju.elements.summary.dominant,
            lacking: saju.elements.summary.lacking[0] ?? null,
        },
        tenGods: {
            dayMaster: saju.tenGods.dayMaster.stem,
            summary: "설명",
        },
        analysis: {},
        disclaimer: "면책 문구",
    };
}
describe("checkDataConsistency", () => {
    const saju = (0, index_1.calculateSaju)({ calendarType: "solar", date: "1990-05-20", time: "14:30", gender: "female" }, 2025);
    test("엔진 계산값과 완전히 일치하면 통과한다", () => {
        expect(() => (0, checkDataConsistency_1.checkDataConsistency)(saju, matchingResult(saju))).not.toThrow();
    });
    test("AI가 다른 일간을 만들어내면 AIDataMismatchError를 던진다", () => {
        const result = matchingResult(saju);
        const wrongStem = saju.tenGods.dayMaster.stem === "갑" ? "을" : "갑";
        result.tenGods.dayMaster = wrongStem;
        try {
            (0, checkDataConsistency_1.checkDataConsistency)(saju, result);
            fail("에러가 던져져야 합니다");
        }
        catch (err) {
            expect(err).toBeInstanceOf(errors_1.AIDataMismatchError);
            const mismatchErr = err;
            expect(mismatchErr.issues.some((i) => i.includes("dayMaster"))).toBe(true);
        }
    });
    test("AI가 다른 우세 오행을 만들어내면 AIDataMismatchError를 던진다", () => {
        const result = matchingResult(saju);
        const wrongElement = saju.elements.summary.dominant === "목" ? "화" : "목";
        result.elements.dominant = wrongElement;
        expect(() => (0, checkDataConsistency_1.checkDataConsistency)(saju, result)).toThrow(errors_1.AIDataMismatchError);
    });
    test("엔진에는 부족 오행이 없는데 AI가 있다고 지어내면 실패한다", () => {
        const result = matchingResult(saju);
        if (saju.elements.summary.lacking.length === 0) {
            result.elements.lacking = "수";
            expect(() => (0, checkDataConsistency_1.checkDataConsistency)(saju, result)).toThrow(errors_1.AIDataMismatchError);
        }
        else {
            // 이 생년월일시 조합에서는 항상 부족 오행이 없다고 가정하지 않고, 있는 경우를 대비해
            // 반대 케이스(있는데 없다고 함)로 동일한 원칙을 검증한다.
            result.elements.lacking = null;
            expect(() => (0, checkDataConsistency_1.checkDataConsistency)(saju, result)).toThrow(errors_1.AIDataMismatchError);
        }
    });
    test("엔진이 지목한 것과 다른 오행을 부족하다고 지어내면 실패한다 (있음/없음은 맞지만 종류가 다른 경우)", () => {
        if (saju.elements.summary.lacking.length === 0) {
            // 이 생년월일시 조합에는 부족 오행이 없어 이 케이스를 검증할 수 없다 - 건너뛴다.
            return;
        }
        const result = matchingResult(saju);
        const actualLacking = saju.elements.summary.lacking[0];
        const fakeLacking = ["목", "화", "토", "금", "수"].find((el) => el !== actualLacking);
        result.elements.lacking = fakeLacking;
        expect(() => (0, checkDataConsistency_1.checkDataConsistency)(saju, result)).toThrow(errors_1.AIDataMismatchError);
    });
});
