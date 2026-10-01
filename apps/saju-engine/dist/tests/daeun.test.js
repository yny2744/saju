"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const daeun_1 = require("../src/daeun");
const pillars_1 = require("../src/pillars");
const index_1 = require("../src/index");
describe("대운 - 순행/역행 판정", () => {
    test("양간 연주 + 남성 = 순행(forward)", () => {
        // 1990년 = 경오년, 경(庚)은 양간
        const { pillars, meta } = (0, pillars_1.calculateFourPillars)({ calendarType: "solar", date: "1990-05-20", time: "14:30", gender: "male" });
        const result = (0, daeun_1.calculateDaeun)(pillars, meta, "male");
        expect(result.direction).toBe("forward");
    });
    test("양간 연주 + 여성 = 역행(backward)", () => {
        const { pillars, meta } = (0, pillars_1.calculateFourPillars)({ calendarType: "solar", date: "1990-05-20", time: "14:30", gender: "female" });
        const result = (0, daeun_1.calculateDaeun)(pillars, meta, "female");
        expect(result.direction).toBe("backward");
    });
    test("음간 연주 + 남성 = 역행(backward)", () => {
        // 1991년 = 신미년, 신(辛)은 음간
        const { pillars, meta } = (0, pillars_1.calculateFourPillars)({ calendarType: "solar", date: "1991-05-20", time: "14:30", gender: "male" });
        const result = (0, daeun_1.calculateDaeun)(pillars, meta, "male");
        expect(result.direction).toBe("backward");
    });
    test("음간 연주 + 여성 = 순행(forward)", () => {
        const { pillars, meta } = (0, pillars_1.calculateFourPillars)({ calendarType: "solar", date: "1991-05-20", time: "14:30", gender: "female" });
        const result = (0, daeun_1.calculateDaeun)(pillars, meta, "female");
        expect(result.direction).toBe("forward");
    });
});
describe("대운 - 독립 기준값 검증 (구현 코드와 무관하게 직접 계산한 값과 대조)", () => {
    test("여성 역행: 대운수 정밀값이 '절기 절입 시각'을 직접 하드코딩해 계산한 값과 일치한다", () => {
        const { pillars, meta } = (0, pillars_1.calculateFourPillars)({ calendarType: "solar", date: "1990-05-20", time: "14:30", gender: "female" });
        const result = (0, daeun_1.calculateDaeun)(pillars, meta, "female");
        expect(result.boundaryJie.name).toBe("입하");
        // 아래 두 시각은 daeun.ts 내부 로직을 전혀 호출하지 않고, 이 테스트 파일에서
        // 독립적으로(리터럴 값으로) 직접 밀리초 차이를 구해 기대값을 만든다.
        // - 출생시각: 1990-05-20 14:30:00
        // - 절입시각(입하): 1990-05-06 02:35:26 (라이브러리 출력을 별도로 1회 확인해 리터럴로 고정)
        const birthMsIndependent = Date.UTC(1990, 4, 20, 14, 30, 0); // month는 0-indexed(4=5월)
        const jieMsIndependent = Date.UTC(1990, 4, 6, 2, 35, 26);
        const expectedDays = (birthMsIndependent - jieMsIndependent) / (1000 * 60 * 60 * 24);
        const expectedStartAgePrecise = expectedDays / 3;
        expect(result.daysToBoundaryJie).toBeCloseTo(expectedDays, 5);
        expect(result.startAgePrecise).toBeCloseTo(expectedStartAgePrecise, 5);
        // 표시값은 정밀값을 소수 첫째자리로 반올림한 것과 일치해야 함 (반올림 자체가 옳다는 뜻은 아님)
        expect(result.startAgeDisplay).toBeCloseTo(Math.round(expectedStartAgePrecise * 10) / 10, 5);
    });
    test("남성 순행: 대운수 정밀값이 독립적으로 계산한 값과 일치한다", () => {
        const { pillars, meta } = (0, pillars_1.calculateFourPillars)({ calendarType: "solar", date: "1990-05-20", time: "14:30", gender: "male" });
        const result = (0, daeun_1.calculateDaeun)(pillars, meta, "male");
        expect(result.boundaryJie.name).toBe("망종");
        const birthMsIndependent = Date.UTC(1990, 4, 20, 14, 30, 0);
        const jieMsIndependent = Date.UTC(1990, 5, 6, 6, 46, 18); // 망종 1990-06-06 06:46:18 (5=6월, 0-indexed)
        const expectedDays = (jieMsIndependent - birthMsIndependent) / (1000 * 60 * 60 * 24);
        const expectedStartAgePrecise = expectedDays / 3;
        expect(result.daysToBoundaryJie).toBeCloseTo(expectedDays, 5);
        expect(result.startAgePrecise).toBeCloseTo(expectedStartAgePrecise, 5);
    });
    test("60갑자 순환: 월주 신사 기준 순행/역행 결과가 독립적으로 나열한 60갑자 표와 일치한다", () => {
        // daeun.ts나 ganzhiCycle.ts의 STEM_ORDER/BRANCH_ORDER를 import하지 않고,
        // 60갑자 표준 순서 중 신사 앞뒤만 이 테스트에 독립적으로 리터럴 나열해서 대조한다.
        // 표준 60갑자 순서(11~20번째): 갑술 을해 병자 정축 무인 기묘 경진 신사 임오 계미
        const independentSequenceAroundSinsa = ["경진", "신사", "임오", "계미"]; // 17,18,19,20번째
        const { pillars: pillarsMale, meta: metaMale } = (0, pillars_1.calculateFourPillars)({
            calendarType: "solar",
            date: "1990-05-20",
            time: "14:30",
            gender: "male",
        });
        expect(pillarsMale.month.ganzhi).toBe("신사"); // 전제 확인
        const resultMale = (0, daeun_1.calculateDaeun)(pillarsMale, metaMale, "male"); // 순행(forward)
        expect(resultMale.periods[0].pillar.ganzhi).toBe(independentSequenceAroundSinsa[2]); // 신사 다음 = 임오
        const { pillars: pillarsFemale, meta: metaFemale } = (0, pillars_1.calculateFourPillars)({
            calendarType: "solar",
            date: "1990-05-20",
            time: "14:30",
            gender: "female",
        });
        const resultFemale = (0, daeun_1.calculateDaeun)(pillarsFemale, metaFemale, "female"); // 역행(backward)
        expect(resultFemale.periods[0].pillar.ganzhi).toBe(independentSequenceAroundSinsa[0]); // 신사 이전 = 경진
    });
});
describe("대운 - endAgePrecise 구조 (다음 대운 시작값 기준, 임의 보정 없음)", () => {
    test("각 period의 endAgePrecise는 정확히 다음 period의 startAgePrecise와 같다", () => {
        const { pillars, meta } = (0, pillars_1.calculateFourPillars)({ calendarType: "solar", date: "1990-05-20", time: "14:30", gender: "female" });
        const result = (0, daeun_1.calculateDaeun)(pillars, meta, "female");
        for (let i = 0; i < result.periods.length - 1; i++) {
            expect(result.periods[i].endAgePrecise).toBe(result.periods[i + 1].startAgePrecise);
        }
    });
    test("마지막 period의 endAgePrecise는 null이다 (다음 경계가 없음을 명시)", () => {
        const { pillars, meta } = (0, pillars_1.calculateFourPillars)({ calendarType: "solar", date: "1990-05-20", time: "14:30", gender: "female" });
        const result = (0, daeun_1.calculateDaeun)(pillars, meta, "female", 3);
        expect(result.periods).toHaveLength(3);
        expect(result.periods[2].endAgePrecise).toBeNull();
    });
    test("startAgePrecise는 반올림되지 않은 값이며, startAgeDisplay와 다를 수 있다", () => {
        const { pillars, meta } = (0, pillars_1.calculateFourPillars)({ calendarType: "solar", date: "1990-05-20", time: "14:30", gender: "female" });
        const result = (0, daeun_1.calculateDaeun)(pillars, meta, "female");
        // 정밀값을 반올림한 결과가 표시값과 정확히 일치하는지만 확인 (반올림 로직 자체의 일관성 검증)
        expect(result.periods[0].startAgeDisplay).toBe(Math.round(result.periods[0].startAgePrecise * 10) / 10);
    });
});
describe("대운 - 절기 근접 경계 (순행/역행이 '가까운 절기'가 아니라 '정해진 방향의 절기'를 쓰는지)", () => {
    test("역행: 절입 26초 전에 태어나도 방금 지나갈 뻔한 절기가 아니라 '이전' 절기를 기준으로 삼는다", () => {
        // 1990-05-06 02:35:26이 정확한 입하 절입 시각. 그 26초 전(02:35:00)에 태어나면
        // "입하가 코앞"이지만, 역행은 반드시 '이전' 절(청명, 4/5)을 기준으로 해야 한다.
        // 실행 결과를 직접 확인해 검증된 값이며, "가장 가까운 절기"를 쓰는 식의 오류가
        // 없는지 확인하는 회귀 테스트다.
        const { pillars, meta } = (0, pillars_1.calculateFourPillars)({
            calendarType: "solar",
            date: "1990-05-06",
            time: "02:35",
            gender: "female", // 1990=경오년(양간), 여성 -> 역행
        });
        const result = (0, daeun_1.calculateDaeun)(pillars, meta, "female");
        expect(result.direction).toBe("backward");
        expect(result.boundaryJie.name).toBe("청명"); // 입하가 아니라 청명이어야 함
        expect(result.startAgePrecise).toBeGreaterThan(9); // 거의 한 달치 거리이므로 대운수가 크게 나와야 정상
    });
    test("순행: 절입 직후에 태어나도 방금 지나간 절기가 아니라 '다음' 절기를 기준으로 삼는다", () => {
        const { pillars, meta } = (0, pillars_1.calculateFourPillars)({
            calendarType: "solar",
            date: "1990-05-06",
            time: "02:36", // 입하(02:35:26) 34초 후
            gender: "male", // 경오년(양간), 남성 -> 순행
        });
        const result = (0, daeun_1.calculateDaeun)(pillars, meta, "male");
        expect(result.direction).toBe("forward");
        expect(result.boundaryJie.name).toBe("망종"); // 방금 지나간 입하가 아니라 다음 절기여야 함
        expect(result.startAgePrecise).toBeGreaterThan(9);
    });
});
describe("대운 - 기본 구조", () => {
    test("대운 기간은 기본 9개가 생성되고, 각 period.order는 1부터 순차적이다", () => {
        const { pillars, meta } = (0, pillars_1.calculateFourPillars)({ calendarType: "solar", date: "1990-05-20", time: "14:30", gender: "female" });
        const result = (0, daeun_1.calculateDaeun)(pillars, meta, "female");
        expect(result.periods).toHaveLength(9);
        result.periods.forEach((p, i) => expect(p.order).toBe(i + 1));
    });
    test("periodCount 파라미터로 생성 개수를 조절할 수 있다", () => {
        const { pillars, meta } = (0, pillars_1.calculateFourPillars)({ calendarType: "solar", date: "1990-05-20", time: "14:30", gender: "female" });
        const result = (0, daeun_1.calculateDaeun)(pillars, meta, "female", 3);
        expect(result.periods).toHaveLength(3);
    });
    test("9개 대운의 간지가 서로 모두 다르다 (60갑자 주기 안에서는 중복 없음)", () => {
        const { pillars, meta } = (0, pillars_1.calculateFourPillars)({ calendarType: "solar", date: "1990-05-20", time: "14:30", gender: "male" });
        const result = (0, daeun_1.calculateDaeun)(pillars, meta, "male", 9);
        const ganzhis = result.periods.map((p) => p.pillar.ganzhi);
        expect(new Set(ganzhis).size).toBe(ganzhis.length);
    });
});
describe("대운 - 출생시간 미입력 시 경고 플래그", () => {
    test("출생시간 미입력 시 timeUnknownWarning이 true로 명시된다", () => {
        const { pillars, meta } = (0, pillars_1.calculateFourPillars)({ calendarType: "solar", date: "1990-05-20", gender: "male" });
        const result = (0, daeun_1.calculateDaeun)(pillars, meta, "male");
        expect(result.timeUnknownWarning).toBe(true);
    });
    test("출생시간 입력 시 timeUnknownWarning이 false다", () => {
        const { pillars, meta } = (0, pillars_1.calculateFourPillars)({ calendarType: "solar", date: "1990-05-20", time: "14:30", gender: "male" });
        const result = (0, daeun_1.calculateDaeun)(pillars, meta, "male");
        expect(result.timeUnknownWarning).toBe(false);
    });
});
describe("대운 - 잘못된 입력", () => {
    test("알 수 없는 연간 천간에 대해 명확한 에러를 던진다", () => {
        const { pillars, meta } = (0, pillars_1.calculateFourPillars)({ calendarType: "solar", date: "1990-05-20", time: "14:30", gender: "male" });
        const invalidPillars = { ...pillars, year: { ...pillars.year, heavenlyStem: "XX" } };
        expect(() => (0, daeun_1.calculateDaeun)(invalidPillars, meta, "male")).toThrow(/알 수 없는 연간 천간/);
    });
});
describe("calculateSaju() 통합 검증 - Phase 2-5까지 반영 여부", () => {
    test("calculateSaju() 결과의 daeun이 빈 배열이 아니라 실제 계산된 구조다", () => {
        const saju = (0, index_1.calculateSaju)({ calendarType: "solar", date: "1967-04-03", time: "04:50", gender: "male" }, 2024);
        expect(saju.daeun.periods.length).toBeGreaterThan(0);
        expect(saju.daeun.direction).toMatch(/forward|backward/);
        expect(typeof saju.daeun.startAgePrecise).toBe("number");
        expect(typeof saju.daeun.startAgeDisplay).toBe("number");
        // Phase 2-6 완료 - seun도 이제 실제 계산된 구조를 가지므로 빈 스키마 검증은 하지 않는다.
        // (세운 자체 검증은 tests/seun.test.ts, 통합 검증은 tests/sajuSeunIntegration.test.ts에서 전담)
    });
});
