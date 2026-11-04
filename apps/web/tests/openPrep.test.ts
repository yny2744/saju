import { PUSH_ON, PUSH_SWITCH } from "@/lib/pushKey";
import { SRC_COOKIE_ON } from "@/lib/source";
import { paidProducts } from "@/lib/pricingList";
import { TENANT } from "@/tenants";

// 2026-11-04 유샘: mgml 정식 오픈 전 정리
describe("오픈 전 정리", () => {
  it("아침 운세 알림·유입 경로 쿠키는 꺼 둔다 (코드는 그대로)", () => {
    expect(PUSH_SWITCH).toBe(false);
    expect(PUSH_ON).toBe(false);
    expect(SRC_COOKIE_ON).toBe(false);
  });
  it("상품·가격 안내: 파는 고객사에는 타로 겹쳐 보기·2027 신년운 두 상품이 있다", () => {
    const names = paidProducts().map((r) => `${r.name} ${r.price}`);
    const sellsOverlay = !!TENANT.prices.OVERLAY && !!TENANT.features.paidOverlay?.includes("tarot");
    expect(names.includes("타로 겹쳐 보기 990")).toBe(sellsOverlay);
    const sellsNy = typeof TENANT.prices.NEWYEAR === "number";
    expect(names.includes("2027 신년운 총운 990")).toBe(sellsNy);
    expect(names.includes("2027 신년운 전체 보기 9900")).toBe(sellsNy);
  });
});
