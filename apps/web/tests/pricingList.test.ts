import { FREE_ITEMS, formatWon, paidProducts } from "@/lib/pricingList";
import { PREMIUM_ON, PRICE } from "@/lib/yeopjeon";
import { BUSINESS_INFO } from "@/lib/businessInfo";

describe("상품·가격 안내 목록 (2026-10-19 결제 심사용)", () => {
  const OLD = process.env.NEXT_PUBLIC_SUNEUNG;
  afterEach(() => {
    if (OLD === undefined) delete process.env.NEXT_PUBLIC_SUNEUNG;
    else process.env.NEXT_PUBLIC_SUNEUNG = OLD;
  });

  it("가격은 PRICE 에서 그대로 읽는다", () => {
    delete process.env.NEXT_PUBLIC_SUNEUNG;
    const byName = Object.fromEntries(paidProducts().map((p) => [p.name, p.price]));
    expect(byName["운세 깊게 보기 (1가지)"]).toBe(PRICE.DEEP);
    expect(byName["12가지 운세 전부 보기"]).toBe(PRICE.BUNDLE12);
    expect(byName["아이 작명"]).toBe(PRICE.NAMING);
    expect(byName["연인 궁합"]).toBe(PRICE.COUPLE);
  });

  it("팔지 않는 것(프리미엄 작명 꺼짐, 수능운 숨김)은 목록에 없다", () => {
    delete process.env.NEXT_PUBLIC_SUNEUNG;
    const names = paidProducts().map((p) => p.name).join("|");
    if (!PREMIUM_ON) expect(names).not.toContain("프리미엄");
    expect(names).not.toContain("수능운");
    process.env.NEXT_PUBLIC_SUNEUNG = "on";
    expect(paidProducts().map((p) => p.name).join("|")).toContain("수능운");
  });

  it("무료 항목·원 표기·전화번호", () => {
    expect(FREE_ITEMS.length).toBeGreaterThan(0);
    expect(formatWon(29900)).toBe("29,900원");
    expect(BUSINESS_INFO.csPhone).toBe("010-2620-2744");
  });
});
