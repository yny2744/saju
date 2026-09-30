import { calculateFortuneRelations } from "../../src/fortune/fortuneRelations";
import type { FourPillars } from "../../src/types";
import type { Ganzhi } from "../../src/rules/ganzhiCycle";

function pillar(heavenlyStem: string, earthlyBranch: string) {
  return { heavenlyStem, earthlyBranch, ganzhi: `${heavenlyStem}${earthlyBranch}` };
}

// 고정 fixture: 일간 "갑"(양, 목), 일지 "자"
const fixturePillars: FourPillars = {
  year: pillar("경", "오"),
  month: pillar("신", "미"),
  day: pillar("갑", "자"),
  hour: pillar("을", "해"),
};

describe("calculateFortuneRelations", () => {
  test("오늘 간지가 일주와 천간합+육합 관계일 때 정확히 감지한다 (갑자 일주 vs 기축)", () => {
    const today: Ganzhi = { stem: "기", branch: "축", ganzhi: "기축" };
    const result = calculateFortuneRelations(fixturePillars, today);

    const dayRelation = result.perPillar.day!;
    expect(dayRelation.stemCombination).toBe(true); // 갑기합
    expect(dayRelation.branchCombination).toBe(true); // 자축육합(토)
    expect(dayRelation.branchClash).toBe(false);
    expect(dayRelation.branchDestruction).toBe(false);
    expect(dayRelation.branchHarm).toBe(false);
    expect(dayRelation.branchPunishment).toBeNull();

    // 일간(갑, 목/양) 대비 오늘 천간(기, 토/음) = 정재
    expect(result.tenGodOfDay).toBe("정재");
    // 갑의 12운성 시작점(장생)=해, 순행. 해(11)→축(1) 거리 2 → "관대"
    expect(result.twelveStageOfDay).toBe("관대");

    // 4기둥 전부(연/월/일/시) 관계가 계산되어야 한다
    expect(Object.keys(result.perPillar).sort()).toEqual(["day", "hour", "month", "year"]);
  });

  test("오늘 지지가 일지와 충(沖) 관계일 때 정확히 감지한다 (갑자 일주 vs 경오)", () => {
    const today: Ganzhi = { stem: "경", branch: "오", ganzhi: "경오" };
    const result = calculateFortuneRelations(fixturePillars, today);

    const dayRelation = result.perPillar.day!;
    expect(dayRelation.branchClash).toBe(true); // 자오충
    expect(dayRelation.stemCombination).toBe(false);
    expect(dayRelation.branchCombination).toBe(false);

    // 일간(갑, 목/양) 대비 오늘 천간(경, 금/양) = 편관
    expect(result.tenGodOfDay).toBe("편관");
    // 갑의 장생=해(11), 오(6)까지 거리 7 → "사"
    expect(result.twelveStageOfDay).toBe("사");
  });

  test("시주가 없으면(hour=null) perPillar에 hour 항목을 생략한다", () => {
    const noHourPillars: FourPillars = { ...fixturePillars, hour: null };
    const today: Ganzhi = { stem: "기", branch: "축", ganzhi: "기축" };
    const result = calculateFortuneRelations(noHourPillars, today);

    expect(result.perPillar.hour).toBeUndefined();
    expect(Object.keys(result.perPillar).sort()).toEqual(["day", "month", "year"]);
  });

  test("같은 입력이면 항상 같은 결과다 (결정론성)", () => {
    const today: Ganzhi = { stem: "기", branch: "축", ganzhi: "기축" };
    const a = calculateFortuneRelations(fixturePillars, today);
    const b = calculateFortuneRelations(fixturePillars, today);
    expect(a).toEqual(b);
  });
});
