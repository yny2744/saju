import { validateFaceAnalyzeInput, bucketizeFeatures, validateRelationshipPreference } from "../../src/server/face/validateFaceFeatures";
import type { FaceFeatureInput } from "../../src/server/face/types";

function validFeatures(overrides: Partial<FaceFeatureInput> = {}): FaceFeatureInput {
  return {
    faceLengthToWidthRatio: 1.35,
    foreheadHeightRatio: 0.3,
    eyeSpacingRatio: 0.95,
    noseLengthToWidthRatio: 2.0,
    mouthWidthRatio: 0.44,
    jawWidthRatio: 0.78,
    detectionConfidence: 0.9,
    ...overrides,
  };
}

function validBody(overrides: Record<string, unknown> = {}) {
  return {
    nickname: "테스트",
    consent: true,
    features: validFeatures(),
    ...overrides,
  };
}

describe("validateFaceAnalyzeInput (Phase 9 지시서 4조)", () => {
  test("정상 입력은 통과한다", () => {
    const result = validateFaceAnalyzeInput(validBody());
    expect(result.ok).toBe(true);
  });

  test("동의(consent)가 없으면 거부한다", () => {
    const result = validateFaceAnalyzeInput(validBody({ consent: false }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.issues.some((i) => i.startsWith("consent"))).toBe(true);
  });

  test("닉네임이 없으면 거부한다", () => {
    const result = validateFaceAnalyzeInput(validBody({ nickname: "" }));
    expect(result.ok).toBe(false);
  });

  test("닉네임에 XSS 위험 문자가 있으면 거부한다", () => {
    const result = validateFaceAnalyzeInput(validBody({ nickname: "<script>" }));
    expect(result.ok).toBe(false);
  });

  test("features가 없으면 결과를 생성하지 않고 즉시 실패한다 (임의 결과 생성 금지 - 지시서 2-A조)", () => {
    const result = validateFaceAnalyzeInput(validBody({ features: undefined }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.issues.some((i) => i.startsWith("features"))).toBe(true);
  });

  test("비율 값이 숫자가 아니면 거부한다", () => {
    const result = validateFaceAnalyzeInput(validBody({ features: validFeatures({ faceLengthToWidthRatio: "1.3" as unknown as number }) }));
    expect(result.ok).toBe(false);
  });

  test("비율 값이 있을 법한 범위를 벗어나면 거부한다 (얼굴 오인식 방어)", () => {
    const result = validateFaceAnalyzeInput(validBody({ features: validFeatures({ faceLengthToWidthRatio: 99 }) }));
    expect(result.ok).toBe(false);
  });

  test("얼굴 감지 신뢰도가 최소 기준 미만이면 재촬영을 안내하며 거부한다", () => {
    const result = validateFaceAnalyzeInput(validBody({ features: validFeatures({ detectionConfidence: 0.1 }) }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.issues.some((i) => i.includes("다시 촬영"))).toBe(true);
  });

  test("relationshipPreference는 선택 입력이며, 없으면 null로 처리된다", () => {
    const result = validateFaceAnalyzeInput(validBody());
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.relationshipPreference).toBeNull();
  });

  test("relationshipPreference를 입력하면 trim되어 반영된다", () => {
    const result = validateFaceAnalyzeInput(validBody({ relationshipPreference: "  차분한 성격을 선호해요  " }));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.relationshipPreference).toBe("차분한 성격을 선호해요");
  });

  test("relationshipPreference가 너무 길면 거부한다", () => {
    const result = validateFaceAnalyzeInput(validBody({ relationshipPreference: "가".repeat(300) }));
    expect(result.ok).toBe(false);
  });
});

describe("validateRelationshipPreference", () => {
  test("빈 값은 null로 통과한다", () => {
    expect(validateRelationshipPreference(undefined)).toEqual({ ok: true, value: null });
    expect(validateRelationshipPreference("")).toEqual({ ok: true, value: null });
  });
  test("문자열이 아니면 실패한다", () => {
    expect(validateRelationshipPreference(123).ok).toBe(false);
  });
  test("위험 문자가 포함되면 실패한다", () => {
    expect(validateRelationshipPreference("<b>선호</b>").ok).toBe(false);
  });
});

describe("bucketizeFeatures", () => {
  test("각 비율을 low/mid/high 세 단계로 분류한다", () => {
    const buckets = bucketizeFeatures(validFeatures());
    for (const key of ["faceShape", "forehead", "eyeSpacing", "nose", "mouth", "jaw"] as const) {
      expect(["low", "mid", "high"]).toContain(buckets[key]);
    }
  });

  test("경계값 근처에서 일관되게 분류된다 (결정론적)", () => {
    const a = bucketizeFeatures(validFeatures({ faceLengthToWidthRatio: 1.1 }));
    const b = bucketizeFeatures(validFeatures({ faceLengthToWidthRatio: 1.1 }));
    expect(a.faceShape).toBe(b.faceShape);
    expect(a.faceShape).toBe("low");

    expect(bucketizeFeatures(validFeatures({ faceLengthToWidthRatio: 1.6 })).faceShape).toBe("high");
  });
});
