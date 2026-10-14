import { maskName, reviewProductLabel } from "@/lib/reviews";
import { parseProduct } from "@/server/reviews/reviews";

describe("수정안 47 - 1004 천사의 한마디", () => {
  it("이름 가리기", () => {
    expect(maskName("유남영")).toBe("유*영");
    expect(maskName("남궁민수")).toBe("남**수");
    expect(maskName("김철")).toBe("김*");
    expect(maskName("")).toBe("손님");
  });
  it("상품 이름", () => {
    expect(reviewProductLabel("basic:money")).toBe("재물 운세 보기");
    expect(reviewProductLabel("deep:monthly")).toBe("올해 월별 운세 깊게 보기");
    expect(reviewProductLabel("naming")).toBe("신생아 작명");
  });
  it("상품 키 검사", () => {
    expect(parseProduct("basic:money")).toEqual({ kind: "basic", topic: "money" });
    expect(parseProduct("basic:monthly")).toBeNull();
    expect(parseProduct("deep:gaeun")).toEqual({ kind: "deep", topic: "gaeun" });
    expect(parseProduct("bundle12")).toBeNull();
  });
});
