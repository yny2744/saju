import { handleAnalyzeRequest } from "../src/server/requestHandlers";
import { handleCreateOrder, handleConfirmPayment, handleGetPaidResult } from "../src/server/paymentRequestHandlers";
import type { ApiErrorResponse } from "../src/server/types";
import type { CreateOrderResponse, ConfirmPaymentResponse } from "../src/server/paymentRequestHandlers";

const validSajuBody = {
  nickname: "결제통합테스트",
  gender: "female",
  calendarType: "solar",
  date: "1990-05-20",
  time: "14:30",
};

async function createFreeResultId(clientKey: string): Promise<string> {
  const res = await handleAnalyzeRequest(validSajuBody, clientKey);
  expect(res.status).toBe(200);
  return (res.body as { id: string }).id;
}

describe("결제 API 통합 흐름 (주문 생성 -> 결제 승인 -> 유료 결과 조회)", () => {
  test("전체 흐름이 정상 동작한다: FREE_BASIC 분석 -> BASIC 주문 -> 결제 승인 -> 유료 결과 조회", async () => {
    const resultId = await createFreeResultId("client-payflow-1");

    const orderRes = await handleCreateOrder({ productType: "BASIC", resultId }, "client-payflow-1");
    expect(orderRes.status).toBe(200);
    const order = orderRes.body as CreateOrderResponse;
    expect(order.amountKRW).toBe(3900);

    const confirmRes = await handleConfirmPayment(
      { orderToken: order.orderToken, paymentKey: `pk_${Math.random()}`, orderId: order.orderId, amount: order.amountKRW },
      "client-payflow-1"
    );
    expect(confirmRes.status).toBe(200);
    const confirmed = confirmRes.body as ConfirmPaymentResponse;

    const paidRes = await handleGetPaidResult(confirmed.entitlementToken);
    expect(paidRes.status).toBe(200);
    const paidBody = paidRes.body as { results: Record<string, unknown> };
    expect(Object.keys(paidBody.results).length).toBe(4);
  });

  test("FREE_BASIC 분석은 결제 기능 도입 이후에도 그대로 동작한다 (지시서 17조 회귀 확인)", async () => {
    const res = await handleAnalyzeRequest(validSajuBody, "client-payflow-regression");
    expect(res.status).toBe(200);
  });

  test("존재하지 않는 결과에 대해서는 주문을 생성할 수 없다", async () => {
    const res = await handleCreateOrder({ productType: "BASIC", resultId: "없는-결과" }, "client-payflow-2");
    expect(res.status).toBe(404);
  });

  test("FREE_BASIC은 주문 생성 대상이 아니다", async () => {
    const resultId = await createFreeResultId("client-payflow-3");
    const res = await handleCreateOrder({ productType: "FREE_BASIC", resultId }, "client-payflow-3");
    expect(res.status).toBe(400);
  });

  test("결제 금액을 변조해서 승인 요청하면 거부된다", async () => {
    const resultId = await createFreeResultId("client-payflow-4");
    const orderRes = await handleCreateOrder({ productType: "PREMIUM", resultId }, "client-payflow-4");
    const order = orderRes.body as CreateOrderResponse;

    const confirmRes = await handleConfirmPayment(
      { orderToken: order.orderToken, paymentKey: "pk_tamper", orderId: order.orderId, amount: 100 },
      "client-payflow-4"
    );
    expect(confirmRes.status).toBe(400);
    expect((confirmRes.body as ApiErrorResponse).error.code).toBe("AMOUNT_MISMATCH");
  });

  test("동일 결제(paymentKey)에 대한 중복 승인 요청은 409로 거부된다", async () => {
    const resultId = await createFreeResultId("client-payflow-5");
    const orderRes = await handleCreateOrder({ productType: "BASIC", resultId }, "client-payflow-5");
    const order = orderRes.body as CreateOrderResponse;
    const paymentKey = `pk_dup_${Math.random()}`;

    const first = await handleConfirmPayment(
      { orderToken: order.orderToken, paymentKey, orderId: order.orderId, amount: order.amountKRW },
      "client-payflow-5"
    );
    expect(first.status).toBe(200);

    const second = await handleConfirmPayment(
      { orderToken: order.orderToken, paymentKey, orderId: order.orderId, amount: order.amountKRW },
      "client-payflow-5"
    );
    expect(second.status).toBe(409);
    expect((second.body as ApiErrorResponse).error.code).toBe("ALREADY_PROCESSED");
  });

  test("위조된 entitlement 토큰으로는 유료 결과를 조회할 수 없다 (URL 파라미터만으로 권한 상승 불가, 지시서 13조)", async () => {
    const res = await handleGetPaidResult("아무렇게나-만든-토큰");
    expect(res.status).toBe(403);
    expect((res.body as ApiErrorResponse).error.code).toBe("ENTITLEMENT_INVALID");
  });

  test("entitlement 없이(null) 조회하면 403을 반환한다", async () => {
    const res = await handleGetPaidResult(null);
    expect(res.status).toBe(403);
  });

  test("PAYMENT_SECRET_KEY 값이 어떤 응답에도 노출되지 않는다 (Secret Key 보안, 지시서 16조)", async () => {
    const originalKey = process.env.PAYMENT_SECRET_KEY;
    process.env.PAYMENT_SECRET_KEY = "sk-payment-super-secret-should-never-leak";
    try {
      const resultId = await createFreeResultId("client-payflow-secret");
      const orderRes = await handleCreateOrder({ productType: "BASIC", resultId }, "client-payflow-secret");
      expect(JSON.stringify(orderRes.body)).not.toContain("sk-payment-super-secret-should-never-leak");
    } finally {
      process.env.PAYMENT_SECRET_KEY = originalKey;
    }
  });
});
