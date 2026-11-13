import { PUSH_ON, PUSH_SWITCH } from "@/lib/pushKey";
import { SRC_COOKIE_ON } from "@/lib/source";
import { paidProducts } from "@/lib/pricingList";
import { TENANT } from "@/tenants";

// 2026-11-04 유샘: mgml 정식 오픈 전 정리
describe("오픈 전 정리", () => {
  it("아침 운세 알림은 꺼 둔다 (코드는 그대로)", () => {
    expect(PUSH_SWITCH).toBe(false);
    expect(PUSH_ON).toBe(false);
  });
  // 2026-11-14 유샘: 개인정보처리방침에 적고 유입 경로 쿠키를 켠다
  it("유입 경로 쿠키는 켜져 있고, 개인정보처리방침에 적혀 있다", () => {
    expect(SRC_COOKIE_ON).toBe(true);
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const fs = require("fs") as typeof import("fs");
    const policy = fs.readFileSync(require("path").join(__dirname, "../src/app/privacy/page.tsx"), "utf8");
    expect(policy).toContain("ryugyeol_src");
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

// 2026-11-09 유샘: 타로 세 장 카드 + 사주 겹쳐 보기 (5,500원)
describe("타로 세 장 상품", () => {
  /* eslint-disable @typescript-eslint/no-var-requires */
  const { computeFun, handleFun, isThreeRequest } = require("@/server/fun/funService");
  const { overlayRef } = require("@/server/fun/funUnlock");
  const mgml = require("@/tenants/mgml").default;
  const base = { kind: "tarot", calendarType: "solar", date: "1990-05-15", card: 13, question: "today" };

  it("명견만리만 5,500원, 가격표에도 나온다", () => {
    expect(mgml.prices.TAROT3).toBe(5500);
    const names = paidProducts().map((r) => `${r.name} ${r.price}`);
    expect(names.includes("타로 세 장 카드 + 사주 겹쳐 보기 5500")).toBe(TENANT.prices.TAROT3 === 5500 && !!TENANT.features.paidOverlay?.includes("tarot"));
  });
  it("세 장 계산: 과거·현재·미래 자리마다 카드 풀이와 일간 겹쳐 보기, 가운데는 오늘 뽑은 카드", () => {
    const out = computeFun({ ...base, spread: "three", cards: [3, 13, 20] });
    expect(out.status).toBe(200);
    const three = out.body.three;
    expect(three.map((t: { position: string }) => t.position)).toEqual(["과거", "현재", "미래"]);
    expect(three.map((t: { no: number }) => t.no)).toEqual([3, 13, 20]);
    expect(three.every((t: { head: string; body: string }) => t.head && t.body)).toBe(true);
  });
  it("잘못된 세 장(겹침·가운데가 다름)은 거절", () => {
    expect(computeFun({ ...base, spread: "three", cards: [3, 3, 20] }).status).toBe(400);
    expect(computeFun({ ...base, spread: "three", cards: [3, 14, 20] }).status).toBe(400);
  });
  it("무료 보기에서는 세 장 풀이를 만들지 않는다", () => {
    const out = handleFun({ ...base, spread: "three", cards: [3, 13, 20] }, "test-three");
    expect(out.status).toBe(200);
    expect(out.body.three).toBeUndefined();
  });
  it("세 장 상품은 한 장 겹쳐 보기와 다른 장부 표시로 센다", () => {
    expect(isThreeRequest({ ...base, spread: "three" })).toBe(true);
    const one = overlayRef("tarot", base, "2026-11-09");
    const three = overlayRef("tarot", { ...base, spread: "three", cards: [3, 13, 20] }, "2026-11-09");
    expect(one).not.toBe(three);
    expect(overlayRef("tarot", base, "2026-11-09")).toBe(one);
  });
});
