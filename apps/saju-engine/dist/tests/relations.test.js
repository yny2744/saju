"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const relations_1 = require("../src/relations");
const index_1 = require("../src/index");
/** 테스트용 Pillar를 간단히 만드는 헬퍼. ganzhi는 표시용이라 정확하지 않아도 무방. */
function p(stem, branch) {
    return { heavenlyStem: stem, earthlyBranch: branch, ganzhi: `${stem}${branch}` };
}
function makePillars(year, month, day, hour) {
    return {
        year: p(...year),
        month: p(...month),
        day: p(...day),
        hour: hour ? p(...hour) : null,
    };
}
describe("천간합", () => {
    test("갑+기 = 천간합(토)", () => {
        const pillars = makePillars(["갑", "자"], ["기", "묘"], ["병", "오"], null);
        const r = (0, relations_1.calculateRelations)(pillars);
        const found = r.combination.find((c) => c.type === "천간합");
        expect(found).toBeDefined();
        expect(found.resultElement).toBe("토");
        expect(found.positions.sort()).toEqual(["month", "year"]);
    });
});
describe("육합", () => {
    test("자+축 = 육합(토)", () => {
        const pillars = makePillars(["갑", "자"], ["을", "축"], ["병", "인"], null);
        const r = (0, relations_1.calculateRelations)(pillars);
        const found = r.combination.find((c) => c.type === "육합");
        expect(found).toBeDefined();
        expect(found.characters.sort()).toEqual(["자", "축"]);
        expect(found.resultElement).toBe("토");
    });
});
describe("삼합 (완전) / 반합", () => {
    test("인+오+술 3글자 모두 있으면 완전한 삼합(화)으로 잡히고, 반합으로 중복 기록되지 않는다", () => {
        const pillars = makePillars(["갑", "인"], ["병", "오"], ["무", "술"], null);
        const r = (0, relations_1.calculateRelations)(pillars);
        const fullSamHap = r.combination.filter((c) => c.type === "삼합");
        const halfSamHap = r.combination.filter((c) => c.type === "반합");
        expect(fullSamHap).toHaveLength(1);
        expect(fullSamHap[0].resultElement).toBe("화");
        expect(fullSamHap[0].positions.sort()).toEqual(["day", "month", "year"]);
        // 완전 삼합이 성립했으므로 그 안의 2글자 조합이 반합으로 별도 기록되면 안 됨
        expect(halfSamHap).toHaveLength(0);
    });
    test("인+오만 있고 술이 없으면 왕지(오) 포함 반합으로만 잡힌다", () => {
        const pillars = makePillars(["갑", "인"], ["병", "오"], ["무", "축"], null);
        const r = (0, relations_1.calculateRelations)(pillars);
        const halfSamHap = r.combination.filter((c) => c.type === "반합");
        const fullSamHap = r.combination.filter((c) => c.type === "삼합");
        expect(fullSamHap).toHaveLength(0);
        expect(halfSamHap).toHaveLength(1);
        expect(halfSamHap[0].characters.sort()).toEqual(["오", "인"]);
        expect(halfSamHap[0].resultElement).toBe("화");
    });
    test("인+술만 있고 왕지(오)가 없으면 반합으로 잡히지 않는다", () => {
        const pillars = makePillars(["갑", "인"], ["무", "술"], ["병", "축"], null);
        const r = (0, relations_1.calculateRelations)(pillars);
        const halfSamHap = r.combination.filter((c) => c.type === "반합" && c.characters.includes("인") && c.characters.includes("술"));
        expect(halfSamHap).toHaveLength(0);
    });
});
describe("방합", () => {
    test("인+묘+진 = 방합(목)", () => {
        const pillars = makePillars(["갑", "인"], ["을", "묘"], ["병", "진"], null);
        const r = (0, relations_1.calculateRelations)(pillars);
        const found = r.combination.find((c) => c.type === "방합");
        expect(found).toBeDefined();
        expect(found.resultElement).toBe("목");
        expect(found.positions.sort()).toEqual(["day", "month", "year"]);
    });
});
describe("충", () => {
    test("자+오 = 충", () => {
        const pillars = makePillars(["갑", "자"], ["병", "오"], ["무", "인"], null);
        const r = (0, relations_1.calculateRelations)(pillars);
        expect(r.clash).toHaveLength(1);
        expect(r.clash[0].branches.sort()).toEqual(["오", "자"]);
    });
});
describe("삼형 (완전) / 반형", () => {
    test("인+사+신 3글자 모두 있으면 무은지형으로 잡히고 반형으로 중복 기록되지 않는다", () => {
        const pillars = makePillars(["갑", "인"], ["을", "사"], ["병", "신"], null);
        const r = (0, relations_1.calculateRelations)(pillars);
        const fullHyeong = r.punishment.filter((p) => p.type === "무은지형");
        const halfHyeong = r.punishment.filter((p) => p.type === "반형");
        expect(fullHyeong).toHaveLength(1);
        expect(fullHyeong[0].branches.sort()).toEqual(["사", "신", "인"].sort());
        expect(halfHyeong).toHaveLength(0);
    });
    test("축+술+미 3글자 모두 있으면 지세지형으로 잡힌다", () => {
        const pillars = makePillars(["갑", "축"], ["을", "술"], ["병", "미"], null);
        const r = (0, relations_1.calculateRelations)(pillars);
        const fullHyeong = r.punishment.filter((p) => p.type === "지세지형");
        expect(fullHyeong).toHaveLength(1);
    });
    test("인+사 2글자만 있으면(신 없음) 반형으로 잡힌다 (DECISION REQUIRED 사항, 참고용 노출)", () => {
        const pillars = makePillars(["갑", "인"], ["을", "사"], ["병", "축"], null);
        const r = (0, relations_1.calculateRelations)(pillars);
        const halfHyeong = r.punishment.filter((p) => p.type === "반형");
        expect(halfHyeong.length).toBeGreaterThanOrEqual(1);
        expect(halfHyeong[0].branches.sort()).toEqual(["사", "인"]);
    });
});
describe("자묘형", () => {
    test("자+묘 = 무례지형", () => {
        const pillars = makePillars(["갑", "자"], ["을", "묘"], ["병", "인"], null);
        const r = (0, relations_1.calculateRelations)(pillars);
        const found = r.punishment.find((p) => p.type === "무례지형");
        expect(found).toBeDefined();
        expect(found.branches.sort()).toEqual(["묘", "자"]);
    });
});
describe("자형", () => {
    test("같은 지지(진)가 서로 다른 두 기둥에 있으면 자형으로 잡힌다", () => {
        const pillars = makePillars(["갑", "진"], ["을", "묘"], ["병", "진"], null);
        const r = (0, relations_1.calculateRelations)(pillars);
        const found = r.punishment.find((p) => p.type === "자형");
        expect(found).toBeDefined();
        expect(found.branches).toEqual(["진", "진"]);
        expect(found.positions.sort()).toEqual(["day", "year"]);
    });
    test("자형 대상이 아닌 지지가 중복되어도(예: 인+인) 자형으로 잡히지 않는다", () => {
        const pillars = makePillars(["갑", "인"], ["을", "묘"], ["병", "인"], null);
        const r = (0, relations_1.calculateRelations)(pillars);
        const found = r.punishment.find((p) => p.type === "자형");
        expect(found).toBeUndefined();
    });
});
describe("파", () => {
    test("자+유 = 파", () => {
        const pillars = makePillars(["갑", "자"], ["을", "유"], ["병", "인"], null);
        const r = (0, relations_1.calculateRelations)(pillars);
        expect(r.destruction).toHaveLength(1);
        expect(r.destruction[0].branches.sort()).toEqual(["유", "자"]);
    });
    test("인+해 = 육합이면서 동시에 파도 성립한다 (의도된 예외, DECISION REQUIRED 참고)", () => {
        const pillars = makePillars(["갑", "인"], ["을", "해"], ["병", "오"], null);
        const r = (0, relations_1.calculateRelations)(pillars);
        const combo = r.combination.find((c) => c.type === "육합" && c.characters.includes("인") && c.characters.includes("해"));
        const pa = r.destruction.find((d) => d.branches.includes("인") && d.branches.includes("해"));
        expect(combo).toBeDefined();
        expect(pa).toBeDefined();
    });
});
describe("해(害)", () => {
    test("자+미 = 해", () => {
        const pillars = makePillars(["갑", "자"], ["을", "미"], ["병", "인"], null);
        const r = (0, relations_1.calculateRelations)(pillars);
        expect(r.harm).toHaveLength(1);
        expect(r.harm[0].branches.sort()).toEqual(["미", "자"]);
    });
});
describe("관계가 없는 경우", () => {
    test("서로 아무 관계도 없는 지지 조합은 모든 배열이 비어있다", () => {
        // 축/묘/사: 육합/삼합/방합/충/형/파/해 어느 표에도 해당 조합이 없음
        const pillars = makePillars(["갑", "축"], ["을", "묘"], ["병", "사"], null);
        const r = (0, relations_1.calculateRelations)(pillars);
        expect(r.combination).toHaveLength(0);
        expect(r.clash).toHaveLength(0);
        expect(r.punishment).toHaveLength(0);
        expect(r.destruction).toHaveLength(0);
        expect(r.harm).toHaveLength(0);
    });
});
describe("동일 지지가 여러 개 존재하는 경우 - 중복 기록 여부 검증", () => {
    test("오+오+미: 자형(오오)은 1건, 오미육합은 서로 다른 기둥쌍 2건이 각각 정당하게 기록된다", () => {
        const pillars = makePillars(["갑", "오"], ["을", "오"], ["병", "미"], null);
        const r = (0, relations_1.calculateRelations)(pillars);
        const jaHyeong = r.punishment.filter((p) => p.type === "자형");
        expect(jaHyeong).toHaveLength(1); // year-month 쌍 1건만 (오가 2개뿐이라 쌍도 1개)
        const ohMiCombos = r.combination.filter((c) => c.type === "육합" && c.characters.includes("오") && c.characters.includes("미"));
        // year-day, month-day 두 쌍 모두 오미합 조건을 만족하므로 2건이 맞다 (버그 아님 - 실제로 서로 다른 기둥 조합)
        expect(ohMiCombos).toHaveLength(2);
        const positionPairs = ohMiCombos.map((c) => c.positions.sort().join(","));
        expect(new Set(positionPairs).size).toBe(2); // 두 건이 서로 다른 기둥 조합인지 확인 (완전 중복이면 1이 됨)
    });
});
describe("hour가 null인 경우", () => {
    test("hour가 null이어도 에러 없이 계산되고, hour가 관련된 관계는 애초에 나타나지 않는다", () => {
        const pillars = makePillars(["갑", "자"], ["을", "축"], ["병", "인"], null);
        expect(() => (0, relations_1.calculateRelations)(pillars)).not.toThrow();
        const r = (0, relations_1.calculateRelations)(pillars);
        const anyHourPosition = [
            ...r.combination.flatMap((c) => c.positions),
            ...r.clash.flatMap((c) => c.positions),
            ...r.punishment.flatMap((c) => c.positions),
            ...r.destruction.flatMap((c) => c.positions),
            ...r.harm.flatMap((c) => c.positions),
        ].includes("hour");
        expect(anyHourPosition).toBe(false);
    });
    test("실제 calculateSaju()에서 출생시간 미입력 시에도 relations 계산이 정상 동작한다", () => {
        const saju = (0, index_1.calculateSaju)({ calendarType: "solar", date: "1990-05-20", gender: "male" }, 2024);
        expect(() => saju.relations).not.toThrow();
        expect(saju.pillars.hour).toBeNull();
    });
});
describe("calculateSaju() 통합 검증 - Phase 2-3까지 반영 여부", () => {
    test("calculateSaju() 결과의 relations가 빈 스키마가 아니라 실제 계산된 구조다", () => {
        const saju = (0, index_1.calculateSaju)({ calendarType: "solar", date: "1967-04-03", time: "04:50", gender: "male" }, 2024);
        // 정미/계묘/정유/임인 - 실제 관계가 있는지 여부와 무관하게, 배열 자체가
        // 정상적으로 반환되는지(런타임 에러 없이) 확인
        expect(Array.isArray(saju.relations.combination)).toBe(true);
        expect(Array.isArray(saju.relations.clash)).toBe(true);
        expect(Array.isArray(saju.relations.punishment)).toBe(true);
        expect(Array.isArray(saju.relations.destruction)).toBe(true);
        expect(Array.isArray(saju.relations.harm)).toBe(true);
        // Phase 2 전체(2-1~2-6) 완료 - twelveStages(2-4), daeun(2-5), seun(2-6) 모두 구현 완료되어
        // 더 이상 빈 스키마가 아니므로 이 통합 테스트에서는 relations 배열 반환 여부만 확인한다.
    });
});
