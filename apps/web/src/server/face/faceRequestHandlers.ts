import { isRateLimited } from "../rateLimit";
import { validateFaceAnalyzeInput, bucketizeFeatures } from "./validateFaceFeatures";
import { generateFaceRuleResult } from "./faceRuleEngine";
import { saveFaceResult, getFaceResult } from "./faceResultStore";
import { getFacePaidInterpretation, FaceEntitlementInvalidError, FaceBaseResultExpiredError, FacePaidInterpretationFailedError } from "./facePaidInterpretation";
import type { FaceAnalyzeRequestBody, FaceApiErrorResponse, FaceResultResponse } from "./types";

export interface HandlerResult<T> {
  status: number;
  body: T;
}

export interface FaceAnalyzeAcceptedResponse {
  id: string;
  expiresAt: string;
}

/**
 * requestHandlers.ts(사주)와 동일한 설계 원칙: Next.js Request/Response에
 * 의존하지 않는 순수 함수로 만들어 Jest에서 프레임워크 없이 테스트한다.
 *
 * 지시서 2-A조: "결과가 실제로 분석되지 않았다면 임의의 분석 결과를 만들어
 * 보여주지 않는다" - validateFaceAnalyzeInput이 얼굴 특징 검증에 실패하면
 * (탐지 신뢰도 부족, 범위 이탈 등) 여기서 즉시 400을 반환하고 규칙 엔진을
 * 아예 호출하지 않는다. "그럴듯한 대체 결과"를 만들어내는 코드 경로 자체가 없다.
 */
export function handleFaceAnalyzeRequest(
  rawBody: unknown,
  clientKey: string
): HandlerResult<FaceAnalyzeAcceptedResponse | FaceApiErrorResponse> {
  if (isRateLimited(clientKey)) {
    return { status: 429, body: { error: { code: "RATE_LIMITED", message: "요청이 너무 잦습니다. 잠시 후 다시 시도해주세요." } } };
  }

  if (typeof rawBody !== "object" || rawBody === null) {
    return { status: 400, body: { error: { code: "INVALID_INPUT", message: "요청 본문이 올바르지 않습니다." } } };
  }

  const validation = validateFaceAnalyzeInput(rawBody as FaceAnalyzeRequestBody);
  if (!validation.ok) {
    return {
      status: 400,
      body: {
        error: {
          code: "INVALID_INPUT",
          message: "얼굴 인식 결과를 확인해주세요. 정면 사진으로 다시 시도가 필요할 수 있습니다.",
          issues: validation.issues,
        },
      },
    };
  }

  const { nickname, features, relationshipPreference } = validation.value;
  const buckets = bucketizeFeatures(features);
  const ruleResult = generateFaceRuleResult(buckets);

  const response: FaceResultResponse = { nickname, buckets, result: ruleResult, relationshipPreference };
  const { id, expiresAt } = saveFaceResult(response);

  return { status: 200, body: { id, expiresAt } };
}

export function handleGetFaceResult(id: string): HandlerResult<FaceResultResponse | FaceApiErrorResponse> {
  if (!id || typeof id !== "string") {
    return { status: 400, body: { error: { code: "INVALID_INPUT", message: "잘못된 요청입니다." } } };
  }

  const result = getFaceResult(id);
  if (!result) {
    return {
      status: 404,
      body: { error: { code: "RESULT_NOT_FOUND", message: "결과를 찾을 수 없습니다. 유효 시간이 지났거나 잘못된 접근입니다." } },
    };
  }

  return { status: 200, body: result };
}

export async function handleGetFacePaidResult(entitlementToken: string | null): Promise<HandlerResult<unknown>> {
  try {
    const result = await getFacePaidInterpretation(entitlementToken ?? "");
    return { status: 200, body: result };
  } catch (err) {
    if (err instanceof FaceEntitlementInvalidError) {
      return { status: 403, body: { error: { code: "ENTITLEMENT_INVALID", message: err.message } } };
    }
    if (err instanceof FaceBaseResultExpiredError) {
      return { status: 404, body: { error: { code: "RESULT_NOT_FOUND", message: err.message } } };
    }
    if (err instanceof FacePaidInterpretationFailedError) {
      return { status: 502, body: { error: { code: "AI_INTERPRETATION_FAILED", message: err.message } } };
    }
    // eslint-disable-next-line no-console
    console.error("[phase9] 유료 관상 결과 조회 중 예상하지 못한 오류:", err);
    return { status: 500, body: { error: { code: "INTERNAL_ERROR", message: "일시적인 오류가 발생했습니다. 다시 시도해주세요." } } };
  }
}
