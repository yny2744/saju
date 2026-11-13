import { examQualityProblem, inventedGanzhi } from "@/server/exam/exam";

// 2026-11-13 유샘 검수 원칙 - 엔진 사실에 없는 간지·결과 예측·'님' 단독 호칭을 걸러낸다
const facts = "- 올해 세운: 병오(丙午) 식상\n- 지금 대운: 계축(癸丑) 인성\n- 시험날 일진: 정유(丁酉) → 나에게 식상";

describe("수능 풀이 품질 검사", () => {
  test("앞뒤 해의 해 간지는 허용 (2026 병오 · 2027 정미)", () => {
    // examCheckFacts 가 붙이는 줄과 같은 모양
    const withYears = `${facts}\n을사(乙巳) 병오(丙午) 정미(丁未)`;
    expect(inventedGanzhi("내년 정미년(丁未年)에는", withYears)).toBeNull();
    expect(inventedGanzhi("무신년(戊申年)", withYears)).toBe("戊申");
  });
  test("확정 사실의 간지만 쓰면 통과", () => {
    expect(inventedGanzhi("계축(癸丑) 대운과 병오(丙午) 세운, 시험날 정유(丁酉)", facts)).toBeNull();
    expect(inventedGanzhi("갑자기 공부가 잘 되는 날", facts)).toBeNull();
  });
  test("사실에 없는 간지는 걸린다", () => {
    expect(inventedGanzhi("일주 갑자(甲子)는", facts)).toBe("甲子");
    expect(inventedGanzhi("무진 대운이 오면", facts)).toBe("무진");
  });
  test("결과 예측과 '님' 단독 호칭은 걸린다", () => {
    expect(examQualityProblem("결실로 이어질 가능성이 높습니다.")).not.toBeNull();
    expect(examQualityProblem("시험에서 좋은 결과를 이끌어낼 수 있어요.")).not.toBeNull();
    expect(examQualityProblem("그래서 님께서 가진 힘은")).not.toBeNull();
    expect(examQualityProblem("{이름}님께서 가진 힘은 꾸준함이에요.")).toBeNull();
  });
});

describe("examCheckFacts", () => {
  test("원국 네 기둥과 앞뒤 해가 검사용 사실에 들어간다", () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { calculateSaju } = require("saju-engine");
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { examCheckFacts } = require("@/server/exam/exam");
    const saju = calculateSaju({ calendarType: "solar", date: "2008-03-15", time: "07:30", gender: "female" }, 2026);
    const f = examCheckFacts(saju, "2026-11-14");
    expect(f.text).toContain("丁未");
    expect(f.text).toContain("乙巳");
    const d = saju.pillars.day;
    expect(f.text).toContain(`${d.heavenlyStem}${d.earthlyBranch}(`);
  });
});
