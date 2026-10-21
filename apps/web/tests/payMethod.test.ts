import { DEFAULT_PAY_METHOD, PAY_METHODS, PAY_METHODS_TEXT, isPayMethodId, portonePayMethod, tossPayMethod } from "@/lib/payMethod";

describe("결제수단 (2026-10-21)", () => {
  it("열린 수단은 신용카드와 실시간 계좌이체 둘이고 기본은 카드", () => {
    expect(PAY_METHODS.map((m) => m.id)).toEqual(["CARD", "TRANSFER"]);
    expect(DEFAULT_PAY_METHOD).toBe("CARD");
    expect(PAY_METHODS_TEXT).toBe("카드·계좌이체");
  });

  it("포트원·토스 결제수단 값으로 바뀐다", () => {
    expect(portonePayMethod("CARD")).toBe("CARD");
    expect(portonePayMethod("TRANSFER")).toBe("TRANSFER");
    expect(tossPayMethod("TRANSFER")).toBe("TRANSFER");
  });

  it("목록에 없는 값은 결제수단이 아니다", () => {
    expect(isPayMethodId("TRANSFER")).toBe(true);
    expect(isPayMethodId("EASY_PAY")).toBe(false);
    expect(isPayMethodId(undefined)).toBe(false);
  });
});
