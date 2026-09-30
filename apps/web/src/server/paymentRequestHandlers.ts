import { createOrder } from "./orders";
import {
  confirmPayment,
  OrderInvalidError,
  AmountMismatchError,
  PaymentDeclinedError,
  AlreadyProcessedError,
} from "./confirmPayment";
import { getPaidInterpretation, EntitlementInvalidError, BaseResultExpiredError, PaidInterpretationFailedError } from "./paidInterpretation";
import { isRateLimited } from "./rateLimit";
import { isCommerceProductType } from "./products";
import type { ApiErrorResponse } from "./types";

export interface HandlerResult<T> {
  status: number;
  body: T;
}

export interface CreateOrderResponse {
  orderId: string;
  orderToken: string;
  amountKRW: number;
  productName: string;
}

export async function handleCreateOrder(
  rawBody: unknown,
  clientKey: string
): Promise<HandlerResult<CreateOrderResponse | ApiErrorResponse>> {
  if (isRateLimited(clientKey)) {
    return { status: 429, body: { error: { code: "RATE_LIMITED", message: "요청이 너무 잦습니다. 잠시 후 다시 시도해주세요." } } };
  }
  if (typeof rawBody !== "object" || rawBody === null) {
    return { status: 400, body: { error: { code: "INVALID_INPUT", message: "요청 본문이 올바르지 않습니다." } } };
  }

  const body = rawBody as { productType?: unknown; resultId?: unknown };

  if (!isCommerceProductType(body.productType) || body.productType === "FREE_BASIC") {
    return {
      status: 400,
      body: { error: { code: "INVALID_INPUT", message: "구매할 수 있는 상품(BASIC 또는 PREMIUM)을 선택해주세요." } },
    };
  }
  if (typeof body.resultId !== "string" || body.resultId.length === 0) {
    return { status: 400, body: { error: { code: "INVALID_INPUT", message: "기반이 되는 분석 결과 정보가 없습니다." } } };
  }

  const result = createOrder({ productType: body.productType, resultId: body.resultId });

  if (!result.ok) {
    if (result.reason === "RESULT_NOT_FOUND") {
      return {
        status: 404,
        body: {
          error: {
            code: "RESULT_NOT_FOUND",
            message: "기반이 되는 무료 분석 결과를 찾을 수 없습니다. 사주를 다시 분석한 뒤 시도해주세요.",
          },
        },
      };
    }
    return { status: 400, body: { error: { code: "INVALID_INPUT", message: "요청하신 상품을 처리할 수 없습니다." } } };
  }

  return {
    status: 200,
    body: { orderId: result.orderId, orderToken: result.orderToken, amountKRW: result.amountKRW, productName: result.productName },
  };
}

export interface ConfirmPaymentResponse {
  entitlementToken: string;
  productType: string;
  orderId: string;
}

export async function handleConfirmPayment(
  rawBody: unknown,
  clientKey: string
): Promise<HandlerResult<ConfirmPaymentResponse | ApiErrorResponse>> {
  if (isRateLimited(clientKey)) {
    return { status: 429, body: { error: { code: "RATE_LIMITED", message: "요청이 너무 잦습니다. 잠시 후 다시 시도해주세요." } } };
  }
  if (typeof rawBody !== "object" || rawBody === null) {
    return { status: 400, body: { error: { code: "INVALID_INPUT", message: "요청 본문이 올바르지 않습니다." } } };
  }

  const body = rawBody as { orderToken: unknown; paymentKey: unknown; orderId: unknown; amount: unknown };

  try {
    const result = await confirmPayment(body);
    return { status: 200, body: result };
  } catch (err) {
    // 지시서 10조/14조: 서버 내부 오류나 PG 원문 오류를 그대로 노출하지 않고,
    // 사유별로 안전한 코드/메시지만 반환한다.
    if (err instanceof OrderInvalidError) {
      return { status: 400, body: { error: { code: "INVALID_INPUT", message: err.message } } };
    }
    if (err instanceof AmountMismatchError) {
      return { status: 400, body: { error: { code: "AMOUNT_MISMATCH", message: err.message } } };
    }
    if (err instanceof AlreadyProcessedError) {
      return { status: 409, body: { error: { code: "ALREADY_PROCESSED", message: err.message } } };
    }
    if (err instanceof PaymentDeclinedError) {
      return { status: 402, body: { error: { code: "PAYMENT_DECLINED", message: err.message } } };
    }
    // eslint-disable-next-line no-console
    console.error("[phase5] 결제 승인 처리 중 예상하지 못한 오류:", err);
    return { status: 500, body: { error: { code: "INTERNAL_ERROR", message: "일시적인 오류가 발생했습니다. 다시 시도해주세요." } } };
  }
}

export async function handleGetPaidResult(entitlementToken: string | null): Promise<HandlerResult<unknown>> {
  try {
    const result = await getPaidInterpretation(entitlementToken ?? "");
    return { status: 200, body: result };
  } catch (err) {
    if (err instanceof EntitlementInvalidError) {
      return { status: 403, body: { error: { code: "ENTITLEMENT_INVALID", message: err.message } } };
    }
    if (err instanceof BaseResultExpiredError) {
      return { status: 404, body: { error: { code: "RESULT_NOT_FOUND", message: err.message } } };
    }
    if (err instanceof PaidInterpretationFailedError) {
      return { status: 502, body: { error: { code: "AI_INTERPRETATION_FAILED", message: err.message } } };
    }
    // eslint-disable-next-line no-console
    console.error("[phase5] 유료 결과 조회 중 예상하지 못한 오류:", err);
    return { status: 500, body: { error: { code: "INTERNAL_ERROR", message: "일시적인 오류가 발생했습니다. 다시 시도해주세요." } } };
  }
}
