import { calculateSaju, calculateFortune, interpretFortune } from "saju-engine";
import { elementShares, yinYangCount, relationRows, daeunCells } from "../src/lib/manseView";
import { buildFortuneView, dateLabel } from "../src/lib/fortuneView";

const CASES = [
  { calendarType: "solar", date: "1990-05-20", time: "14:30", gender: "female" },
  { calendarType: "solar", date: "1967-04-03", time: "04:50", gender: "male" },
  { calendarType: "solar", date: "2001-12-31", gender: "male" },
] as const;

describe("무료 만세력 표시값", () => {
  for (const input of CASES) {
    const saju = calculateSaju(input as never, 2026);
    test(`${input.date}: 오행 비율 합 ≈ 100, 음양 개수 = 글자 수`, () => {
      const sum = elementShares(saju).reduce((s, e) => s + e.percent, 0);
      expect(sum).toBeGreaterThanOrEqual(98);
      expect(sum).toBeLessThanOrEqual(102);
      const yy = yinYangCount(saju);
      expect(yy.yang + yy.yin).toBe("time" in input ? 8 : 6);
    });
    test(`${input.date}: 합충형파해 행 수 = 엔진 관계 수`, () => {
      const r = saju.relations;
      const n = r.combination.length + r.clash.length + r.punishment.length + r.destruction.length + r.harm.length;
      expect(relationRows(saju)).toHaveLength(n);
    });
    test(`${input.date}: 현재 대운은 최대 1개`, () => {
      const cells = daeunCells(saju, "2026-10-04");
      expect(cells.filter((c) => c.current).length).toBeLessThanOrEqual(1);
      expect(cells.length).toBe(saju.daeun.periods.length);
    });
  }
});

describe("오늘/내일 운세 화면값", () => {
  const saju = calculateSaju(CASES[1] as never, 2026);
  for (const date of ["2026-10-04", "2026-10-05", "2026-01-01", "2026-06-15"]) {
    test(`${date}: 점수 범위·조언 중복 없음`, () => {
      const f = calculateFortune(saju, date);
      const v = buildFortuneView(saju, f, interpretFortune(f));
      for (const a of v.areas) {
        expect(a.score).toBeGreaterThanOrEqual(1);
        expect(a.score).toBeLessThanOrEqual(10);
      }
      expect(v.overall.score).toBeGreaterThanOrEqual(10);
      expect(v.overall.score).toBeLessThanOrEqual(100);
      expect(v.areas.map((a) => a.text)).not.toContain(v.advice);
    });
  }
  test("2026-10-05 내일 일진은 임자(壬子)", () => {
    const f = calculateFortune(saju, "2026-10-05");
    const v = buildFortuneView(saju, f, interpretFortune(f));
    expect(v.day.hanja).toBe("壬子");
    expect(v.me.hanja).toBe("丁酉");
  });
  test("날짜 표시", () => {
    expect(dateLabel("2026-10-04")).toBe("10월 4일 일요일");
  });
});
