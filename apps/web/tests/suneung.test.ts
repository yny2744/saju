import { calculateDailyGanzhi, calculateSaju } from "saju-engine";
import { EXAM_DATE, EXAM_DAY, composeExam, examDday, examFactsForPrompt, examSeason, examUnlockTopic } from "@/lib/suneung";
import { isPurchaseMode, planPurchase } from "@/server/readings/readings";
import { isSuneungOn } from "@/lib/launchMode";
import { parseExamDeep } from "@/server/exam/exam";
import { parseIntent, intentDestination } from "@/lib/intent";

describe("수능운 (2026-10-17 수정안 17)", () => {
  it("시험날 일진은 엔진 값과 같다", () => {
    const g = calculateDailyGanzhi(EXAM_DATE);
    expect(`${g.stem}${g.branch}`).toBe(`${EXAM_DAY.stem}${EXAM_DAY.branch}`);
  });

  it("시즌과 D-day", () => {
    expect(examSeason("2026-10-17")).toBe("suneung");
    expect(examSeason("2026-11-19")).toBe("suneung");
    expect(examSeason("2026-11-20")).toBe("pass");
    expect(examSeason("2027-02-28")).toBe("pass");
    expect(examSeason("2027-03-01")).toBe("start");
    expect(examDday("2026-10-17")).toBe(33);
    expect(examDday("2026-11-19")).toBe(0);
    expect(examDday("2026-11-20")).toBeNull();
    expect(examUnlockTopic("pass", true)).toBe("exam_pass_deep");
  });

  it("가격: 가볍게 990 · 깊게 4,900", () => {
    expect(planPurchase("exam", [], []).price).toBe(990);
    expect(planPurchase("exam_deep", [], []).price).toBe(4900);
  });

  it("여러 사주·시즌에서 풀이가 빈칸 없이 나오고, 합격·불합격을 단정하지 않는다", () => {
    const births = ["2008-03-14", "2007-12-01", "2008-08-30", "1967-04-03", "2009-01-20"];
    for (const date of births) {
      const saju = calculateSaju({ calendarType: "solar", date, time: "09:30", gender: "female" }, 2026);
      for (const today of ["2026-10-17", "2026-12-10", "2027-03-05"]) {
        const r = composeExam(saju, "하늘", today);
        expect(r.sections.length).toBeGreaterThanOrEqual(3);
        const text = [r.summary, ...r.sections.map((s) => s.body), r.mind].join(" ");
        expect(text).not.toMatch(/\{이름\}|undefined|NaN/);
        expect(text).not.toMatch(/붙는다|떨어진다|불합격/);
        expect(text).toContain("하늘");
        if (today === "2026-10-17") expect(r.examDay?.ganzhi).toBe("정유");
      }
      expect(examFactsForPrompt(saju, "2026-10-17")).toContain("시험날 일진");
    }
  });

  it("AI 깊게 보기 검사: 합격 단정은 다시 쓰게 한다", () => {
    const parts = (b: string) => JSON.stringify({ summary: "s", parts: [1, 2, 3].map((i) => ({ heading: `h${i}`, body: b })) });
    expect(() => parseExamDeep(parts("이번 시험에 꼭 붙을 거예요. 걱정 마세요 정말로요."), [])).toThrow();
    expect(parseExamDeep(parts("운이 붙는 흐름이라 차분히 준비하면 좋아요. 응원해요."), []).parts).toHaveLength(3);
  });

  it("대문 ?exam=1 → 사람의 수능운 화면 (스위치 on 일 때)", () => {
    const prev = process.env.NEXT_PUBLIC_SUNEUNG;
    process.env.NEXT_PUBLIC_SUNEUNG = "on";
    try {
      const i = parseIntent(new URLSearchParams("exam=1"));
      expect(i).toEqual({ kind: "exam" });
      expect(intentDestination("abc", i!)).toBe("/person/abc/exam");
    } finally {
      if (prev === undefined) delete process.env.NEXT_PUBLIC_SUNEUNG;
      else process.env.NEXT_PUBLIC_SUNEUNG = prev;
    }
  });

  it("2026-10-19 심사 동안 숨김: 스위치가 꺼져 있으면(기본) 수능운 길·구매가 모두 막힌다", () => {
    const prev = process.env.NEXT_PUBLIC_SUNEUNG;
    try {
      delete process.env.NEXT_PUBLIC_SUNEUNG;
      expect(isSuneungOn()).toBe(false);
      expect(parseIntent(new URLSearchParams("exam=1"))).not.toEqual({ kind: "exam" });
      expect(isPurchaseMode("exam")).toBe(false);
      expect(isPurchaseMode("exam_deep")).toBe(false);
      expect(isPurchaseMode("basic")).toBe(true);
      process.env.NEXT_PUBLIC_SUNEUNG = "on";
      expect(isSuneungOn()).toBe(true);
      expect(isPurchaseMode("exam")).toBe(true);
      expect(isPurchaseMode("exam_deep")).toBe(true);
      process.env.NEXT_PUBLIC_SUNEUNG = "true"; // "on" 만 켜진 값
      expect(isSuneungOn()).toBe(false);
    } finally {
      if (prev === undefined) delete process.env.NEXT_PUBLIC_SUNEUNG;
      else process.env.NEXT_PUBLIC_SUNEUNG = prev;
    }
  });
});
