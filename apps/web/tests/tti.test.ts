import { calculateDailyGanzhi } from "saju-engine";
import { relationOf, ttiFortune, allTtiFortunes, ttiOfYear, nextDate, TTI, STARS } from "@/lib/tti";
import { ttiDay } from "@/server/ttiService";

describe("띠와 일진의 관계", () => {
  it("충·육합·삼합·형·해·파", () => {
    expect(relationOf("자", "오")).toBe("충");
    expect(relationOf("자", "축")).toBe("육합");
    expect(relationOf("자", "진")).toBe("삼합");
    expect(relationOf("인", "사")).toBe("형"); // 형과 해가 겹치면 형
    expect(relationOf("자", "미")).toBe("해");
    expect(relationOf("자", "유")).toBe("파");
    expect(relationOf("사", "신")).toBe("육합"); // 합이 우선
    expect(relationOf("인", "신")).toBe("충"); // 충이 우선
    expect(relationOf("오", "오")).toBe("형"); // 자형
    expect(relationOf("자", "자")).toBe("같은 띠");
    expect(relationOf("자", "인")).toBe("평");
  });
  it("별점", () => {
    expect(STARS["육합"]).toBe(5);
    expect(STARS["충"]).toBe(1);
  });
});

describe("띠별 운세", () => {
  it("열두 띠 모두 문구가 채워진다", () => {
    const all = allTtiFortunes("오", "2026-10-09");
    expect(all).toHaveLength(12);
    for (const f of all) {
      expect(f.total.length).toBeGreaterThan(10);
      expect(f.luckyColor).toBeTruthy();
    }
    expect(all[0].relation).toBe("충"); // 쥐띠 vs 午일
  });
  it("같은 관계라도 날짜가 바뀌면 문구가 바뀐다", () => {
    const a = ttiFortune(TTI[0], "인", "2026-10-09");
    const b = ttiFortune(TTI[0], "인", "2026-10-10");
    expect(a.total === b.total && a.money === b.money).toBe(false);
  });
  it("엔진 일진과 연결 (오늘 표 = 엔진 일진의 지지)", () => {
    const d = ttiDay("2026-10-09");
    expect(d.dayGanzhi).toBe(calculateDailyGanzhi("2026-10-09").ganzhi);
    expect(d.fortunes).toHaveLength(12);
  });
  it("태어난 해 → 띠, 다음 날", () => {
    expect(ttiOfYear(1967).animal).toBe("양");
    expect(ttiOfYear(1964).animal).toBe("용");
    expect(ttiOfYear(2026).animal).toBe("말");
    expect(nextDate("2026-12-31")).toBe("2027-01-01");
  });
});
