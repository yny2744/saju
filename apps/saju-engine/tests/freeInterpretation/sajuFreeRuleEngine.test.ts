import { calculateSaju, validateInterpretationResult, checkDataConsistency } from "../../src/index";
import { generateSajuFreeInterpretation } from "../../src/freeInterpretation/sajuFreeRuleEngine";

describe("generateSajuFreeInterpretation (Phase 10 - 무료 사주 AI 미사용 전환)", () => {
  const saju = calculateSaju(
    { calendarType: "solar", date: "1990-05-20", time: "14:30", gender: "female" },
    2025
  );

  test("AIInterpretationEngine.interpret()과 동일한 InterpretationResult 모양을 반환한다", () => {
    const result = generateSajuFreeInterpretation(saju);
    expect(result).toHaveProperty("elements");
    expect(result).toHaveProperty("tenGods");
    expect(result).toHaveProperty("analysis");
    expect(result).toHaveProperty("disclaimer");
    expect(result).toHaveProperty("meta");
  });

  test("meta.provider가 rule-engine이다 (AI가 아님을 명시)", () => {
    const result = generateSajuFreeInterpretation(saju);
    expect(result.meta.provider).toBe("rule-engine");
    expect(result.meta.productType).toBe("FREE_BASIC");
  });

  test("elements.dominant/lacking이 엔진 계산값과 정확히 일치한다 (지어내지 않음)", () => {
    const result = generateSajuFreeInterpretation(saju);
    expect(result.elements.dominant).toBe(saju.elements.summary.dominant);
    const expectedLacking = saju.elements.summary.lacking[0] ?? null;
    expect(result.elements.lacking).toBe(expectedLacking);
  });

  test("tenGods.dayMaster가 엔진 계산값과 정확히 일치한다", () => {
    const result = generateSajuFreeInterpretation(saju);
    expect(result.tenGods.dayMaster).toBe(saju.tenGods.dayMaster.stem);
  });

  test("analysis의 8개 필수 필드가 모두 비어있지 않은 문자열이다 (FREE_BASIC 스키마 준수)", () => {
    const result = generateSajuFreeInterpretation(saju);
    const requiredFields = [
      "temperament",
      "career",
      "wealth",
      "love",
      "relationship",
      "yearlyFlow",
      "caution",
      "opportunity",
    ];
    for (const field of requiredFields) {
      const value = result.analysis[field as keyof typeof result.analysis];
      expect(typeof value).toBe("string");
      expect((value as string).length).toBeGreaterThan(0);
    }
  });

  test("동일 입력에 대해 항상 동일한 결과를 반환한다 (결정론적, AI 호출 없음)", () => {
    const a = generateSajuFreeInterpretation(saju);
    const b = generateSajuFreeInterpretation(saju);
    // generatedAt(시각)만 다를 수 있으므로 그 외 필드만 비교한다.
    const { meta: metaA, ...restA } = a;
    const { meta: metaB, ...restB } = b;
    expect(restA).toEqual(restB);
    expect(metaA.provider).toBe(metaB.provider);
  });

  test("일간이 다른 두 사주는 temperament 문구가 다르다", () => {
    const other = calculateSaju(
      { calendarType: "solar", date: "1985-11-02", time: "09:10", gender: "male" },
      2025
    );
    const a = generateSajuFreeInterpretation(saju);
    const b = generateSajuFreeInterpretation(other);
    if (a.tenGods.dayMaster !== b.tenGods.dayMaster) {
      expect(a.analysis.temperament).not.toBe(b.analysis.temperament);
    }
  });

  test("출생시간 미입력(시주 없음) 사주도 에러 없이 해석을 생성한다", () => {
    const noHour = calculateSaju({ calendarType: "solar", date: "1990-05-20", gender: "female" }, 2025);
    expect(() => generateSajuFreeInterpretation(noHour)).not.toThrow();
  });

  test("결과가 기존 AI 경로와 동일한 FREE_BASIC 스키마 검증(validateInterpretationResult)을 통과한다", () => {
    const result = generateSajuFreeInterpretation(saju);
    expect(() => validateInterpretationResult(result, "FREE_BASIC")).not.toThrow();
  });

  test("결과가 기존 AI 경로와 동일한 데이터 일치 검증(checkDataConsistency)을 통과한다", () => {
    const result = generateSajuFreeInterpretation(saju);
    const validated = validateInterpretationResult(result, "FREE_BASIC");
    expect(() => checkDataConsistency(saju, validated)).not.toThrow();
  });

  test("disclaimer가 과학적 확정이 아님을 명시한다", () => {
    const result = generateSajuFreeInterpretation(saju);
    expect(result.disclaimer).toContain("과학적으로 확정하지 않습니다");
  });
});
