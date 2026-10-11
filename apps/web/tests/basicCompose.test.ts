import { calculateSaju } from "saju-engine";
import { composeBasic, TOPIC_LIB } from "@/lib/basic/compose";
import { TOPIC_KEYS } from "@/lib/topics";

const CASES = [
  { calendarType: "solar", date: "1967-04-03", time: "04:50", gender: "male" },
  { calendarType: "solar", date: "1990-05-20", time: "14:30", gender: "female" },
  { calendarType: "solar", date: "1975-11-02", time: null, gender: "female" },
  { calendarType: "lunar", date: "1958-08-15", time: "23:40", gender: "male" },
] as const;

describe("수정안 33 - 990냥 엔진 풀이", () => {
  it("문장 창고가 12가지 운세 × 5기운을 빠짐없이 갖춤", () => {
    for (const t of TOPIC_KEYS) {
      const lib = TOPIC_LIB[t];
      for (const e of ["목", "화", "토", "금", "수"] as const) {
        expect(lib.lens[e]).toBeTruthy();
        expect(lib.lack[e]).toBeTruthy();
      }
      for (const g of ["비겁", "식상", "재성", "관성", "인성"] as const) {
        expect(lib.strong[g]).toBeTruthy();
        expect(lib.flow[g]).toBeTruthy();
      }
    }
  });

  it("모든 사주 × 모든 운세: 이름이 채워지고, 1,300자 이상, 같은 입력엔 같은 글", () => {
    for (const input of CASES) {
      const saju = calculateSaju(input as never, 2026);
      for (const t of TOPIC_KEYS) {
        const r = composeBasic(saju, "홍길동", t, "2026-10-10");
        expect(r.body).not.toContain("{이름}");
        expect(r.body).toContain("홍길동님");
        expect(r.body).not.toMatch(/undefined|null|NaN/);
        expect(r.body.length).toBeGreaterThan(1300);
        expect(r.sections).toHaveLength(4);
        expect(r.lack.body).toContain("딱 하나");
        expect(composeBasic(saju, "홍길동", t, "2026-10-10").body).toBe(r.body);
      }
    }
  });

  it("유남영 사주 연애: 엔진이 확정한 근거 그대로 (정유 대운·병오년·묘유충·토 부족)", () => {
    const saju = calculateSaju({ calendarType: "solar", date: "1967-04-03", time: "04:50", gender: "male" } as never, 2026);
    const r = composeBasic(saju, "유남영", "love", "2026-10-10");
    expect(r.body).toContain("정유(丁酉) 대운");
    expect(r.body).toContain("병오(丙午)년");
    expect(r.body).toContain("충(沖)");
    expect(r.lack.fill.element).toBe("토");
    expect(r.chart.pillars.find((p) => p.label === "일주")?.highlight).toBe(true);
    // eslint-disable-next-line no-console
    console.log(r.body.length, "\n" + r.body);
  });
});
