import { AIInterpretationFailedError } from "saju-engine";
import { verifyEntitlement } from "../entitlement";
import { getFaceResult } from "./faceResultStore";
import { getFaceCompletionProvider } from "./faceAiProvider";
import { interpretFace } from "./faceAiInterpreter";
import type { FaceAiResult } from "./types";

/**
 * Phase 5의 paidInterpretation.ts(사주 유료 해석)와 같은 구조를 관상 도메인에
 * 맞게 독립적으로 구현한다. entitlement.ts/verifyEntitlement는 결제 도메인에서
 * 이미 완전히 범용(제네릭 payload)으로 만들어져 있어 그대로 재사용한다
 * (수정 없음 - Phase 9 지시서 3조 "기존 결제 검증... 유지").
 */
export class FaceEntitlementInvalidError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FaceEntitlementInvalidError";
  }
}
export class FaceBaseResultExpiredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FaceBaseResultExpiredError";
  }
}
export class FacePaidInterpretationFailedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FacePaidInterpretationFailedError";
  }
}

export interface FacePaidResultResponse {
  nickname: string;
  productType: "FACE_PREMIUM";
  result: FaceAiResult;
}

export async function getFacePaidInterpretation(entitlementToken: unknown): Promise<FacePaidResultResponse> {
  if (typeof entitlementToken !== "string") {
    throw new FaceEntitlementInvalidError("잘못된 접근입니다.");
  }

  const entitlement = verifyEntitlement(entitlementToken);
  if (!entitlement) {
    throw new FaceEntitlementInvalidError("결제 정보를 확인할 수 없습니다. (만료되었거나 잘못된 접근입니다)");
  }
  if (entitlement.productType !== "FACE_PREMIUM") {
    throw new FaceEntitlementInvalidError("이 상품에 대한 결과 조회는 지원하지 않습니다.");
  }

  const baseResult = getFaceResult(entitlement.resultId);
  if (!baseResult) {
    throw new FaceBaseResultExpiredError(
      "기반이 되는 무료 관상 결과를 찾을 수 없습니다. (유효 시간이 지났습니다) 관상 분석을 다시 진행한 뒤 결제해주세요."
    );
  }

  try {
    const provider = getFaceCompletionProvider();
    const result = await interpretFace(provider, baseResult.buckets, baseResult.relationshipPreference);
    return { nickname: baseResult.nickname, productType: "FACE_PREMIUM", result };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[phase9] 유료 관상 AI 해석 실패:", err);
    if (err instanceof AIInterpretationFailedError) {
      throw new FacePaidInterpretationFailedError("AI 해석 생성에 실패했습니다. 잠시 후 다시 시도해주세요.");
    }
    throw new FacePaidInterpretationFailedError("AI 해석 처리 중 알 수 없는 오류가 발생했습니다.");
  }
}
