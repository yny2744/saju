import { calculateSeun } from "../src/seun";
import { calculateSaju } from "../src/index";
import type { FourPillars } from "../src/types";

/**
 * 독립 검증용 60갑자 계산기.
 * daeun.ts/ganzhiCycle.ts의 STEM_ORDER/BRANCH_ORDER를 import하지 않고,
 * "1984년 = 갑자년"이라는 널리 알려진 공개 사실(60갑자 주기의 최근 시작점)을
 * 기준점 삼아 이 테스트 파일 안에서만 독립적으로 계산한다.
 */
const INDEPENDENT_STEMS = ["갑", "을", "병", "정", "무", "기", "경", "신", "임", "계"];
const INDEPENDENT_BRANCHES = ["자", "축", "인", "묘", "진", "사", "오", "미", "신", "유", "술", "해"];
function independentYearGanzhi(year: number): string {
  const offset = year - 1984; // 1984 = 갑자년(공개적으로 널리 알려진 사실)
  const stemIdx = ((offset % 10) + 10) % 10;
  const branchIdx = ((offset % 12) + 12) % 12;
  return `${INDEPENDENT_STEMS[stemIdx]}${INDEPENDENT_BRANCHES[branchIdx]}`;
}

function makePillars(dayStem: string): FourPillars {
  return {
    year: { heavenlyStem: "갑", earthlyBranch: "자", ganzhi: "갑자" },
    month: { heavenlyStem: "갑", earthlyBranch: "자", ganzhi: "갑자" },
    day: { heavenlyStem: dayStem, earthlyBranch: "자", ganzhi: `${dayStem}자` },
    hour: null,
  };
}

describe("세운 - 연간지 계산 (독립 계산식과 대조, 명세서 검증 예시 포함)", () => {
  test.each([1984, 1900, 2000, 2024, 2025, 2026, 2030, 2050])(
    "%d년의 세운 간지가 독립 계산식(1984=갑자 기준)과 일치한다",
    (year) => {
      const pillars = makePillars("갑");
      const result = calculateSeun(pillars, year);
      expect(result.pillar.ganzhi).toBe(independentYearGanzhi(year));
    }
  );

  test("명세서 검증 예시(2024=갑진, 2025=을사, 2026=병오)와 정확히 일치한다", () => {
    const pillars = makePillars("갑");
    expect(calculateSeun(pillars, 2024).pillar.ganzhi).toBe("갑진");
    expect(calculateSeun(pillars, 2025).pillar.ganzhi).toBe("을사");
    expect(calculateSeun(pillars, 2026).pillar.ganzhi).toBe("병오");
  });
});

describe("세운 - 십신 계산 (일간별 대표 케이스, 독립적으로 손으로 재검산한 기대값)", () => {
  test("일간 경(금,양) 기준: 2024(갑진)=편재, 2025(을사)=정재, 2026(병오)=편관", () => {
    const pillars = makePillars("경");
    // 갑(목,양) vs 경(금,양): 금극목(내가 극함)+동일음양 -> 편재
    expect(calculateSeun(pillars, 2024).tenGod).toBe("편재");
    // 을(목,음) vs 경(금,양): 금극목+다른음양 -> 정재
    expect(calculateSeun(pillars, 2025).tenGod).toBe("정재");
    // 병(화,양) vs 경(금,양): 화극금(상대가 극함)+동일음양 -> 편관
    expect(calculateSeun(pillars, 2026).tenGod).toBe("편관");
  });

  test("일간 을(목,음) 기준: 2024(갑진)=겁재, 2025(을사)=비견, 2026(병오)=상관", () => {
    const pillars = makePillars("을");
    // 갑(목,양) vs 을(목,음): 같은오행+다른음양 -> 겁재
    expect(calculateSeun(pillars, 2024).tenGod).toBe("겁재");
    // 을(목,음) vs 을(목,음): 같은오행+같은음양 -> 비견
    expect(calculateSeun(pillars, 2025).tenGod).toBe("비견");
    // 병(화,양) vs 을(목,음): 목생화(내가생함)+다른음양 -> 상관
    expect(calculateSeun(pillars, 2026).tenGod).toBe("상관");
  });

  test("일간 계(수,음) 기준: 2000(경진)=정인 (금생수, 다른음양)", () => {
    const pillars = makePillars("계");
    // 2000년 = 경진 (독립계산식으로 확인됨). 경(금,양) vs 계(수,음): 금생수(상대가생함)+다른음양 -> 정인
    expect(calculateSeun(pillars, 2000).tenGod).toBe("정인");
  });
});

describe("세운 - 예외/경계값", () => {
  test("알 수 없는 일간 천간에 대해 명확한 에러를 던진다", () => {
    const pillars = makePillars("XX");
    expect(() => calculateSeun(pillars, 2024)).toThrow(/알 수 없는 일간 천간/);
  });
});

describe("세운 - 입력 검증 (year)", () => {
  test("정상 정수 연도는 에러 없이 계산된다", () => {
    const pillars = makePillars("갑");
    expect(() => calculateSeun(pillars, 2024)).not.toThrow();
    expect(calculateSeun(pillars, 2024).pillar.ganzhi).toBe("갑진");
  });

  test("소수 연도(2024.5)는 명확한 검증 에러를 던지고, 더 이상 '알 수 없는 천간 한자' 에러가 나지 않는다", () => {
    const pillars = makePillars("갑");
    expect(() => calculateSeun(pillars, 2024.5)).toThrow(/정수여야 합니다/);
    try {
      calculateSeun(pillars, 2024.5);
    } catch (e) {
      expect((e as Error).message).not.toMatch(/알 수 없는 천간 한자/);
    }
  });

  test("음수 연도(-100)는 범위 검증 에러를 던진다", () => {
    const pillars = makePillars("갑");
    expect(() => calculateSeun(pillars, -100)).toThrow(/범위여야 합니다/);
  });

  test("지원 범위를 벗어난 연도(예: 9999, 1800)는 범위 검증 에러를 던진다", () => {
    const pillars = makePillars("갑");
    expect(() => calculateSeun(pillars, 9999)).toThrow(/범위여야 합니다/);
    expect(() => calculateSeun(pillars, 1800)).toThrow(/범위여야 합니다/);
  });

  test("NaN 연도는 숫자 검증 에러를 던진다", () => {
    const pillars = makePillars("갑");
    expect(() => calculateSeun(pillars, NaN)).toThrow(/숫자여야 합니다/);
  });

  test("범위 경계값(1900, 2200)은 정상적으로 계산된다", () => {
    const pillars = makePillars("갑");
    expect(() => calculateSeun(pillars, 1900)).not.toThrow();
    expect(() => calculateSeun(pillars, 2200)).not.toThrow();
  });
});

describe("calculateSaju() 세운 연동 여부", () => {
  test("calculateSaju()의 seun 필드가 index.ts 연동 완료로 실제 계산된 구조를 반환한다", () => {
    const saju = calculateSaju({ calendarType: "solar", date: "1990-05-20", time: "14:30", gender: "male" }, 2024);
    // Phase 2-6이 index.ts에 연동 완료되어 더 이상 빈 객체가 아니다.
    // (상세 검증은 tests/sajuSeunIntegration.test.ts에서 전담)
    expect(saju.seun).not.toEqual({});
    expect(saju.seun.pillar.ganzhi).toBe("갑진");
  });
});
