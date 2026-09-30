import { calculateTenGods } from "../src/tenGods";
import { calculateSaju } from "../src/index";
import { determineTenGod } from "../src/rules/tenGodTables";

describe("십신 판정 함수 자체 - 단위 테스트 (수기 검산 가능한 조합)", () => {
  // 일간을 "갑(甲, 목, 양)"으로 고정하고 상대 10천간 전체에 대해 십신을 확인.
  // 이 표는 명리학 기본서에 실린 "갑목 일간 기준 십신표"와 대조 가능한 표준 조합이다.
  const cases: Array<[string, string]> = [
    ["갑", "비견"], // 목/양 vs 목/양 = 같음, 같은 음양
    ["을", "겁재"], // 목/음 vs 목/양 = 같음, 다른 음양
    ["병", "식신"], // 화/양: 갑(목)이 화를 생함, 같은 음양(양-양)
    ["정", "상관"], // 화/음: 갑이 화를 생함, 다른 음양
    ["무", "편재"], // 토/양: 갑(목)이 토를 극함, 같은 음양
    ["기", "정재"], // 토/음: 갑이 토를 극함, 다른 음양
    ["경", "편관"], // 금/양: 금이 갑(목)을 극함, 같은 음양
    ["신", "정관"], // 금/음: 금이 갑을 극함, 다른 음양
    ["임", "편인"], // 수/양: 수가 갑(목)을 생함, 같은 음양
    ["계", "정인"], // 수/음: 수가 갑을 생함, 다른 음양
  ];

  test.each(cases)("일간 갑(목,양) 기준 %s의 십신은 %s", (otherStem, expected) => {
    const STEM_ELEMENT: Record<string, any> = {
      갑: "목", 을: "목", 병: "화", 정: "화", 무: "토", 기: "토", 경: "금", 신: "금", 임: "수", 계: "수",
    };
    const STEM_POLARITY: Record<string, any> = {
      갑: "양", 을: "음", 병: "양", 정: "음", 무: "양", 기: "음", 경: "양", 신: "음", 임: "양", 계: "음",
    };
    const result = determineTenGod("목", "양", STEM_ELEMENT[otherStem], STEM_POLARITY[otherStem]);
    expect(result).toBe(expected);
  });

  // 음간 일간(을목,음) 기준으로도 전체 표를 검증한다.
  // 양간만 검증하면 "같은 음양->편/비견, 다른 음양->정/겁재" 분기 로직이 dayPolarity="양"일
  // 때만 맞고 dayPolarity="음"일 때는 틀리는 식의 버그를 놓칠 수 있어, 반드시 별도로 검증해야 한다.
  const yinDayMasterCases: Array<[string, string]> = [
    ["갑", "겁재"],
    ["을", "비견"],
    ["병", "상관"],
    ["정", "식신"],
    ["무", "정재"],
    ["기", "편재"],
    ["경", "정관"],
    ["신", "편관"],
    ["임", "정인"],
    ["계", "편인"],
  ];

  test.each(yinDayMasterCases)("일간 을(목,음) 기준 %s의 십신은 %s", (otherStem, expected) => {
    const STEM_ELEMENT: Record<string, any> = {
      갑: "목", 을: "목", 병: "화", 정: "화", 무: "토", 기: "토", 경: "금", 신: "금", 임: "수", 계: "수",
    };
    const STEM_POLARITY: Record<string, any> = {
      갑: "양", 을: "음", 병: "양", 정: "음", 무: "양", 기: "음", 경: "양", 신: "음", 임: "양", 계: "음",
    };
    const result = determineTenGod("목", "음", STEM_ELEMENT[otherStem], STEM_POLARITY[otherStem]);
    expect(result).toBe(expected);
  });
});

describe("십신 계산 - 정상 케이스 (실제 사주 데이터)", () => {
  test("1967-04-03 04:50 남성 (정미/계묘/정유/임인) - 일간 정(화,음) 기준 십신", () => {
    const saju = calculateSaju({ calendarType: "solar", date: "1967-04-03", time: "04:50", gender: "male" }, 2024);
    const result = calculateTenGods(saju.pillars);

    expect(result.dayMaster).toEqual({ stem: "정", element: "화", polarity: "음" });

    // 연간 정(화,음) vs 일간 정(화,음): 같은 오행, 같은 음양 -> 비견
    expect(result.heavenlyStems.year).toBe("비견");
    // 월간 계(수,음) vs 일간 정(화,음): 수가 화를 극함(수극화), 같은 음양(음-음) -> 편관
    expect(result.heavenlyStems.month).toBe("편관");
    // 시간 임(수,양) vs 일간 정(화,음): 수가 화를 극함, 다른 음양(양-음) -> 정관
    expect(result.heavenlyStems.hour).toBe("정관");
  });
});

describe("십신 계산 - 경계값: 출생시간 미입력", () => {
  test("시주가 null이면 heavenlyStems.hour와 earthlyBranches.hour가 생략된다", () => {
    const saju = calculateSaju({ calendarType: "solar", date: "1990-05-20", gender: "male" }, 2024);
    const result = calculateTenGods(saju.pillars);

    expect(result.heavenlyStems.hour).toBeUndefined();
    expect(result.earthlyBranches.hour).toBeUndefined();
    // 연/월은 정상적으로 존재해야 함
    expect(result.heavenlyStems.year).toBeDefined();
    expect(result.earthlyBranches.year).toBeDefined();
  });
});

describe("십신 계산 - 지지(지장간) 십신 구조 - 정기 기준 실제값 (회귀 테스트)", () => {
  test("1967-04-03 04:50 남성 (정미/계묘/정유/임인) - 4개 지지의 정기 기준 십신 실제값", () => {
    const saju = calculateSaju({ calendarType: "solar", date: "1967-04-03", time: "04:50", gender: "male" }, 2024);
    const result = calculateTenGods(saju.pillars);

    // 아래 4개 값은 명리학 표준 십신 조견표 규칙(같은 음양=편, 다른 음양=정; 단 비겁만
    // 같은 음양=비견/다른 음양=겁재)에 따라 수기로 재검산해서 코드 계산값과 대조 확인함:
    //   연지 미(정기 己토음) vs 일간 정(화음): 화생토, 같은 음양(음-음) -> 식신
    //   월지 묘(정기 乙목음) vs 일간 정(화음): 목생화(상대가 나를 생함), 같은 음양 -> 편인
    //   일지 유(정기 辛금음) vs 일간 정(화음): 화극금(내가 상대를 극함), 같은 음양 -> 편재
    //   시지 인(정기 甲목양) vs 일간 정(화음): 목생화(상대가 나를 생함), 다른 음양(양-음) -> 정인
    expect(result.earthlyBranches.year!.primary).toBe("식신");
    expect(result.earthlyBranches.month!.primary).toBe("편인");
    expect(result.earthlyBranches.day!.primary).toBe("편재");
    expect(result.earthlyBranches.hour!.primary).toBe("정인");
  });

  test("지지 십신은 정기 기준 primary + 지장간별 breakdown을 모두 제공한다", () => {
    const saju = calculateSaju({ calendarType: "solar", date: "1990-05-20", time: "14:30", gender: "female" }, 2024);
    const result = calculateTenGods(saju.pillars);

    const yearBranchResult = result.earthlyBranches.year;
    expect(yearBranchResult).toBeDefined();
    expect(yearBranchResult!.primary).toBeDefined();
    expect(yearBranchResult!.hiddenStemTenGods.length).toBeGreaterThan(0);
    // 정기 항목이 반드시 하나 포함되어야 함
    expect(yearBranchResult!.hiddenStemTenGods.some((h) => h.type === "정기")).toBe(true);
  });

  test("일지(day의 지지)도 정상적으로 십신이 계산된다 (일간 자신은 천간만 예외, 일지는 예외 아님)", () => {
    const saju = calculateSaju({ calendarType: "solar", date: "1990-05-20", time: "14:30", gender: "female" }, 2024);
    const result = calculateTenGods(saju.pillars);
    expect(result.earthlyBranches.day).toBeDefined();
    expect(result.heavenlyStems).not.toHaveProperty("day"); // 일간 자신은 천간 십신에서 제외되어야 함
  });
});

describe("십신 계산 - 잘못된 입력", () => {
  test("알 수 없는 천간이 포함된 pillars에 대해 명확한 에러를 던진다", () => {
    const invalidPillars = {
      year: { heavenlyStem: "갑", earthlyBranch: "자", ganzhi: "갑자" },
      month: { heavenlyStem: "갑", earthlyBranch: "자", ganzhi: "갑자" },
      day: { heavenlyStem: "XX", earthlyBranch: "자", ganzhi: "XX자" }, // 잘못된 일간
      hour: null,
    };
    expect(() => calculateTenGods(invalidPillars as any)).toThrow(/알 수 없는 천간/);
  });

  test("알 수 없는 지지가 포함된 pillars에 대해 명확한 에러를 던진다", () => {
    const invalidPillars = {
      year: { heavenlyStem: "갑", earthlyBranch: "XX", ganzhi: "갑XX" }, // 잘못된 지지
      month: { heavenlyStem: "갑", earthlyBranch: "자", ganzhi: "갑자" },
      day: { heavenlyStem: "정", earthlyBranch: "유", ganzhi: "정유" },
      hour: null,
    };
    expect(() => calculateTenGods(invalidPillars as any)).toThrow(/지장간 테이블에 없는 지지/);
  });
});

describe("calculateSaju() 통합 검증 - Phase 2-2까지 반영 여부", () => {
  test("calculateSaju() 결과에 elements와 tenGods가 모두 실제 값으로 채워진다", () => {
    const saju = calculateSaju({ calendarType: "solar", date: "1967-04-03", time: "04:50", gender: "male" }, 2024);

    // elements가 빈 객체가 아니라 실제 구조를 가져야 함
    expect(saju.elements.summary).toBeDefined();
    expect(Object.keys(saju.elements.summary.counts)).toHaveLength(5);

    // tenGods가 빈 객체가 아니라 실제 구조를 가져야 함
    expect(saju.tenGods.dayMaster).toEqual({ stem: "정", element: "화", polarity: "음" });
    expect(saju.tenGods.heavenlyStems.year).toBe("비견");

    // 아직 구현 안 된 Phase 2-4 이후 필드는 여전히 빈 스키마 상태여야 함
    // (미리 채워지거나 잘못된 값이 새어 들어가면 안 됨)
    // 주의: relations(합충형파해)는 Phase 2-3에서 구현 완료되어 더 이상 빈 스키마가 아니므로
    // 여기서는 검증하지 않는다 (relations 자체 검증은 tests/relations.test.ts에서 전담).
    // 주의: twelveStages(12운성)는 Phase 2-4에서 구현 완료되어 더 이상 빈 스키마가 아니므로
    // 여기서는 검증하지 않는다 (12운성 자체 검증은 tests/twelveStages.test.ts에서 전담).
    // 주의: daeun(대운)은 Phase 2-5에서 구현 완료되어 더 이상 빈 배열이 아니므로
    // 여기서는 검증하지 않는다 (대운 자체 검증은 tests/daeun.test.ts에서 전담).
    // 주의: seun(세운)은 Phase 2-6에서 index.ts에 연동 완료되어 더 이상 빈 스키마가 아니므로
    // 여기서는 검증하지 않는다 (세운 자체 검증은 tests/seun.test.ts, 통합 검증은
    // tests/sajuSeunIntegration.test.ts에서 전담한다). Phase 2 전체(2-1~2-6)가 이제 완료됐다.
  });
});

describe("십신 계산 - 실제값 출력 (수동 검산용)", () => {
  test("1967-04-03 04:50 남성 - 십신 전체 결과 콘솔 출력", () => {
    const saju = calculateSaju({ calendarType: "solar", date: "1967-04-03", time: "04:50", gender: "male" }, 2024);
    const result = calculateTenGods(saju.pillars);
    // eslint-disable-next-line no-console
    console.log("[십신 계산 결과]", JSON.stringify(result, null, 2));
    expect(result).toBeDefined();
  });
});
