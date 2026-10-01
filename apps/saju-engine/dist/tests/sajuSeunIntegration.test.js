"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("../src/index");
describe("calculateSaju() 세운(year) 연동 - Phase 2-6", () => {
    test("calculateSaju(..., 2024)의 seun.pillar는 갑진이다", () => {
        const saju = (0, index_1.calculateSaju)({ calendarType: "solar", date: "1990-05-20", time: "14:30", gender: "male" }, 2024);
        expect(saju.seun.pillar.ganzhi).toBe("갑진");
    });
    test("calculateSaju(..., 2025)의 seun.pillar는 을사이다", () => {
        const saju = (0, index_1.calculateSaju)({ calendarType: "solar", date: "1990-05-20", time: "14:30", gender: "male" }, 2025);
        expect(saju.seun.pillar.ganzhi).toBe("을사");
    });
    test("calculateSaju(..., 2026)의 seun.pillar는 병오이다", () => {
        const saju = (0, index_1.calculateSaju)({ calendarType: "solar", date: "1990-05-20", time: "14:30", gender: "male" }, 2026);
        expect(saju.seun.pillar.ganzhi).toBe("병오");
    });
    test("일간에 따른 세운 십신이 최종 JSON에서도 정확하다 (일간 을목 기준)", () => {
        // 1990-05-20은 일간이 을(乙, 목/음)임 (기존 여러 테스트에서 이미 확인된 값)
        const saju = (0, index_1.calculateSaju)({ calendarType: "solar", date: "1990-05-20", time: "14:30", gender: "female" }, 2024);
        expect(saju.pillars.day.heavenlyStem).toBe("을");
        // 갑(목,양) vs 을(목,음): 같은 오행 + 다른 음양 -> 겁재 (Phase 2-6 검수 때 이미 손으로 검산된 값)
        expect(saju.seun.tenGod).toBe("겁재");
    });
    test("seun이 더 이상 빈 객체({})가 아니라 실제 SeunResult 구조다", () => {
        const saju = (0, index_1.calculateSaju)({ calendarType: "solar", date: "1967-04-03", time: "04:50", gender: "male" }, 2024);
        expect(saju.seun).not.toEqual({});
        expect(saju.seun.year).toBe(2024);
        expect(saju.seun.pillar).toBeDefined();
        expect(saju.seun.tenGod).toBeDefined();
    });
    test("year 인자에 따라 다른 사람의 seun.year 필드도 각각 정확히 반영된다", () => {
        const input = { calendarType: "solar", date: "1967-04-03", time: "04:50", gender: "male" };
        expect((0, index_1.calculateSaju)(input, 2024).seun.year).toBe(2024);
        expect((0, index_1.calculateSaju)(input, 2030).seun.year).toBe(2030);
    });
});
