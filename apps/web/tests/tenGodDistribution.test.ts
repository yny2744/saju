import { calculateSaju } from "saju-engine";
import { buildTenGodDistribution, topHeadline } from "../src/lib/tenGodDistribution";

/**
 * 십신 막대그래프 집계가 엔진 규칙과 일치하는지 검증:
 * 십신 점수를 오행별로 다시 묶으면 엔진 오행 점수에서 일간 1점을 뺀 값과 같아야 한다.
 */
const CASES = [
  { calendarType: "solar", date: "1990-05-20", time: "14:30", gender: "female" },
  { calendarType: "solar", date: "1967-03-11", time: "06:10", gender: "male" },
  { calendarType: "solar", date: "2001-12-31", time: null, gender: "male" },
  { calendarType: "lunar", date: "1985-08-15", time: "23:40", gender: "female" },
] as const;

describe("buildTenGodDistribution", () => {
  for (const input of CASES) {
    test(`${input.date} ${input.time ?? "시간모름"}: 오행 점수와 일치`, () => {
      const saju = calculateSaju(input as never, 2026);
      const dist = buildTenGodDistribution(saju);

      const byElement: Record<string, number> = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };
      for (const b of dist.bars) byElement[b.element] += b.score;

      const expected = { ...(saju.elements.summary.counts as Record<string, number>) };
      expected[saju.tenGods.dayMaster.element] -= 1;
      for (const el of Object.keys(expected)) {
        expect(byElement[el]).toBeCloseTo(expected[el], 5);
      }
      // 시간 모름이면 3기둥: 천간 2 + 지지 3×2 = 8점, 아니면 3 + 4×2 = 11점
      expect(dist.total).toBeCloseTo(input.time ? 11 : 8, 5);
      expect(dist.top.length).toBeGreaterThan(0);
    });
  }

  test("문장형 제목 조사", () => {
    expect(topHeadline(["정재"])).toBe("정재가 높아요");
    expect(topHeadline(["비견"])).toBe("비견이 높아요");
    expect(topHeadline(["정재", "편관"])).toBe("정재·편관이 높아요");
  });
});
