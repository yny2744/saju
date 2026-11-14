import mgml from "@/tenants/mgml";
import ryugyeol from "@/tenants/ryugyeol";
import { TENANT } from "@/tenants";
import { handleFun, isOverlayPaid, lockOverlay, computeFun } from "@/server/fun/funService";
import { overlayRef } from "@/server/fun/funUnlock";

/** 2026-11-01 유샘: 겹쳐 보기 유료화 1단계 - 명견만리 타로관 */
const tarotReq = { kind: "tarot", calendarType: "solar", date: "1990-05-15", time: "09:00", card: 7, question: "love" };

describe("겹쳐 보기 유료", () => {
  // 2026-11-14 유샘: 재미관 여섯 가지도 겹쳐 보기는 990냥 (기본 풀이는 무료)
  it("명견만리 타로·재미관 여섯 가지 겹쳐 보기 유료(990냥), 류결사주는 그대로 무료", () => {
    expect(mgml.features.paidOverlay).toEqual(["tarot", "mbti", "numerology", "zodiac", "blood", "flower", "birthstone"]);
    expect(mgml.prices.OVERLAY).toBe(990);
    expect(ryugyeol.features.paidOverlay).toBeUndefined();
    expect(ryugyeol.prices.OVERLAY).toBeUndefined();
  });

  it("잠긴 응답에는 풀이 문장이 들어가지 않는다 (일간·게이지만)", () => {
    const full = computeFun(tarotReq);
    expect(full.status).toBe(200);
    const o = (full.body as { overlay: ReturnType<typeof lockOverlay> }).overlay;
    const l = lockOverlay(o);
    expect(l.dayCore).toBe("");
    expect(l.needLine).toBe("");
    expect(l.relation).toBeUndefined();
    expect(l.dayStem).toBe(o.dayStem);
    expect(l.need).toEqual(o.need);
    expect(JSON.stringify(l)).not.toContain(o.dayCore);
  });

  it("이번 빌드 고객사 설정대로 잠근다", () => {
    const paid = (TENANT.features.paidOverlay ?? []).includes("tarot");
    expect(isOverlayPaid("tarot")).toBe(paid);
    expect(isOverlayPaid("zodiac")).toBe(false);
    const r = handleFun(tarotReq, `test-${Date.now()}`).body as { locked?: boolean; overlay: { dayCore: string } };
    expect(r.locked === true).toBe(paid);
    expect(r.overlay.dayCore === "").toBe(paid);
  });

  it("같은 날·같은 입력이면 같은 지문, 날이나 카드가 바뀌면 다른 지문 (생년월일은 그대로 남지 않음)", () => {
    const a = overlayRef("tarot", tarotReq, "2026-11-01");
    expect(overlayRef("tarot", { ...tarotReq }, "2026-11-01")).toBe(a);
    expect(overlayRef("tarot", tarotReq, "2026-11-02")).not.toBe(a);
    expect(overlayRef("tarot", { ...tarotReq, card: 8 }, "2026-11-01")).not.toBe(a);
    expect(a).not.toContain("1990");
  });
});

describe("겹쳐 보기 관별 판매 (2026-11-14)", () => {
  it("saleOnly 의 overlay:<관> 으로 그 관만 판다", () => {
    jest.isolateModules(() => {
      jest.doMock("@/tenants", () => ({ TENANT: { saleOnly: ["exam", "overlay:mbti"] } }));
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { isOverlayOnSale } = require("@/lib/sale") as typeof import("@/lib/sale");
      expect(isOverlayOnSale("mbti")).toBe(true);
      expect(isOverlayOnSale("tarot")).toBe(false);
    });
  });
  it("overlay 가 통째로 있으면 전부", () => {
    jest.isolateModules(() => {
      jest.doMock("@/tenants", () => ({ TENANT: { saleOnly: ["overlay"] } }));
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { isOverlayOnSale } = require("@/lib/sale") as typeof import("@/lib/sale");
      expect(isOverlayOnSale("tarot")).toBe(true);
    });
  });
});
