import {
  MockPaymentProvider,
  getPaymentProvider,
  resetPaymentProviderCacheForTesting,
} from "../src/server/paymentProvider";

describe("MockPaymentProvider (지시서 24조: Mock 승인 ≠ 실제 PG 승인)", () => {
  test("정상 요청이면 승인된다", async () => {
    const provider = new MockPaymentProvider();
    const result = await provider.confirmPayment({ paymentKey: "pk_1", orderId: "o_1", amount: 3900 });
    expect(result.approved).toBe(true);
    expect(result.approvedAmount).toBe(3900);
  });

  test("같은 paymentKey로 두 번째 승인 요청이 오면 거부한다 (지시서 10조: 중복 승인 방지)", async () => {
    const provider = new MockPaymentProvider();
    const first = await provider.confirmPayment({ paymentKey: "pk_dup", orderId: "o_1", amount: 3900 });
    const second = await provider.confirmPayment({ paymentKey: "pk_dup", orderId: "o_1", amount: 3900 });
    expect(first.approved).toBe(true);
    expect(second.approved).toBe(false);
    expect(second.alreadyProcessed).toBe(true);
  });

  test("금액이 0 이하면 거부한다", async () => {
    const provider = new MockPaymentProvider();
    const result = await provider.confirmPayment({ paymentKey: "pk_2", orderId: "o_2", amount: 0 });
    expect(result.approved).toBe(false);
  });
});

describe("getPaymentProvider - 운영 환경 안전장치 (지시서 8조/16조/24조)", () => {
  const originalKey = process.env.PAYMENT_SECRET_KEY;
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.PAYMENT_SECRET_KEY = originalKey;
    (process.env as Record<string, string | undefined>).NODE_ENV = originalNodeEnv;
    resetPaymentProviderCacheForTesting();
  });

  test("운영 환경에서 PAYMENT_SECRET_KEY가 없으면 Mock으로 조용히 넘어가지 않고 에러를 던진다", () => {
    delete process.env.PAYMENT_SECRET_KEY;
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";
    expect(() => getPaymentProvider()).toThrow();
  });

  test("개발/테스트 환경에서는 PAYMENT_SECRET_KEY가 없으면 MockPaymentProvider를 사용한다", () => {
    delete process.env.PAYMENT_SECRET_KEY;
    (process.env as Record<string, string | undefined>).NODE_ENV = "test";
    const provider = getPaymentProvider();
    expect(provider.providerName).toBe("mock");
  });

  test("PAYMENT_SECRET_KEY가 있으면 실제 TossPaymentProvider를 사용한다", () => {
    process.env.PAYMENT_SECRET_KEY = "test_sk_dummy";
    (process.env as Record<string, string | undefined>).NODE_ENV = "test";
    const provider = getPaymentProvider();
    expect(provider.providerName).toBe("toss");
  });
});
