import { PRODUCT_TEMPLATES } from "../../src/prompts/productTemplates";
import { AIValidationError } from "../../src/ai/errors";
import { validateInterpretationResult } from "../../src/ai/validateInterpretationResult";

function validBase() {
  return {
    elements: {
      wood: "목 기운 설명",
      fire: "화 기운 설명",
      earth: "토 기운 설명",
      metal: "금 기운 설명",
      water: "수 기운 설명",
      dominant: "목",
      lacking: null,
    },
    tenGods: {
      dayMaster: "을",
      summary: "십신 요약 설명입니다.",
    },
    disclaimer: "이 해석은 문화·오락 목적의 콘텐츠입니다.",
  };
}

describe("validateInterpretationResult", () => {
  test("FREE_BASIC 정상 응답은 통과한다", () => {
    const value = {
      ...validBase(),
      analysis: {
        temperament: "성향 설명",
        career: "직업 설명",
        wealth: "재물 설명",
        love: "연애 설명",
        relationship: "인간관계 설명",
        yearlyFlow: "올해 흐름",
        caution: "주의점",
        opportunity: "기회",
      },
    };
    const result = validateInterpretationResult(value, "FREE_BASIC");
    expect(result.elements.dominant).toBe("목");
    expect(result.tenGods.dayMaster).toBe("을");
  });

  test("최상위 값이 객체가 아니면 실패한다", () => {
    expect(() => validateInterpretationResult("문자열입니다", "FREE_BASIC")).toThrow(AIValidationError);
    expect(() => validateInterpretationResult(null, "FREE_BASIC")).toThrow(AIValidationError);
  });

  test("필수 analysis 필드가 누락되면 실패하고 이슈 목록을 담는다", () => {
    const value = {
      ...validBase(),
      analysis: {
        temperament: "성향 설명",
        // career 등 나머지 필드 누락
      },
    };
    try {
      validateInterpretationResult(value, "FREE_BASIC");
      fail("에러가 던져져야 합니다");
    } catch (err) {
      expect(err).toBeInstanceOf(AIValidationError);
      const validationErr = err as AIValidationError;
      expect(validationErr.issues.length).toBeGreaterThan(0);
      expect(validationErr.issues.some((i) => i.includes("career"))).toBe(true);
    }
  });

  test("elements 필드 타입이 틀리면 실패한다", () => {
    const value = {
      ...validBase(),
      elements: { ...validBase().elements, dominant: 123 },
      analysis: {
        temperament: "x",
        career: "x",
        wealth: "x",
        love: "x",
        relationship: "x",
        yearlyFlow: "x",
        caution: "x",
        opportunity: "x",
      },
    };
    expect(() => validateInterpretationResult(value, "FREE_BASIC")).toThrow(AIValidationError);
  });

  test("disclaimer가 없으면 실패한다", () => {
    const base = validBase();
    const value = {
      elements: base.elements,
      tenGods: base.tenGods,
      analysis: {
        temperament: "x",
        career: "x",
        wealth: "x",
        love: "x",
        relationship: "x",
        yearlyFlow: "x",
        caution: "x",
        opportunity: "x",
      },
    };
    expect(() => validateInterpretationResult(value, "FREE_BASIC")).toThrow(AIValidationError);
  });

  test("actionGuide는 문자열 또는 문자열 배열 둘 다 허용한다 (LOVE_3900)", () => {
    const asString = {
      ...validBase(),
      analysis: {
        loveStyle: "x",
        idealPartnerType: "x",
        currentFlow: "x",
        challenges: "x",
        actionGuide: "한 문장짜리 조언",
      },
    };
    const asArray = {
      ...validBase(),
      analysis: {
        loveStyle: "x",
        idealPartnerType: "x",
        currentFlow: "x",
        challenges: "x",
        actionGuide: ["조언1", "조언2", "조언3"],
      },
    };
    expect(() => validateInterpretationResult(asString, "LOVE_3900")).not.toThrow();
    expect(() => validateInterpretationResult(asArray, "LOVE_3900")).not.toThrow();
  });

  test("YEARLY_3900은 quarterlyFlow가 q1~q4를 모두 갖춰야 한다", () => {
    const incomplete = {
      ...validBase(),
      analysis: {
        yearOverview: "x",
        quarterlyFlow: { q1: "1분기", q2: "2분기" },
        keyMonths: "x",
        actionGuide: "x",
      },
    };
    expect(() => validateInterpretationResult(incomplete, "YEARLY_3900")).toThrow(AIValidationError);

    const complete = {
      ...validBase(),
      analysis: {
        yearOverview: "x",
        quarterlyFlow: { q1: "1분기", q2: "2분기", q3: "3분기", q4: "4분기" },
        keyMonths: "x",
        actionGuide: "x",
      },
    };
    expect(() => validateInterpretationResult(complete, "YEARLY_3900")).not.toThrow();
  });

  test("PREMIUM_9900은 모든 상세 카테고리를 요구한다", () => {
    const value = {
      ...validBase(),
      analysis: {
        sajuOverview: "x",
        temperament: "x",
        wealth: "x",
        career: "x",
        love: "x",
        relationship: "x",
        yearlyFlow: "x",
        monthlyFlow: "x",
        importantPeriods: "x",
        actionGuide: ["1", "2", "3"],
      },
    };
    expect(() => validateInterpretationResult(value, "PREMIUM_9900")).not.toThrow();
  });

  test("알 수 없는 productType이면 실패한다", () => {
    const value = { ...validBase(), analysis: {} };
    expect(() => validateInterpretationResult(value, "UNKNOWN" as never)).toThrow(AIValidationError);
  });

  test("모든 ProductType이 PRODUCT_TEMPLATES에도 정의되어 있다 (스키마-템플릿 정합성)", () => {
    const productTypes = Object.keys(PRODUCT_TEMPLATES);
    expect(productTypes).toEqual(
      expect.arrayContaining([
        "FREE_BASIC",
        "LOVE_3900",
        "MONEY_3900",
        "CAREER_3900",
        "YEARLY_3900",
        "PREMIUM_9900",
      ])
    );
  });
});
