import { randomUUID } from "crypto";
import { getProduct, isPaidProductType, isFaceProductType, type CommerceProductType } from "./products";
import { getResult } from "./resultStore";
import { getFaceResult } from "./face/faceResultStore";
import { encodePaymentToken, decodePaymentToken } from "./paymentTokenCodec";

/**
 * 지시서 10조: READY/PENDING/PAID/FAILED/CANCELLED 상태 관리.
 * 지시서 20조: "영속성이 필요한 부분을 단순 서버 메모리 Map에 의존하는 구조로
 * 만들지 않는다" - 그래서 주문의 상태는 Phase 4의 resultStore.ts와 동일한 원리로
 * 서버가 서명/암호화한 토큰(OrderToken) 안에 담아 클라이언트가 들고 있게 한다.
 * 어떤 서버 인스턴스가 나중에 이 토큰을 받아도(서버리스 다중 인스턴스 포함)
 * PAYMENT_TOKEN_SECRET만 같으면 검증/복호화할 수 있다.
 *
 * OrderRepository 인터페이스로 분리해뒀기 때문에, 향후 PostgreSQL 기반 구현체로
 * 교체할 때는 create/getByOrderId를 구현하는 새 클래스만 만들면 된다 - 호출부
 * (paymentRequestHandlers.ts)는 이 인터페이스에만 의존한다.
 */
export type OrderStatus = "READY" | "PENDING" | "PAID" | "FAILED" | "CANCELLED";

export interface OrderPayload {
  /** PG(Toss)에 전달되는 주문 식별자. 추측 불가능한 UUID - 개인정보 미포함 (지시서 7조) */
  orderId: string;
  productType: CommerceProductType;
  /** 서버 카탈로그 기준 확정 금액. 클라이언트가 보낸 금액은 절대 신뢰하지 않는다 (지시서 6조) */
  amountKRW: number;
  /** 이 주문이 어떤 무료 분석 결과(Phase 4 resultToken)에 대한 추가 해석인지 */
  resultId: string;
  status: OrderStatus;
  createdAt: string;
}

export interface OrderRepository {
  create(input: { productType: CommerceProductType; resultId: string }): OrderCreationResult;
  getByToken(orderToken: string): OrderPayload | null;
}

export type OrderCreationResult =
  | { ok: true; orderId: string; orderToken: string; amountKRW: number; productName: string }
  | { ok: false; reason: "INVALID_PRODUCT" | "PRODUCT_NOT_PURCHASABLE" | "RESULT_NOT_FOUND" };

const ORDER_TTL_MS = 30 * 60 * 1000; // 30분 안에 결제를 완료해야 하는 주문 유효시간

class StatelessOrderRepository implements OrderRepository {
  create(input: { productType: CommerceProductType; resultId: string }): OrderCreationResult {
    const product = getProduct(input.productType);
    if (!product) return { ok: false, reason: "INVALID_PRODUCT" };
    if (!isPaidProductType(product.productType)) return { ok: false, reason: "PRODUCT_NOT_PURCHASABLE" };

    // 지시서 12조: 결제 시스템은 사주 원국을 다시 계산하지 않고 기존 SajuJson을 그대로 쓴다.
    // 그러려면 이 주문이 실제로 존재하는(만료되지 않은) 무료 분석 결과를 가리켜야 한다.
    //
    // Phase 9 지시서 3조: "기존 orders.ts에 필요한 최소한의 관상 상품 분기만
    // 추가한다." 이 한 줄이 그 분기다 - 관상 상품이면 관상 전용 저장소(faceResultStore)를,
    // 그 외(사주)는 기존 그대로 resultStore를 확인한다. 아래 로직은 어느 쪽이든 동일하다.
    const existingResult = isFaceProductType(product.productType) ? getFaceResult(input.resultId) : getResult(input.resultId);
    if (!existingResult) return { ok: false, reason: "RESULT_NOT_FOUND" };

    const payload: OrderPayload = {
      orderId: randomUUID(),
      productType: product.productType,
      amountKRW: product.priceKRW, // 서버 카탈로그 가격을 그대로 사용한다 - 클라이언트 입력 무시
      resultId: input.resultId,
      status: "READY",
      createdAt: new Date().toISOString(),
    };

    const orderToken = encodePaymentToken(payload, ORDER_TTL_MS);
    return { ok: true, orderId: payload.orderId, orderToken, amountKRW: payload.amountKRW, productName: product.name };
  }

  getByToken(orderToken: string): OrderPayload | null {
    return decodePaymentToken<OrderPayload>(orderToken);
  }
}

let repository: OrderRepository | null = null;

export function getOrderRepository(): OrderRepository {
  if (!repository) repository = new StatelessOrderRepository();
  return repository;
}

export function createOrder(input: { productType: unknown; resultId: unknown }): OrderCreationResult {
  if (typeof input.productType !== "string" || typeof input.resultId !== "string") {
    return { ok: false, reason: "INVALID_PRODUCT" };
  }
  return getOrderRepository().create({
    productType: input.productType as CommerceProductType,
    resultId: input.resultId,
  });
}

export function getOrderByToken(orderToken: string): OrderPayload | null {
  return getOrderRepository().getByToken(orderToken);
}
