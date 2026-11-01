import { handleTaekil } from "@/server/taekil/taekilService";

/** 2026-11-01 택일관 */
const now = new Date("2026-11-01T03:00:00Z"); // 한국 11월 1일 정오
const base = { calendarType: "solar", date: "1990-05-15", period: "this" };

describe("택일관", () => {
  it("목적을 고르지 않거나 날짜가 틀리면 안내", () => {
    expect(handleTaekil({ ...base }, "t1", now).status).toBe(400);
    expect(handleTaekil({ ...base, purpose: "move", date: "1990-13-40" }, "t2", now).status).toBe(400);
  });
  it("이번 달·다음 달, 띠와 이유 한 줄", () => {
    const r = handleTaekil({ ...base, purpose: "wedding" }, "t3", now).body as { month: number; tti: string; days: Array<{ date: string; reason: string }> };
    expect(r.month).toBe(11);
    expect(r.tti).toBe("말띠");
    for (const d of r.days) expect(d.date > "2026-11-01").toBe(true);
    const n = handleTaekil({ ...base, purpose: "wedding", period: "next" }, "t4", now).body as { month: number };
    expect(n.month).toBe(12);
  });
});
