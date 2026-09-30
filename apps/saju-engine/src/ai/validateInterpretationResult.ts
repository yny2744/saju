import type { ProductType } from "../prompts/productTemplates";
import { AIValidationError } from "./errors";
import type { ElementsInterpretation, InterpretationAnalysis, TenGodsInterpretation } from "./types";

/**
 * 상품 유형별 analysis 필수 필드 계약.
 *
 * src/prompts/productTemplates.ts에 정의된 상품별 instruction과 1:1로 대응시킨다.
 * 두 파일 중 하나만 수정하고 다른 하나를 잊어버리는 실수를 방지하기 위해,
 * 이 계약이 어긋나면 tests/ai/validateInterpretationResult.test.ts가 즉시 실패하도록
 * 테스트에서 두 파일을 모두 참조한다.
 *
 * field type:
 *  - "string": 비어있지 않은 문자열
 *  - "stringOrArray": 비어있지 않은 문자열이거나, 비어있지 않은 문자열 배열
 *    (프롬프트 지시문이 "3가지" 처럼 개수를 지정한 항목은 LLM이 배열/문자열
 *     어느 쪽으로 응답해도 받아들인다 - 형식보다 내용 존재 여부가 중요하다)
 */
type FieldSpec = { key: string; type: "string" | "stringOrArray" | "quarterlyFlow" };

const PRODUCT_ANALYSIS_SCHEMA: Record<ProductType, FieldSpec[]> = {
  FREE_BASIC: [
    { key: "temperament", type: "string" },
    { key: "career", type: "string" },
    { key: "wealth", type: "string" },
    { key: "love", type: "string" },
    { key: "relationship", type: "string" },
    { key: "yearlyFlow", type: "string" },
    { key: "caution", type: "string" },
    { key: "opportunity", type: "string" },
  ],
  LOVE_3900: [
    { key: "loveStyle", type: "string" },
    { key: "idealPartnerType", type: "string" },
    { key: "currentFlow", type: "string" },
    { key: "challenges", type: "string" },
    { key: "actionGuide", type: "stringOrArray" },
  ],
  MONEY_3900: [
    { key: "wealthStructure", type: "string" },
    { key: "incomeStyle", type: "string" },
    { key: "currentFlow", type: "string" },
    { key: "riskAreas", type: "string" },
    { key: "actionGuide", type: "stringOrArray" },
  ],
  CAREER_3900: [
    { key: "careerAptitude", type: "string" },
    { key: "suitableFields", type: "string" },
    { key: "currentFlow", type: "string" },
    { key: "challenges", type: "string" },
    { key: "actionGuide", type: "stringOrArray" },
  ],
  YEARLY_3900: [
    { key: "yearOverview", type: "string" },
    { key: "quarterlyFlow", type: "quarterlyFlow" },
    { key: "keyMonths", type: "string" },
    { key: "actionGuide", type: "stringOrArray" },
  ],
  PREMIUM_9900: [
    { key: "sajuOverview", type: "string" },
    { key: "temperament", type: "string" },
    { key: "wealth", type: "string" },
    { key: "career", type: "string" },
    { key: "love", type: "string" },
    { key: "relationship", type: "string" },
    { key: "yearlyFlow", type: "string" },
    { key: "monthlyFlow", type: "string" },
    { key: "importantPeriods", type: "string" },
    { key: "actionGuide", type: "stringOrArray" },
  ],
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isNonEmptyStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.length > 0 && value.every((v) => isNonEmptyString(v));
}

function validateElements(value: unknown, issues: string[]): value is ElementsInterpretation {
  if (typeof value !== "object" || value === null) {
    issues.push("elements: 객체가 아닙니다.");
    return false;
  }
  const el = value as Record<string, unknown>;
  for (const key of ["wood", "fire", "earth", "metal", "water", "dominant"]) {
    if (!isNonEmptyString(el[key])) {
      issues.push(`elements.${key}: 비어있지 않은 문자열이어야 합니다.`);
    }
  }
  if (el.lacking !== null && !isNonEmptyString(el.lacking)) {
    issues.push("elements.lacking: null이거나 비어있지 않은 문자열이어야 합니다.");
  }
  return issues.length === 0;
}

function validateTenGods(value: unknown, issues: string[]): value is TenGodsInterpretation {
  if (typeof value !== "object" || value === null) {
    issues.push("tenGods: 객체가 아닙니다.");
    return false;
  }
  const tg = value as Record<string, unknown>;
  if (!isNonEmptyString(tg.dayMaster)) {
    issues.push("tenGods.dayMaster: 비어있지 않은 문자열이어야 합니다.");
  }
  if (!isNonEmptyString(tg.summary)) {
    issues.push("tenGods.summary: 비어있지 않은 문자열이어야 합니다.");
  }
  return issues.length === 0;
}

function validateQuarterlyFlow(value: unknown, issues: string[]): void {
  if (typeof value !== "object" || value === null) {
    issues.push("analysis.quarterlyFlow: 객체가 아닙니다.");
    return;
  }
  const qf = value as Record<string, unknown>;
  for (const quarter of ["q1", "q2", "q3", "q4"]) {
    if (!isNonEmptyString(qf[quarter])) {
      issues.push(`analysis.quarterlyFlow.${quarter}: 비어있지 않은 문자열이어야 합니다.`);
    }
  }
}

function validateAnalysis(
  value: unknown,
  productType: ProductType,
  issues: string[]
): value is InterpretationAnalysis {
  if (typeof value !== "object" || value === null) {
    issues.push("analysis: 객체가 아닙니다.");
    return false;
  }
  const analysis = value as Record<string, unknown>;
  const schema = PRODUCT_ANALYSIS_SCHEMA[productType];
  if (!schema) {
    issues.push(`알 수 없는 productType입니다: ${productType}`);
    return false;
  }

  for (const field of schema) {
    const fieldValue = analysis[field.key];
    if (field.type === "string" && !isNonEmptyString(fieldValue)) {
      issues.push(`analysis.${field.key}: 비어있지 않은 문자열이어야 합니다.`);
    } else if (field.type === "stringOrArray" && !(isNonEmptyString(fieldValue) || isNonEmptyStringArray(fieldValue))) {
      issues.push(`analysis.${field.key}: 비어있지 않은 문자열이거나 문자열 배열이어야 합니다.`);
    } else if (field.type === "quarterlyFlow") {
      validateQuarterlyFlow(fieldValue, issues);
    }
  }

  return issues.length === 0;
}

export interface ValidatedInterpretationBody {
  elements: ElementsInterpretation;
  tenGods: TenGodsInterpretation;
  analysis: InterpretationAnalysis;
  disclaimer: string;
}

/**
 * AI 응답(JSON.parse 결과)이 InterpretationResult 본문 스키마를 만족하는지 검증한다.
 * meta는 AIInterpretationEngine이 별도로 붙이므로 여기서는 검증하지 않는다.
 *
 * 성공 시 타입이 좁혀진 값을 반환하고, 실패 시 AIValidationError를 던진다
 * (명세서 11조: "InterpretationResult 구조 준수 / 필수 항목 누락 여부 /
 * 문자열·배열 타입 검증"을 하나의 함수로 처리).
 */
export function validateInterpretationResult(
  value: unknown,
  productType: ProductType
): ValidatedInterpretationBody {
  const issues: string[] = [];

  if (typeof value !== "object" || value === null) {
    throw new AIValidationError("AI 응답이 JSON 객체가 아닙니다.", [
      "최상위 값이 object 타입이 아닙니다.",
    ]);
  }

  const obj = value as Record<string, unknown>;

  validateElements(obj.elements, issues);
  validateTenGods(obj.tenGods, issues);
  validateAnalysis(obj.analysis, productType, issues);

  if (!isNonEmptyString(obj.disclaimer)) {
    issues.push("disclaimer: 비어있지 않은 문자열이어야 합니다.");
  }

  if (issues.length > 0) {
    throw new AIValidationError(
      `AI 응답이 InterpretationResult 스키마를 만족하지 않습니다 (${issues.length}건).`,
      issues
    );
  }

  return {
    elements: obj.elements as ElementsInterpretation,
    tenGods: obj.tenGods as TenGodsInterpretation,
    analysis: obj.analysis as InterpretationAnalysis,
    disclaimer: obj.disclaimer as string,
  };
}
