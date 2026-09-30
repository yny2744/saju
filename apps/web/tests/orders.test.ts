import { createOrder, getOrderByToken } from "../src/server/orders";
import { saveResult } from "../src/server/resultStore";
import { saveFaceResult } from "../src/server/face/faceResultStore";
import type { AnalyzeResultResponse } from "../src/server/types";
import type { FaceResultResponse } from "../src/server/face/types";

function fakeBaseResult(): AnalyzeResultResponse {
  return {
    nickname: "주문테스트",
    saju: {} as AnalyzeResultResponse["saju"],
    interpretation: {} as AnalyzeResultResponse["interpretation"],
  };
}

function fakeFaceResult(): FaceResultResponse {
  return {
    nickname: "관상주문테스트",
    buckets: { faceShape: "mid", forehead: "mid", eyeSpacing: "mid", nose: "mid", mouth: "mid", jaw: "mid" },
    result: { features: {} as FaceResultResponse["result"]["features"], idealPartnerPreview: "", disclaimer: "" },
    relationshipPreference: null,
  };
}

describe("orders (지시서 6조/7조/12조)", () => {
  test("BASIC 주문 생성 시 서버 카탈로그 가격(3900원)을 그대로 사용한다", () => {
    const { id: resultId } = saveResult(fakeBaseResult());
    const order = createOrder({ productType: "BASIC", resultId });
    expect(order.ok).toBe(true);
    if (order.ok) {
      expect(order.amountKRW).toBe(3900);
      expect(order.productName).toBeTruthy();
    }
  });

  test("PREMIUM 주문 생성 시 9900원을 사용한다", () => {
    const { id: resultId } = saveResult(fakeBaseResult());
    const order = createOrder({ productType: "PREMIUM", resultId });
    expect(order.ok).toBe(true);
    if (order.ok) expect(order.amountKRW).toBe(9900);
  });

  test("FREE_BASIC은 구매 대상이 아니므로 주문을 생성할 수 없다", () => {
    const { id: resultId } = saveResult(fakeBaseResult());
    const order = createOrder({ productType: "FREE_BASIC", resultId });
    expect(order.ok).toBe(false);
    if (!order.ok) expect(order.reason).toBe("PRODUCT_NOT_PURCHASABLE");
  });

  test("존재하지 않는 상품 타입이면 주문을 생성할 수 없다", () => {
    const { id: resultId } = saveResult(fakeBaseResult());
    const order = createOrder({ productType: "GOLD_TIER", resultId });
    expect(order.ok).toBe(false);
    if (!order.ok) expect(order.reason).toBe("INVALID_PRODUCT");
  });

  test("존재하지 않거나 만료된 resultId면 주문을 생성할 수 없다 (사주 원국 재계산 방지)", () => {
    const order = createOrder({ productType: "BASIC", resultId: "존재하지-않는-토큰" });
    expect(order.ok).toBe(false);
    if (!order.ok) expect(order.reason).toBe("RESULT_NOT_FOUND");
  });

  test("생성된 orderToken은 orderId 등 개인정보 없는 주문 정보를 담고 있으며, 위조되면 조회에 실패한다", () => {
    const { id: resultId } = saveResult(fakeBaseResult());
    const order = createOrder({ productType: "BASIC", resultId });
    expect(order.ok).toBe(true);
    if (!order.ok) return;

    const decoded = getOrderByToken(order.orderToken);
    expect(decoded).not.toBeNull();
    expect(decoded?.orderId).toBe(order.orderId);
    expect(decoded?.status).toBe("READY");
    expect(decoded?.amountKRW).toBe(3900);

    // 토큰의 첫 글자(IV 세그먼트, 12바이트 고정이라 base64url 패딩 경계 문제가
    // 없음)를 변조한다 - 맨 끝 글자를 바꾸는 방식은 극히 드물게 base64 패딩
    // 비트에 걸려 "바꿔도 실제로는 안 바뀌는" 값이 나올 수 있다(resultStore.test.ts 참고).
    const tampered = (order.orderToken[0] === "z" ? "y" : "z") + order.orderToken.slice(1);
    expect(getOrderByToken(tampered)).toBeNull();
  });

  test("서로 다른 주문은 서로 다른 orderId/orderToken을 받는다 (추측 불가능한 ID, 지시서 7조)", () => {
    const { id: resultId } = saveResult(fakeBaseResult());
    const a = createOrder({ productType: "BASIC", resultId });
    const b = createOrder({ productType: "BASIC", resultId });
    expect(a.ok && b.ok).toBe(true);
    if (a.ok && b.ok) {
      expect(a.orderId).not.toBe(b.orderId);
      expect(a.orderToken).not.toBe(b.orderToken);
    }
  });

  describe("FACE_PREMIUM 분기 (Phase 9 지시서 3조 - orders.ts 최소 분기)", () => {
    test("관상 무료 결과를 기반으로 FACE_PREMIUM 주문을 생성할 수 있다", () => {
      const { id: resultId } = saveFaceResult(fakeFaceResult());
      const order = createOrder({ productType: "FACE_PREMIUM", resultId });
      expect(order.ok).toBe(true);
      if (order.ok) {
        expect(order.amountKRW).toBe(4900);
        expect(order.productName).toBeTruthy();
      }
    });

    test("사주 resultId로는 FACE_PREMIUM 주문을 생성할 수 없다 (저장소 분기가 실제로 동작하는지 검증)", () => {
      const { id: sajuResultId } = saveResult(fakeBaseResult());
      const order = createOrder({ productType: "FACE_PREMIUM", resultId: sajuResultId });
      expect(order.ok).toBe(false);
      if (!order.ok) expect(order.reason).toBe("RESULT_NOT_FOUND");
    });

    test("관상 resultId로는 사주 BASIC/PREMIUM 주문을 생성할 수 없다 (역방향 분기 검증)", () => {
      const { id: faceResultId } = saveFaceResult(fakeFaceResult());
      const order = createOrder({ productType: "BASIC", resultId: faceResultId });
      expect(order.ok).toBe(false);
      if (!order.ok) expect(order.reason).toBe("RESULT_NOT_FOUND");
    });
  });
});
