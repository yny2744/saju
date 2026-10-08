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

describe("년생별 한 줄 (수정안 15, 만 40~75세)", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { yearGanzhi, stemRelation, ttiBirthYears, ttiYearLines } = require("@/lib/tti");

  it("해마다 간지: 1962 임인 · 1974 갑인 · 1986 병인 · 1951 신묘", () => {
    expect(yearGanzhi(1962).ganzhi).toBe("임인");
    expect(yearGanzhi(1974).ganzhi).toBe("갑인");
    expect(yearGanzhi(1986).ganzhi).toBe("병인");
    expect(yearGanzhi(1951).ganzhi).toBe("신묘");
    expect(yearGanzhi(2026).ganzhi).toBe("병오");
  });

  it("2026년 기준 1951~1986년생, 띠마다 정확히 3개", () => {
    const all = TTI.flatMap((t) => ttiBirthYears(t.branch, 2026));
    expect(all).toHaveLength(36);
    expect(Math.min(...all)).toBe(1951);
    expect(Math.max(...all)).toBe(1986);
    expect(ttiBirthYears("인", 2026)).toEqual([1962, 1974, 1986]);
    expect(ttiBirthYears("묘", 2026)).toEqual([1951, 1963, 1975]);
  });

  it("해가 바뀌면 범위가 한 해씩 옮겨 간다 (2027 → 1952~1987)", () => {
    const all = TTI.flatMap((t) => ttiBirthYears(t.branch, 2027));
    expect(all).toHaveLength(36);
    expect(Math.min(...all)).toBe(1952);
    expect(Math.max(...all)).toBe(1987);
  });

  it("천간 관계: 합·비화·인성·식상·재성·관성", () => {
    expect(stemRelation("정", "임")).toBe("합");
    expect(stemRelation("갑", "을")).toBe("비화");
    expect(stemRelation("갑", "갑")).toBe("비화");
    expect(stemRelation("갑", "임")).toBe("인성"); // 수생목
    expect(stemRelation("갑", "병")).toBe("식상"); // 목생화
    expect(stemRelation("갑", "무")).toBe("재성"); // 목극토
    expect(stemRelation("갑", "경")).toBe("관성"); // 금극목
  });

  it("같은 띠라도 년생마다 다른 간지·관계로 풀고, ttiDay에 3줄씩 실린다", () => {
    const d = ttiDay("2026-10-09");
    for (const f of d.fortunes) {
      expect(f.years).toHaveLength(3);
      for (const y of f.years) {
        expect(y.label).toBe(`${String(y.year).slice(2)}년생`);
        expect(y.text.length).toBeGreaterThan(10);
      }
    }
    const tiger = d.fortunes.find((f) => f.branch === "인")!;
    expect(tiger.years.map((y) => y.ganzhi)).toEqual(["임인", "갑인", "병인"]);
    const lines = ttiYearLines("인", "갑", "2026-10-09");
    expect(lines.map((l: { relation: string }) => l.relation)).toEqual(["식상", "비화", "인성"]); // 임(수)→갑(목) 내가 낳음 · 갑=갑 · 갑(목)→병(화) 나를 낳음
  });
});
