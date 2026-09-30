import type { CompletionProvider } from "saju-engine";
import { AIInterpretationFailedError, AIValidationError } from "saju-engine";
import { interpretFace } from "../../src/server/face/faceAiInterpreter";
import type { FaceFeatureBuckets } from "../../src/server/face/types";

function buckets(): FaceFeatureBuckets {
  return { faceShape: "mid", forehead: "mid", eyeSpacing: "mid", nose: "mid", mouth: "mid", jaw: "mid" };
}

function validAiJson(userPreferenceNote: string | null = null): string {
  return JSON.stringify({
    selfAnalysis: {
      faceShape: "설명",
      forehead: "설명",
      eyes: "설명",
      nose: "설명",
      mouth: "설명",
      jaw: "설명",
      overallSummary: "종합 해석",
    },
    relationshipInsight: {
      traditionalLoveTendency: "전통적 해석",
      idealPartnerTraits: "어울리는 인연 특징",
      partnerFeatureNotes: "상대방 특징 일반론",
      harmonyPoints: "유의점",
      userPreferenceNote,
    },
    disclaimer: "문화 콘텐츠 안내",
  });
}

/** 로컬 mock provider - saju-engine의 실제 Provider를 호출하지 않고 orchestration만 검증한다. */
class QueueProvider implements CompletionProvider {
  readonly providerName = "mock";
  readonly modelName = "mock-model";
  calls = 0;
  lastUser = "";
  constructor(private readonly responses: Array<string | Error>) {}
  async complete(_system: string, user: string): Promise<string> {
    this.lastUser = user;
    const item = this.responses[Math.min(this.calls, this.responses.length - 1)];
    this.calls += 1;
    if (item instanceof Error) throw item;
    return item;
  }
}

describe("interpretFace (Phase 9 지시서 2-B/2-C조)", () => {
  test("정상 응답이면 검증된 FaceAiResult를 반환한다", async () => {
    const provider = new QueueProvider([validAiJson()]);
    const result = await interpretFace(provider, buckets(), null);
    expect(result.selfAnalysis.overallSummary).toBe("종합 해석");
    expect(result.relationshipInsight.userPreferenceNote).toBeNull();
  });

  test("프롬프트에 원시 좌표나 이미지가 아니라 버킷 라벨만 담긴다", async () => {
    const provider = new QueueProvider([validAiJson()]);
    await interpretFace(provider, buckets(), null);
    expect(provider.lastUser).toContain("얼굴형(길이/너비 비율): 보통");
    expect(provider.lastUser).not.toMatch(/base64/i);
    expect(provider.lastUser).not.toContain("landmark");
  });

  test("사용자가 입력한 선호가 있으면 프롬프트에 별도 구분되어 포함된다", async () => {
    const provider = new QueueProvider([validAiJson("반영됨")]);
    await interpretFace(provider, buckets(), "차분한 사람이 좋아요");
    expect(provider.lastUser).toContain("[사용자가 직접 입력한 선호]");
    expect(provider.lastUser).toContain("차분한 사람이 좋아요");
  });

  test("선호 입력이 없으면 프롬프트에 해당 섹션이 없다", async () => {
    const provider = new QueueProvider([validAiJson()]);
    await interpretFace(provider, buckets(), null);
    expect(provider.lastUser).not.toContain("[사용자가 직접 입력한 선호]");
  });

  test("system 프롬프트는 실제 사진을 본 것처럼 서술하지 말라고 명시한다 (지시서 2-B/2-C조)", async () => {
    // faceAiInterpreter 내부 SYSTEM_PROMPT는 export하지 않으므로, provider가 받은 system 인자를 직접 캡처해서 검증한다.
    let capturedSystem = "";
    const provider: CompletionProvider = {
      providerName: "mock",
      modelName: "mock",
      async complete(system: string) {
        capturedSystem = system;
        return validAiJson();
      },
    };
    await interpretFace(provider, buckets(), null);
    expect(capturedSystem).toContain("실제 사진을 본 것처럼");
    expect(capturedSystem).toContain("실제로 관찰하거나");
    expect(capturedSystem).toContain("나이, 성별, 인종, 건강 상태, 감정 상태를 추론");
  });

  test("첫 시도가 손상된 JSON이면 재시도해서 두 번째 시도에서 성공한다", async () => {
    const provider = new QueueProvider(["이건 JSON이 아님", validAiJson()]);
    const result = await interpretFace(provider, buckets(), null);
    expect(result.disclaimer).toBe("문화 콘텐츠 안내");
    expect(provider.calls).toBe(2);
  });

  test("스키마에 맞지 않는 응답이 계속되면 최종적으로 실패한다", async () => {
    const provider = new QueueProvider(["{}", "{}", "{}"]);
    await expect(interpretFace(provider, buckets(), null)).rejects.toBeInstanceOf(AIInterpretationFailedError);
  });

  test("Provider가 계속 에러를 던지면 최종 실패한다", async () => {
    const provider = new QueueProvider([new Error("네트워크 오류"), new Error("네트워크 오류"), new Error("네트워크 오류")]);
    await expect(interpretFace(provider, buckets(), null)).rejects.toBeInstanceOf(AIInterpretationFailedError);
  });

  test("필수 필드가 빠진 응답은 검증 단계에서 걸러진다", async () => {
    const incomplete = JSON.stringify({ selfAnalysis: { faceShape: "x" }, disclaimer: "x" });
    const provider = new QueueProvider([incomplete, incomplete, incomplete]);
    await expect(interpretFace(provider, buckets(), null)).rejects.toBeInstanceOf(AIInterpretationFailedError);
  });
});

describe("AIValidationError 재사용 확인 (saju-engine과 동일 에러 타입)", () => {
  test("validateFaceAiResult는 saju-engine의 AIValidationError를 던진다", async () => {
    const { validateFaceAiResult } = await import("../../src/server/face/validateFaceAiResult");
    expect(() => validateFaceAiResult({})).toThrow(AIValidationError);
  });
});
