import { calculateElements } from "../src/elements";
import { calculateSaju } from "../src/index";
import { HIDDEN_STEMS_TABLE, STEM_ELEMENT, BRANCH_ELEMENT } from "../src/rules/fiveElementTables";

describe("오행 규칙 테이블 자체 무결성", () => {
  test("천간 10개, 지지 12개가 모두 매핑되어 있다", () => {
    expect(Object.keys(STEM_ELEMENT)).toHaveLength(10);
    expect(Object.keys(BRANCH_ELEMENT)).toHaveLength(12);
  });

  test("모든 지지의 지장간 weight 합은 30이다 (30일 분배설 전제)", () => {
    for (const [branch, entries] of Object.entries(HIDDEN_STEMS_TABLE)) {
      const sum = entries.reduce((acc, e) => acc + e.weight, 0);
      expect(sum).toBe(30);
    }
  });

  test("12개 지지 모두 지장간 테이블에 존재한다", () => {
    expect(Object.keys(HIDDEN_STEMS_TABLE)).toHaveLength(12);
  });
});

describe("오행 계산 - 정상 케이스", () => {
  test("1967-04-03 04:50 남성 (정미/계묘/정유/임인) 오행 계산", () => {
    const saju = calculateSaju({ calendarType: "solar", date: "1967-04-03", time: "04:50", gender: "male" }, 2024);
    const result = calculateElements(saju.pillars);

    // 연주 정미: 천간 정=화, 지지 미=토
    expect(result.heavenlyStems.year).toBe("화");
    expect(result.earthlyBranches.year).toBe("토");
    // 월주 계묘: 천간 계=수, 지지 묘=목
    expect(result.heavenlyStems.month).toBe("수");
    expect(result.earthlyBranches.month).toBe("목");
    // 일주 정유: 천간 정=화, 지지 유=금
    expect(result.heavenlyStems.day).toBe("화");
    expect(result.earthlyBranches.day).toBe("금");
    // 시주 임인: 천간 임=수, 지지 인=목
    expect(result.heavenlyStems.hour).toBe("수");
    expect(result.earthlyBranches.hour).toBe("목");
  });

  test("summary.counts 합계는 천간4 + 지지4 + 지장간 가중치 합과 일치한다", () => {
    const saju = calculateSaju({ calendarType: "solar", date: "1990-05-20", time: "14:30", gender: "female" }, 2024);
    const result = calculateElements(saju.pillars);

    const totalCount = Object.values(result.summary.counts).reduce((a, b) => a + b, 0);
    // 천간 4점 + 지지 본기 4점 + 지장간 가중치(지지 4개 * 30/30 = 4점) = 12
    expect(totalCount).toBeCloseTo(12, 5);
  });

  test("dominant는 counts에서 가장 큰 값을 가진 오행이다", () => {
    const saju = calculateSaju({ calendarType: "solar", date: "1990-05-20", time: "14:30", gender: "female" }, 2024);
    const result = calculateElements(saju.pillars);
    const maxVal = Math.max(...Object.values(result.summary.counts));
    expect(result.summary.counts[result.summary.dominant]).toBe(maxVal);
  });
});

describe("오행 계산 - 경계값: 출생시간 미입력", () => {
  test("시주가 null이면 hour 관련 필드가 모두 생략되고 summary도 8글자 대신 6글자 기준으로 집계된다", () => {
    const saju = calculateSaju({ calendarType: "solar", date: "1990-05-20", gender: "male" }, 2024);
    expect(saju.pillars.hour).toBeNull();

    const result = calculateElements(saju.pillars);
    expect(result.heavenlyStems.hour).toBeUndefined();
    expect(result.earthlyBranches.hour).toBeUndefined();
    expect(result.hiddenStems.hour).toBeUndefined();

    // 연/월/일주 3개 기둥만 집계: 천간3 + 지지3 + 지장간(3*30/30=3) = 9
    const totalCount = Object.values(result.summary.counts).reduce((a, b) => a + b, 0);
    expect(totalCount).toBeCloseTo(9, 5);
  });
});

describe("오행 계산 - 잘못된 입력", () => {
  test("알 수 없는 천간/지지 문자열이 들어오면 명확한 에러를 던진다", () => {
    const invalidPillars = {
      year: { heavenlyStem: "갑", earthlyBranch: "자", ganzhi: "갑자" },
      month: { heavenlyStem: "갑", earthlyBranch: "자", ganzhi: "갑자" },
      day: { heavenlyStem: "갑", earthlyBranch: "자", ganzhi: "갑자" },
      hour: { heavenlyStem: "XX", earthlyBranch: "자", ganzhi: "XX자" }, // 잘못된 천간
    };
    expect(() => calculateElements(invalidPillars)).toThrow(/알 수 없는 천간/);
  });
});

describe("오행 계산 - 실제값 출력 (수동 검산용)", () => {
  test("1967-04-03 04:50 남성 - 오행 요약 콘솔 출력", () => {
    const saju = calculateSaju({ calendarType: "solar", date: "1967-04-03", time: "04:50", gender: "male" }, 2024);
    const result = calculateElements(saju.pillars);
    // eslint-disable-next-line no-console
    console.log("[오행 계산 결과]", JSON.stringify(result, null, 2));
    expect(result).toBeDefined();
  });
});
