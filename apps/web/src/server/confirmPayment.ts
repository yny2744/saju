import { getOrderByToken } from "./orders";
import { getProduct } from "./products";
import { getPaymentProvider } from "./paymentProvider";
import { issueEntitlement } from "./entitlement";
import type { CommerceProductType } from "./products";

/**
 * 지시서 8조/9조 핵심 흐름:
 *   결제 요청 -> PG 결제 -> 서버 결제 승인/검증 -> 서버에서 금액·상품·주문ID
 *   검증 -> 결제 완료 -> 상품 권한 부여
 *
 * ⚠️ OrderStatus(READY/PENDING/PAID/FAILED/CANCELLED)에 대한 설계 노트:
 * 이 주문은 Phase 4 resultStore.ts와 같은 무상태(stateless) 토큰으로 존재하기
 * 때문에, "같은 orderId 레코드의 status 컬럼을 UPDATE"하는 식의 상태 전이는
 * 할 수 없다(그럴 수 있는 공유 저장소 자체가 없다 - 지시서 20조가 Postgres
 * 도입은 아직 하지 말라고 명시). 대신:
 *   - READY: 주문 생성 시 발급된 orderToken 자체가 "아직 결제되지 않은 상태"를 뜻한다.
 *   - PAID: 결제 승인에 성공하면 orderToken과는 별개의 entitlement 토큰을 새로
 *     발급한다 - "이 주문이 결제 완료되어 상품 권한이 있다"는 사실 자체가 이
 *     entitlement 토큰의 존재로 증명된다.
 *   - FAILED/CANCELLED: 별도로 저장하지 않는다. 승인이 실패하면 이 함수가
 *     예외를 던지고 끝난다 - entitlement 토큰이 발급되지 않았다는 것 자체가
 *     "이 시도는 실패했다"는 의미다. 사용자는 같은 orderToken이 만료되지
 *     않았다면(30분 이내) 다시 시도하거나, 처음부터 새 주문을 생성해 재시도할
 *     수 있다.
 * 진짜 서버 측 주문 이력(예: "이 주문은 몇 번 실패했다")까지 영속적으로 남기려면
 * 결국 Postgres 같은 공유 저장소가 필요하다 - 이는 이번 단계 범위 밖으로 명시적으로
 * 남겨둔다("남아있는 문제" 참고).
 */

export class OrderInvalidError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OrderInvalidError";
  }
}
export class AmountMismatchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AmountMismatchError";
  }
}
export class PaymentDeclinedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PaymentDeclinedError";
  }
}
export class AlreadyProcessedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AlreadyProcessedError";
  }
}

/**
 * ⚠️ 추가 안전장치 (지시서 10조 "중복 승인 방지" 보완):
 * MockPaymentProvider/TossPaymentProvider는 "동일 paymentKey" 재사용만 막아준다.
 * 하지만 orderToken은 상태가 바뀌지 않는(READY 그대로인) 무상태 토큰이라서,
 * 사용자가 같은 주문에 대해 서로 "다른" 결제(다른 paymentKey, 예: 실수로 결제창을
 * 두 번 열어 카드로 두 번 결제)를 두 번 완료하면 이론상 entitlement가 두 번
 * 발급될 수 있다 - 상품이 중복 지급되는 피해는 없지만(같은 BASIC/PREMIUM
 * 접근권을 두 번 주는 것뿐), 사용자가 실제로 돈을 두 번 냈다면 그 자체가 문제다.
 *
 * 이를 막기 위해 "이미 entitlement가 발급된 orderId"를 프로세스 메모리에
 * 최소한으로 기록해서, 같은 orderId로 또 confirm이 들어오면(설령 다른
 * paymentKey라도) 거부한다. rateLimit.ts와 동일한 원칙으로, 이것은
 * "완벽한 방어"가 아니라 "단일 프로세스 안에서의 최소 방어"다 - 여러 서버
 * 인스턴스에 걸친 완전한 방어는 실제 주문 테이블(Postgres)의 유니크 제약이나
 * PG 쪽의 멱등키 처리가 필요하며, 이는 "남아있는 문제"에 명시했다.
 */
const consumedOrderIds = new Set<string>();

export function resetConsumedOrdersForTesting(): void {
  consumedOrderIds.clear();
}

export interface ConfirmPaymentInput {
  orderToken: unknown;
  paymentKey: unknown;
  orderId: unknown;
  amount: unknown;
}

export interface ConfirmPaymentSuccess {
  entitlementToken: string;
  productType: CommerceProductType;
  orderId: string;
}

export async function confirmPayment(input: ConfirmPaymentInput): Promise<ConfirmPaymentSuccess> {
  if (
    typeof input.orderToken !== "string" ||
    typeof input.paymentKey !== "string" ||
    typeof input.orderId !== "string" ||
    typeof input.amount !== "number"
  ) {
    throw new OrderInvalidError("잘못된 결제 확인 요청입니다.");
  }

  const order = getOrderByToken(input.orderToken);
  if (!order) {
    throw new OrderInvalidError("주문 정보를 확인할 수 없습니다. (만료되었거나 잘못된 주문입니다)");
  }
  if (order.status !== "READY") {
    throw new OrderInvalidError("이미 처리되었거나 취소된 주문입니다.");
  }
  // 지시서 9조: orderId가 다르면(다른 주문의 토큰을 재사용하려는 시도) 즉시 거부.
  if (order.orderId !== input.orderId) {
    throw new OrderInvalidError("주문 ID가 일치하지 않습니다.");
  }
  // 위 설명대로: 같은 orderId에 대해 이미 entitlement가 발급된 적 있으면
  // (다른 paymentKey로 또 결제를 시도한 경우 포함) 여기서 막는다.
  if (consumedOrderIds.has(order.orderId)) {
    throw new AlreadyProcessedError("이미 결제가 완료된 주문입니다.");
  }

  // 지시서 4조/6조: 서버 카탈로그를 다시 한번 대조한다 (토큰 위조가 아니어도,
  // 배포 사이에 카탈로그 가격이 바뀌었을 가능성까지 방어).
  const product = getProduct(order.productType);
  if (!product || product.priceKRW !== order.amountKRW) {
    throw new OrderInvalidError("상품 정보를 확인할 수 없습니다.");
  }
  // 지시서 6조: 클라이언트/PG 리다이렉트로 전달된 금액이 주문 생성 시 확정한
  // 서버 금액과 다르면 절대 진행하지 않는다.
  if (input.amount !== order.amountKRW) {
    throw new AmountMismatchError("결제 금액이 주문 금액과 일치하지 않습니다.");
  }

  const provider = getPaymentProvider();
  const result = await provider.confirmPayment({
    paymentKey: input.paymentKey,
    orderId: input.orderId,
    amount: input.amount,
  });

  if (!result.approved) {
    if (result.alreadyProcessed) {
      throw new AlreadyProcessedError(result.failureReason ?? "이미 처리된 결제입니다.");
    }
    throw new PaymentDeclinedError(result.failureReason ?? "결제 승인에 실패했습니다.");
  }

  // 지시서 9조: PG가 실제로 승인한 금액이 우리 쪽 확정 금액과 다르면 완료 처리하지 않는다.
  if (result.approvedAmount !== undefined && result.approvedAmount !== order.amountKRW) {
    throw new AmountMismatchError("결제 승인 금액이 주문 금액과 일치하지 않습니다.");
  }

  const entitlementToken = issueEntitlement({
    resultId: order.resultId,
    productType: order.productType,
    orderId: order.orderId,
    paidAt: new Date().toISOString(),
  });

  consumedOrderIds.add(order.orderId);

  return { entitlementToken, productType: order.productType, orderId: order.orderId };
}
