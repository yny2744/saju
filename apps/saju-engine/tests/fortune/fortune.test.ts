import { calculateSaju } from "../../src/index";
import { calculateFortune } from "../../src/fortune/fortune";
import { getTodayKstDateString } from "../../src/kstDate";

const sampleSaju = calculateSaju(
  { calendarType: "solar", date: "1990-05-20", time: "14:30", gender: "male" },
  2026
);

describe("calculateFortune (통합)", () => {
  test("targetDate를 명시하면 그 날짜 기준으로 계산한다", () => {
    const result = calculateFortune(sampleSaju, "2026-09-22");
    expect(result.date).toBe("2026-09-22");
    expect(result.calculationMeta.resolvedDate).toBe("2026-09-22");
    expect(result.calculationMeta.timezone).toBe("Asia/Seoul");
    expect(result.dayGanzhi.ganzhi).toHaveLength(2);
  });

  test("targetDate 생략 시 KST 기준 오늘 날짜를 사용한다", () => {
    const result = calculateFortune(sampleSaju);
    expect(result.date).toBe(getTodayKstDateString());
  });

  test("기존 Saju Engine의 계산 결과(사주 자체)는 Fortune 계산으로 전혀 변경되지 않는다", () => {
    const before = JSON.stringify(sampleSaju);
    calculateFortune(sampleSaju, "2026-09-22");
    const after = JSON.stringify(sampleSaju);
    expect(after).toBe(before); // 참조 변경/사이드이펙트 없음 확인
  });

  test("같은 사주 + 같은 날짜 → 항상 같은 결과 (결정론성, LLM 비호출)", () => {
    const a = calculateFortune(sampleSaju, "2026-09-22");
    const b = calculateFortune(sampleSaju, "2026-09-22");
    expect(a).toEqual(b);
  });

  test("relationToday가 실제로 채워진 구조로 반환된다", () => {
    const result = calculateFortune(sampleSaju, "2026-09-22");
    expect(result.relationToday.tenGodOfDay).toBeDefined();
    expect(result.relationToday.twelveStageOfDay).toBeDefined();
    expect(result.relationToday.perPillar.day).toBeDefined();
  });

  test("잘못된 날짜 형식을 넘기면 에러를 던진다", () => {
    expect(() => calculateFortune(sampleSaju, "2026.09.22")).toThrow();
  });
});
