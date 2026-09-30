import { AIValidationError } from "saju-engine";
import type { FaceAiResult } from "./types";

/**
 * saju-engine의 validateInterpretationResult.ts와 같은 목적(스키마 준수 확인)을
 * 같은 방식(직접 손으로 짠 타입 가드 + 이슈 배열 수집)으로 수행하지만, 완전히
 * 별도 구현이다 - saju-engine 쪽 검증 함수는 SajuJson의 productTemplates
 * 스키마에 맞춰져 있어 관상 데이터 구조와 맞지 않는다 (지시서 3조: 관상 전용
 * 검증 로직은 별도로 둔다).
 *
 * AIValidationError 클래스 자체는 saju-engine에서 그대로 가져다 쓴다 - 이건
 * "메시지 + 이슈 목록"만 담는 범용 에러 타입이라 도메인 지식이 없다.
 */
function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

export function validateFaceAiResult(value: unknown): FaceAiResult {
  const issues: string[] = [];

  if (typeof value !== "object" || value === null) {
    throw new AIValidationError("AI 응답이 JSON 객체가 아닙니다.", ["최상위 값이 object가 아닙니다."]);
  }
  const obj = value as Record<string, unknown>;

  const self = obj.selfAnalysis;
  if (typeof self !== "object" || self === null) {
    issues.push("selfAnalysis: 객체가 아닙니다.");
  } else {
    const s = self as Record<string, unknown>;
    for (const key of ["faceShape", "forehead", "eyes", "nose", "mouth", "jaw", "overallSummary"]) {
      if (!isNonEmptyString(s[key])) issues.push(`selfAnalysis.${key}: 비어있지 않은 문자열이어야 합니다.`);
    }
  }

  const rel = obj.relationshipInsight;
  if (typeof rel !== "object" || rel === null) {
    issues.push("relationshipInsight: 객체가 아닙니다.");
  } else {
    const r = rel as Record<string, unknown>;
    for (const key of ["traditionalLoveTendency", "idealPartnerTraits", "partnerFeatureNotes", "harmonyPoints"]) {
      if (!isNonEmptyString(r[key])) issues.push(`relationshipInsight.${key}: 비어있지 않은 문자열이어야 합니다.`);
    }
    if (r.userPreferenceNote !== null && !isNonEmptyString(r.userPreferenceNote)) {
      issues.push("relationshipInsight.userPreferenceNote: null이거나 비어있지 않은 문자열이어야 합니다.");
    }
  }

  if (!isNonEmptyString(obj.disclaimer)) {
    issues.push("disclaimer: 비어있지 않은 문자열이어야 합니다.");
  }

  if (issues.length > 0) {
    throw new AIValidationError(`AI 응답이 FaceAiResult 스키마를 만족하지 않습니다 (${issues.length}건).`, issues);
  }

  return obj as unknown as FaceAiResult;
}
