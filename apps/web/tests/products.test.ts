import { PRODUCT_CATALOG, getProduct, isCommerceProductType, isPaidProductType, isFaceProductType } from "../src/server/products";

describe("products (지시서 3조/4조)", () => {
  test("FREE_BASIC/BASIC/PREMIUM 세 가지 상품이 정의되어 있다", () => {
    // Phase 9: 관상 상품(FACE_PREMIUM)이 추가되어 4개가 됐다 (사주 3종은 그대로 유지).
    expect(Object.keys(PRODUCT_CATALOG).sort()).toEqual(["BASIC", "FACE_PREMIUM", "FREE_BASIC", "PREMIUM"]);
  });

  test("가격이 지시서에 명시된 금액과 정확히 일치한다", () => {
    expect(PRODUCT_CATALOG.FREE_BASIC.priceKRW).toBe(0);
    expect(PRODUCT_CATALOG.BASIC.priceKRW).toBe(3900);
    expect(PRODUCT_CATALOG.PREMIUM.priceKRW).toBe(9900);
  });

  test("BASIC은 연애/재물/직업/올해운세 네 카테고리를 커버하는 엔진 상품으로 매핑된다", () => {
    expect(PRODUCT_CATALOG.BASIC.engineProductTypes.sort()).toEqual(
      ["CAREER_3900", "LOVE_3900", "MONEY_3900", "YEARLY_3900"].sort()
    );
  });

  test("PREMIUM은 엔진의 PREMIUM_9900 하나로 매핑된다", () => {
    expect(PRODUCT_CATALOG.PREMIUM.engineProductTypes).toEqual(["PREMIUM_9900"]);
  });

  test("getProduct는 잘못된 productType에 대해 null을 반환한다", () => {
    expect(getProduct("NOT_A_PRODUCT")).toBeNull();
    expect(getProduct(undefined)).toBeNull();
    expect(getProduct(123)).toBeNull();
  });

  test("isPaidProductType은 FREE_BASIC을 유료로 취급하지 않는다", () => {
    expect(isPaidProductType("FREE_BASIC")).toBe(false);
    expect(isPaidProductType("BASIC")).toBe(true);
    expect(isPaidProductType("PREMIUM")).toBe(true);
  });

  test("isCommerceProductType은 임의 문자열을 거부한다", () => {
    expect(isCommerceProductType("basic")).toBe(false); // 대소문자 정확히 일치해야 함
    expect(isCommerceProductType("BASIC")).toBe(true);
  });

  describe("FACE_PREMIUM (Phase 9)", () => {
    test("가격이 지시서 범위 내에서 정의되어 있다", () => {
      expect(PRODUCT_CATALOG.FACE_PREMIUM.priceKRW).toBeGreaterThan(0);
    });

    test("Saju Engine을 호출하지 않으므로 engineProductTypes가 빈 배열이다", () => {
      expect(PRODUCT_CATALOG.FACE_PREMIUM.engineProductTypes).toEqual([]);
    });

    test("isPaidProductType과 isCommerceProductType이 FACE_PREMIUM을 인식한다", () => {
      expect(isPaidProductType("FACE_PREMIUM")).toBe(true);
      expect(isCommerceProductType("FACE_PREMIUM")).toBe(true);
    });

    test("isFaceProductType은 FACE_PREMIUM만 true를 반환한다", () => {
      expect(isFaceProductType("FACE_PREMIUM")).toBe(true);
      expect(isFaceProductType("BASIC")).toBe(false);
      expect(isFaceProductType("PREMIUM")).toBe(false);
      expect(isFaceProductType(undefined)).toBe(false);
    });
  });
});
