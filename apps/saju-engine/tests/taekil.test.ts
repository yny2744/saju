import { judgeDay, recommendDays } from "../src/taekil";
import { calculateDailyGanzhi } from "../src/fortune/dailyGanzhi";
import { Solar } from "lunar-javascript";

/** 2026-11-01 유샘 승인 택일 기준 */
const base = { year: 2026, month: 11, after: "2026-11-01", yearBranch: "오", dayBranch: "자", neededElements: ["수" as const] };

describe("택일", () => {
  it("오늘까지의 날은 고르지 않는다", () => {
    expect(judgeDay({ ...base, purpose: "contract" }, "2026-11-01")).toBeNull();
  });

  it("띠·일지와 충인 날은 뺀다 (오띠 → 자일, 자 일지 → 오일)", () => {
    for (let d = 2; d <= 30; d++) {
      const date = `2026-11-${String(d).padStart(2, "0")}`;
      const b = calculateDailyGanzhi(date).branch;
      if (b === "자" || b === "오") for (const p of ["move", "wedding", "opening", "contract"] as const) expect(judgeDay({ ...base, purpose: p }, date)).toBeNull();
    }
  });

  it("이사는 손 없는 날만, 破·閉와 황력에서 꺼리는 날은 없다", () => {
    const r = recommendDays({ ...base, purpose: "move" });
    for (const day of r.days) {
      const [y, m, d] = day.date.split("-").map(Number);
      const l = Solar.fromYmd(y, m, d).getLunar();
      expect([9, 0]).toContain(l.getDay() % 10);
      expect(["破", "闭"]).not.toContain(l.getZhiXing());
      expect(l.getDayJi()).not.toContain("移徙");
    }
  });

  it("목적마다 3~5개(있는 만큼), 이유는 한 줄 문장", () => {
    for (const p of ["move", "wedding", "opening", "contract"] as const) {
      const r = recommendDays({ ...base, purpose: p });
      expect(r.days.length).toBeLessThanOrEqual(5);
      expect(r.days.length).toBeGreaterThanOrEqual(Math.min(3, r.passed));
      for (const d of r.days) {
        expect(d.reason.startsWith("본인 띠·일지와 부딪히지 않")).toBe(true);
        expect(d.reason).toMatch(/요\.$/);
      }
    }
  });

  it("같은 입력이면 늘 같은 결과", () => {
    expect(recommendDays({ ...base, purpose: "wedding" })).toEqual(recommendDays({ ...base, purpose: "wedding" }));
  });
});
