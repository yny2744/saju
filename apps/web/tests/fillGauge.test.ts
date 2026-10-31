import { calculateSaju } from "saju-engine";
import { fillGapPercent, fillGapFromKey, fillLine, FILL_COLOR, FILL_GAP_MIN, FILL_GAP_MAX } from "../src/lib/fillGauge";
import { neededEnergy } from "../src/lib/neededEnergy";

/** "남은 작은 빈자리" 게이지 (2026-10-31 유샘) */
describe("남은 작은 빈자리 게이지", () => {
  it("빈 곳은 40~60% 사이, 사람마다 조금씩 다르다", () => {
    const gaps = new Set<number>();
    for (let y = 1950; y < 2010; y += 3) {
      for (const t of ["03:20", "11:40", "19:10"]) {
        const g = fillGapPercent(calculateSaju({ calendarType: "solar", date: `${y}-05-17`, time: t, gender: "female" }, 2026));
        expect(g).toBeGreaterThanOrEqual(FILL_GAP_MIN);
        expect(g).toBeLessThanOrEqual(FILL_GAP_MAX);
        gaps.add(g);
      }
    }
    expect(gaps.size).toBeGreaterThan(8);
  });

  it("같은 사주면 언제 봐도, 누가 봐도 같은 크기 (무작위가 아니다)", () => {
    const a = calculateSaju({ calendarType: "solar", date: "2008-03-15", time: "09:30", gender: "female" }, 2026);
    const b = calculateSaju({ calendarType: "solar", date: "2008-03-15", time: "09:30", gender: "male" }, 2027);
    expect(fillGapPercent(a)).toBe(fillGapPercent(b));
    expect(neededEnergy(a).gap).toBe(fillGapPercent(a));
    expect(fillGapFromKey("x")).toBe(fillGapFromKey("x"));
  });

  it("문구는 유샘이 고른 2번, 기운 색은 다섯 가지 모두", () => {
    expect(fillLine(["화"])).toBe("남은 작은 빈자리는 불(火)의 기운으로 채워요");
    expect(fillLine(["수", "목"])).toBe("남은 작은 빈자리는 물(水)·나무(木)의 기운으로 채워요");
    expect(Object.keys(FILL_COLOR).sort()).toEqual(["금", "목", "수", "토", "화"]);
  });
});
