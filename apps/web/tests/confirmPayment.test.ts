import { createOrder } from "../src/server/orders";
import { saveResult } from "../src/server/resultStore";
import {
  confirmPayment,
  OrderInvalidError,
  AmountMismatchError,
  AlreadyProcessedError,
} from "../src/server/confirmPayment";
import { verifyEntitlement } from "../src/server/entitlement";
import type { AnalyzeResultResponse } from "../src/server/types";

function fakeBaseResult(): AnalyzeResultResponse {
  return {
    nickname: "결제테스트",
    saju: {} as AnalyzeResultResponse["saju"],
    interpretation: {} as AnalyzeResultResponse["interpretation"],
  };
}

function createReadyOrder(productType: "BASIC" | "PREMIUM" = "BASIC") {
  const { id: resultId } = saveResult(fakeBaseResult());
  const order = createOrder({ productType, resultId });
  if (!order.ok) throw new Error("test setup failed");
  return { ...order, resultId };
}

describe("confirmPayment (지시서 6조/8조/9조/10조)", () => {
  test("정상 흐름이면 entitlement 토큰을 발급하고, 그 안에 올바른 resultId/productType이 담긴다", async () => {
    const order = createReadyOrder("BASIC");
    const result = await confirmPayment({
      orderToken: order.orderToken,
      paymentKey: `pk_${Math.random()}`,
      orderId: order.orderId,
      amount: order.amountKRW,
    });

    expect(result.productType).toBe("BASIC");
    const entitlement = verifyEntitlement(result.entitlementToken);
    expect(entitlement).not.toBeNull();
    expect(entitlement?.resultId).toBe(order.resultId);
    expect(entitlement?.productType).toBe("BASIC");
  });

  test("orderId가 주문 토큰과 다르면 거부한다 (다른 주문 토큰 재사용 방지)", async () => {
    const order = createReadyOrder();
    await expect(
      confirmPayment({
        orderToken: order.orderToken,
        paymentKey: "pk_x",
        orderId: "다른-주문-id",
        amount: order.amountKRW,
      })
    ).rejects.toBeInstanceOf(OrderInvalidError);
  });

  test("금액이 주문 금액과 다르면 거부한다 (클라이언트/PG 금액 변조 방지)", async () => {
    const order = createReadyOrder();
    await expect(
      confirmPayment({
        orderToken: order.orderToken,
        paymentKey: "pk_y",
        orderId: order.orderId,
        amount: 100, // 실제 3900원인데 100원으로 변조 시도
      })
    ).rejects.toBeInstanceOf(AmountMismatchError);
  });

  test("잘못된 형식(위조/손상)의 주문 토큰은 거부한다", async () => {
    await expect(
      confirmPayment({ orderToken: "이건-유효한-토큰이-아님", paymentKey: "pk_z", orderId: "o", amount: 3900 })
    ).rejects.toBeInstanceOf(OrderInvalidError);
  });

  test("동일 paymentKey로 두 번째 승인 요청을 보내면 중복 승인으로 거부한다 (지시서 10조)", async () => {
    const order = createReadyOrder();
    const paymentKey = `pk_dup_${Math.random()}`;

    const first = await confirmPayment({
      orderToken: order.orderToken,
      paymentKey,
      orderId: order.orderId,
      amount: order.amountKRW,
    });
    expect(first.entitlementToken).toBeTruthy();

    await expect(
      confirmPayment({ orderToken: order.orderToken, paymentKey, orderId: order.orderId, amount: order.amountKRW })
    ).rejects.toBeInstanceOf(AlreadyProcessedError);
  });

  test("같은 주문을 서로 다른 paymentKey로 두 번 결제 완료 시도하면 두 번째는 거부된다 (이미 완료된 주문 재사용 방지)", async () => {
    const order = createReadyOrder();

    const first = await confirmPayment({
      orderToken: order.orderToken,
      paymentKey: `pk_first_${Math.random()}`,
      orderId: order.orderId,
      amount: order.amountKRW,
    });
    expect(first.entitlementToken).toBeTruthy();

    await expect(
      confirmPayment({
        orderToken: order.orderToken,
        paymentKey: `pk_second_${Math.random()}`, // 완전히 다른 결제 시도
        orderId: order.orderId,
        amount: order.amountKRW,
      })
    ).rejects.toBeInstanceOf(AlreadyProcessedError);
  });

  test("입력값 타입이 잘못되면(숫자가 아닌 amount 등) 거부한다", async () => {
    const order = createReadyOrder();
    await expect(
      confirmPayment({
        orderToken: order.orderToken,
        paymentKey: "pk_bad",
        orderId: order.orderId,
        amount: "3900" as unknown, // 문자열로 변조 시도
      })
    ).rejects.toBeInstanceOf(OrderInvalidError);
  });
});
