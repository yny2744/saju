import { examModeTopics, examUnlockTopic, examExtraTopic, EXAM_EXTRA_KINDS } from "@/lib/suneung";
import mgml from "@/tenants/mgml";
import ryugyeol from "@/tenants/ryugyeol";

// 2026-11-13 유샘 승인: 수능 심층분석 2~4 각 5,500원 · 네 가지 모두 보기 16,500원(3+1)
describe("수능 심층분석 상품", () => {
  test("상품마다 여는 이름 - 네 가지 모두 보기는 심층분석 1~4를 한 번에", () => {
    expect(examModeTopics("suneung", "exam")).toEqual(["exam_suneung"]);
    expect(examModeTopics("suneung", "exam_deep")).toEqual([examUnlockTopic("suneung", true)]);
    expect(examModeTopics("suneung", "exam_goal")).toEqual(["exam_suneung_goal"]);
    expect(examModeTopics("suneung", "exam_all")).toEqual(["exam_suneung_deep", ...EXAM_EXTRA_KINDS.map((k) => examExtraTopic("suneung", k))]);
    expect(examModeTopics("suneung", "exam_xx")).toEqual([]);
  });
  test("3+1 가격: 묶음 = 한 가지 값 × 3, 심층분석 1번과 같은 값", () => {
    expect(mgml.prices.EXAM_ALL).toBe((mgml.prices.EXAM_EXTRA ?? 0) * 3);
    expect(mgml.prices.EXAM_EXTRA).toBe(mgml.prices.EXAM_DEEP);
  });
  test("판매 잠금에 수능 상품만 들어 있다 (명견만리 베타)", () => {
    expect(mgml.saleOnly).toEqual(["exam", "exam_deep", "exam_goal", "exam_focus", "exam_calm", "exam_all"]);
    expect(ryugyeol.saleOnly).toBeUndefined();
  });
});
