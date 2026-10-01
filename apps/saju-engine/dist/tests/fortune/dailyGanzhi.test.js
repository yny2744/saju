"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const dailyGanzhi_1 = require("../../src/fortune/dailyGanzhi");
describe("calculateDailyGanzhi", () => {
    test("기존 pillars.test.ts와 동일한 날짜(1990-05-20)에 대해 동일한 일주 간지를 반환한다 (계산 로직 일치 검증)", () => {
        // tests/pillars.test.ts: date="1990-05-20" (시간 미입력) → day.ganzhi === "을유"
        const result = (0, dailyGanzhi_1.calculateDailyGanzhi)("1990-05-20");
        expect(result.ganzhi).toBe("을유");
        expect(result.stem).toBe("을");
        expect(result.branch).toBe("유");
    });
    test("같은 날짜를 여러 번 계산해도 항상 같은 결과다 (결정론성)", () => {
        const a = (0, dailyGanzhi_1.calculateDailyGanzhi)("2026-09-22");
        const b = (0, dailyGanzhi_1.calculateDailyGanzhi)("2026-09-22");
        expect(a).toEqual(b);
    });
    test("날짜가 다르면 일진도 달라진다", () => {
        const day1 = (0, dailyGanzhi_1.calculateDailyGanzhi)("2026-09-22");
        const day2 = (0, dailyGanzhi_1.calculateDailyGanzhi)("2026-09-23");
        expect(day1.ganzhi).not.toBe(day2.ganzhi);
    });
    test("하루 차이는 60갑자 순환상 정확히 1칸 이동한다", () => {
        const day1 = (0, dailyGanzhi_1.calculateDailyGanzhi)("2026-09-22");
        const day2 = (0, dailyGanzhi_1.calculateDailyGanzhi)("2026-09-23");
        // 60갑자 순환표 순서상 인접한 하루는 천간/지지가 모두 1씩 이동해야 한다.
        const STEM_ORDER = ["갑", "을", "병", "정", "무", "기", "경", "신", "임", "계"];
        const BRANCH_ORDER = ["자", "축", "인", "묘", "진", "사", "오", "미", "신", "유", "술", "해"];
        const stemDiff = (STEM_ORDER.indexOf(day2.stem) - STEM_ORDER.indexOf(day1.stem) + 10) % 10;
        const branchDiff = (BRANCH_ORDER.indexOf(day2.branch) - BRANCH_ORDER.indexOf(day1.branch) + 12) % 12;
        expect(stemDiff).toBe(1);
        expect(branchDiff).toBe(1);
    });
    test("잘못된 날짜 형식은 명시적으로 에러를 던진다", () => {
        expect(() => (0, dailyGanzhi_1.calculateDailyGanzhi)("2026/09/22")).toThrow();
    });
});
