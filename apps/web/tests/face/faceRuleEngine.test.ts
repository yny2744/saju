import { generateFaceRuleResult } from "../../src/server/face/faceRuleEngine";
import type { FaceFeatureBuckets } from "../../src/server/face/types";

function buckets(overrides: Partial<FaceFeatureBuckets> = {}): FaceFeatureBuckets {
  return { faceShape: "mid", forehead: "mid", eyeSpacing: "mid", nose: "mid", mouth: "mid", jaw: "mid", ...overrides };
}

describe("generateFaceRuleResult (Phase 9 지시서 2-A조 - 무료, AI 미사용)", () => {
  test("모든 카테고리에 대해 비어있지 않은 텍스트를 생성한다", () => {
    const result = generateFaceRuleResult(buckets());
    for (const value of Object.values(result.features)) {
      expect(typeof value).toBe("string");
      expect((value as string).length).toBeGreaterThan(0);
    }
  });

  test("동일 입력에 대해 항상 동일한 결과를 반환한다 (결정론적, AI 호출 없음)", () => {
    const a = generateFaceRuleResult(buckets());
    const b = generateFaceRuleResult(buckets());
    expect(a).toEqual(b);
  });

  test("버킷이 다르면 다른 문구가 나온다", () => {
    const low = generateFaceRuleResult(buckets({ faceShape: "low" }));
    const high = generateFaceRuleResult(buckets({ faceShape: "high" }));
    expect(low.features.faceShape).not.toBe(high.features.faceShape);
  });

  test("인연 미리보기(idealPartnerPreview)를 짧게 제공한다 (지시서: 간략히 미리 보여준다)", () => {
    const result = generateFaceRuleResult(buckets());
    expect(result.idealPartnerPreview.length).toBeGreaterThan(0);
    expect(result.idealPartnerPreview.length).toBeLessThan(300);
  });

  test("disclaimer가 항상 포함되며 과학적 확정 표현이 아님을 명시한다", () => {
    const result = generateFaceRuleResult(buckets());
    expect(result.disclaimer).toContain("문화");
    expect(result.disclaimer).toContain("과학적으로 확정");
  });
});
