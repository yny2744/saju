import { calculateSaju } from "saju-engine";
import { branchRelation, coupleMatch, stemRelation } from "@/lib/coupleMatch";
import { wallpaperSpec } from "@/lib/wallpaper";
import { planPurchase, isPremiumMode, premiumBase } from "@/server/readings/readings";
import { PREMIUM_ON, PRICE } from "@/lib/yeopjeon";

const a = calculateSaju({ calendarType: "solar", date: "1967-04-03", time: "04:50", gender: "male" }, 2026);
const b = calculateSaju({ calendarType: "solar", date: "1970-09-21", time: "11:00", gender: "female" }, 2026);

describe("2026-10-14 수정안 10·11·12", () => {
  it("궁합 표: 천간합 · 육합 · 충 · 원진 · 삼합", () => {
    expect(stemRelation("갑", "기")).toBe("합");
    expect(stemRelation("정", "임")).toBe("합");
    expect(branchRelation("자", "축")).toBe("육합");
    expect(branchRelation("자", "오")).toBe("충");
    expect(branchRelation("자", "미")).toBe("원진");
    expect(branchRelation("신", "진")).toBe("삼합");
  });
  it("연인 궁합: 점수·등급·네 항목, 근거에 이름 대신 {A}{B}", () => {
    const m = coupleMatch("유남영", a, "김하늘", b);
    expect(m.score).toBeGreaterThanOrEqual(55);
    expect(m.score).toBeLessThanOrEqual(98);
    expect(m.items).toHaveLength(4);
    expect(m.facts).not.toContain("유남영");
    expect(m.facts).toContain("{A}");
  });
  it("프리미엄 작명: 전부 보기 주제 + 가격", () => {
    expect(isPremiumMode("p_corp")).toBe(true);
    expect(premiumBase("p_corp")).toBe("corp");
    if (!PREMIUM_ON) {
      // 2026-10-17 포트원 심사 기간: 프리미엄은 숨기고 서버에서도 팔지 않는다
      expect(() => planPurchase("p_naming", [], [])).toThrow();
      expect(PRICE.PREMIUM_NAME).toBe(39900);
      return;
    }
    const p = planPurchase("p_naming", [], []);
    expect(p.price).toBe(PRICE.PREMIUM_NAME);
    expect(p.topics.length).toBeGreaterThanOrEqual(12);
    expect(planPurchase("p_brand", [], []).price).toBe(39900);
    // 운세를 이미 다 열었어도 작명은 살 수 있다 (예외 없음)
    expect(() => planPurchase("p_business", [], p.topics)).not.toThrow();
  });
  it("행운 배경화면: 990냥 · 같은 사주면 같은 재료", () => {
    expect(planPurchase("wallpaper", [], []).price).toBe(990);
    const s1 = wallpaperSpec(a, "유남영", "柳南榮");
    const s2 = wallpaperSpec(a, "유남영", "柳南榮");
    expect(s1).toEqual(s2);
    expect(s1.pillars).toHaveLength(4);
    expect(s1.big.length).toBe(1);
  });
});
