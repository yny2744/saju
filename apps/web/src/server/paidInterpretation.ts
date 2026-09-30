import type { InterpretationResult } from "saju-engine";
import { AIInterpretationFailedError } from "saju-engine";
import { verifyEntitlement } from "./entitlement";
import { getResult } from "./resultStore";
import { getProduct } from "./products";
import { getInterpretationEngine } from "./aiEngineProvider";

/**
 * 지시서 12조: "결제 시스템에서 사주 원국 데이터를 다시 계산하지 않는다.
 * 기존 SajuJson을 그대로 사용한다." - 그래서 여기서는 calculateSaju()를
 * 절대 다시 호출하지 않고, entitlement가 가리키는 resultId로 Phase 4
 * resultStore에서 이미 계산되어 있던 SajuJson을 그대로 꺼내 쓴다.
 */
export class EntitlementInvalidError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EntitlementInvalidError";
  }
}
export class BaseResultExpiredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BaseResultExpiredError";
  }
}
export class PaidInterpretationFailedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PaidInterpretationFailedError";
  }
}

export interface PaidInterpretationResponse {
  nickname: string;
  productType: "BASIC" | "PREMIUM";
  /** 엔진 productType별 해석 결과. BASIC은 4개, PREMIUM은 1개. */
  results: Record<string, InterpretationResult>;
}

export async function getPaidInterpretation(entitlementToken: unknown): Promise<PaidInterpretationResponse> {
  if (typeof entitlementToken !== "string") {
    throw new EntitlementInvalidError("잘못된 접근입니다.");
  }

  const entitlement = verifyEntitlement(entitlementToken);
  if (!entitlement) {
    throw new EntitlementInvalidError("결제 정보를 확인할 수 없습니다. (만료되었거나 잘못된 접근입니다)");
  }

  // 지시서 13조: PREMIUM 권한 토큰이 아닌데 PREMIUM을 요청하는 식의 시도는
  //애초에 발급된 entitlement.productType 자체가 결제한 상품으로 고정되어 있어
  // 불가능하다 (entitlement는 상품별로 별도 발급되고, 토큰 위조는 서명 검증에서 걸러진다).
  if (entitlement.productType !== "BASIC" && entitlement.productType !== "PREMIUM") {
    throw new EntitlementInvalidError("이 상품에 대한 결과 조회는 지원하지 않습니다.");
  }

  const product = getProduct(entitlement.productType);
  if (!product) {
    throw new EntitlementInvalidError("상품 정보를 확인할 수 없습니다.");
  }

  const baseResult = getResult(entitlement.resultId);
  if (!baseResult) {
    throw new BaseResultExpiredError(
      "기반이 되는 무료 분석 결과를 찾을 수 없습니다. (유효 시간이 지났습니다) 사주를 다시 분석한 뒤 결제해주세요."
    );
  }

  const engine = getInterpretationEngine();
  const results: Record<string, InterpretationResult> = {};

  try {
    // 여러 엔진 productType을 순차 호출한다 (동시성보다 각 호출의 재시도/에러
    // 로깅을 단순하게 유지하는 쪽을 택함 - Phase 5 범위에서 성능 최적화는 우선순위가 아니다).
    for (const engineProductType of product.engineProductTypes) {
      // eslint-disable-next-line no-await-in-loop
      results[engineProductType] = await engine.interpret(baseResult.saju, { productType: engineProductType });
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[phase5] 유료 상품 AI 해석 실패:", err);
    if (err instanceof AIInterpretationFailedError) {
      throw new PaidInterpretationFailedError("AI 해석 생성에 실패했습니다. 잠시 후 다시 시도해주세요.");
    }
    throw new PaidInterpretationFailedError("AI 해석 처리 중 알 수 없는 오류가 발생했습니다.");
  }

  return {
    nickname: baseResult.nickname,
    productType: entitlement.productType,
    results,
  };
}
