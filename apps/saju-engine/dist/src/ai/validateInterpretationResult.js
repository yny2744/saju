"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateInterpretationResult = validateInterpretationResult;
const errors_1 = require("./errors");
const PRODUCT_ANALYSIS_SCHEMA = {
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
function isNonEmptyString(value) {
    return typeof value === "string" && value.trim().length > 0;
}
function isNonEmptyStringArray(value) {
    return Array.isArray(value) && value.length > 0 && value.every((v) => isNonEmptyString(v));
}
function validateElements(value, issues) {
    if (typeof value !== "object" || value === null) {
        issues.push("elements: 객체가 아닙니다.");
        return false;
    }
    const el = value;
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
function validateTenGods(value, issues) {
    if (typeof value !== "object" || value === null) {
        issues.push("tenGods: 객체가 아닙니다.");
        return false;
    }
    const tg = value;
    if (!isNonEmptyString(tg.dayMaster)) {
        issues.push("tenGods.dayMaster: 비어있지 않은 문자열이어야 합니다.");
    }
    if (!isNonEmptyString(tg.summary)) {
        issues.push("tenGods.summary: 비어있지 않은 문자열이어야 합니다.");
    }
    return issues.length === 0;
}
function validateQuarterlyFlow(value, issues) {
    if (typeof value !== "object" || value === null) {
        issues.push("analysis.quarterlyFlow: 객체가 아닙니다.");
        return;
    }
    const qf = value;
    for (const quarter of ["q1", "q2", "q3", "q4"]) {
        if (!isNonEmptyString(qf[quarter])) {
            issues.push(`analysis.quarterlyFlow.${quarter}: 비어있지 않은 문자열이어야 합니다.`);
        }
    }
}
function validateAnalysis(value, productType, issues) {
    if (typeof value !== "object" || value === null) {
        issues.push("analysis: 객체가 아닙니다.");
        return false;
    }
    const analysis = value;
    const schema = PRODUCT_ANALYSIS_SCHEMA[productType];
    if (!schema) {
        issues.push(`알 수 없는 productType입니다: ${productType}`);
        return false;
    }
    for (const field of schema) {
        const fieldValue = analysis[field.key];
        if (field.type === "string" && !isNonEmptyString(fieldValue)) {
            issues.push(`analysis.${field.key}: 비어있지 않은 문자열이어야 합니다.`);
        }
        else if (field.type === "stringOrArray" && !(isNonEmptyString(fieldValue) || isNonEmptyStringArray(fieldValue))) {
            issues.push(`analysis.${field.key}: 비어있지 않은 문자열이거나 문자열 배열이어야 합니다.`);
        }
        else if (field.type === "quarterlyFlow") {
            validateQuarterlyFlow(fieldValue, issues);
        }
    }
    return issues.length === 0;
}
/**
 * AI 응답(JSON.parse 결과)이 InterpretationResult 본문 스키마를 만족하는지 검증한다.
 * meta는 AIInterpretationEngine이 별도로 붙이므로 여기서는 검증하지 않는다.
 *
 * 성공 시 타입이 좁혀진 값을 반환하고, 실패 시 AIValidationError를 던진다
 * (명세서 11조: "InterpretationResult 구조 준수 / 필수 항목 누락 여부 /
 * 문자열·배열 타입 검증"을 하나의 함수로 처리).
 */
function validateInterpretationResult(value, productType) {
    const issues = [];
    if (typeof value !== "object" || value === null) {
        throw new errors_1.AIValidationError("AI 응답이 JSON 객체가 아닙니다.", [
            "최상위 값이 object 타입이 아닙니다.",
        ]);
    }
    const obj = value;
    validateElements(obj.elements, issues);
    validateTenGods(obj.tenGods, issues);
    validateAnalysis(obj.analysis, productType, issues);
    if (!isNonEmptyString(obj.disclaimer)) {
        issues.push("disclaimer: 비어있지 않은 문자열이어야 합니다.");
    }
    if (issues.length > 0) {
        throw new errors_1.AIValidationError(`AI 응답이 InterpretationResult 스키마를 만족하지 않습니다 (${issues.length}건).`, issues);
    }
    return {
        elements: obj.elements,
        tenGods: obj.tenGods,
        analysis: obj.analysis,
        disclaimer: obj.disclaimer,
    };
}
