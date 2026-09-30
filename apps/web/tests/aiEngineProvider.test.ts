import {
  calculateSaju,
  buildSajuPrompt,
  parseAIResponse,
  validateInterpretationResult,
  checkDataConsistency,
  AIInterpretationEngine,
} from "saju-engine";
import { createDevFallbackProvider, getInterpretationEngine } from "../src/server/aiEngineProvider";

/**
 * Phase4 최종 수정 지시서 2조/14조:
 *   "DevFallbackProvider가 InterpretationResult를 직접 반환하여 검증단계를
 *    우회하면 안 된다" 를 코드로 직접 증명하는 테스트.
 *
 * 증명 방법: DevFallbackProvider는 CompletionProvider(=system/user 문자열을 받아
 * 문자열을 반환하는 저수준 인터페이스)만 구현한다. AIInterpreter(=InterpretationResult를
 * 직접 반환하는 상위 계약)를 구현하지 않으므로, 반드시
 * parseAIResponse → validateInterpretationResult → checkDataConsistency를
 * 통과해야만 실제로 쓸 수 있는 결과가 나온다. 아래에서 그 각 단계를 직접
 * 호출해서 실제로 통과하는지 확인한다.
 */
describe("DevFallbackProvider - 검증 파이프라인을 우회하지 않는다", () => {
  const saju = calculateSaju(
    { calendarType: "solar", date: "1990-05-20", time: "14:30", gender: "female" },
    2025
  );

  test("CompletionProvider 인터페이스만 구현하고, complete()는 문자열을 반환한다 (InterpretationResult를 직접 반환하지 않음)", async () => {
    const provider = createDevFallbackProvider();
    const { system, user } = buildSajuPrompt(saju, "FREE_BASIC");

    const raw = await provider.complete(system, user);

    expect(typeof raw).toBe("string");
    // AIInterpreter가 아니라 CompletionProvider라는 증거 - interpret 메서드가 없다.
    expect((provider as unknown as { interpret?: unknown }).interpret).toBeUndefined();
  });

  test("DevFallbackProvider의 원시 응답은 parseAIResponse -> validateInterpretationResult -> checkDataConsistency를 그대로 통과한다", async () => {
    const provider = createDevFallbackProvider();
    const { system, user } = buildSajuPrompt(saju, "FREE_BASIC");

    const raw = await provider.complete(system, user);

    // 1) JSON 파싱 단계 (우회 없음 - 진짜 JSON.parse를 거친다)
    const parsed = parseAIResponse(raw);

    // 2) 스키마 검증 단계 (우회 없음 - 실제 validateInterpretationResult를 거친다)
    const validated = validateInterpretationResult(parsed, "FREE_BASIC");

    // 3) 데이터 일치 검증 단계 (우회 없음 - 실제 checkDataConsistency를 거친다.
    //    엔진 계산값과 다르면 여기서 AIDataMismatchError가 던져진다)
    expect(() => checkDataConsistency(saju, validated)).not.toThrow();

    expect(validated.tenGods.dayMaster).toBe(saju.tenGods.dayMaster.stem);
    expect(validated.elements.dominant).toBe(saju.elements.summary.dominant);
  });

  test("AIInterpretationEngine에 DevFallbackProvider를 꽂아도 동일한 검증 파이프라인을 거쳐 정상 결과가 나온다", async () => {
    const provider = createDevFallbackProvider();
    const engine = new AIInterpretationEngine(provider);

    const result = await engine.interpret(saju, { productType: "FREE_BASIC" });

    expect(result.meta.provider).toBe("dev-fallback");
    expect(result.tenGods.dayMaster).toBe(saju.tenGods.dayMaster.stem);
    expect(result.disclaimer).toContain("실제 AI(LLM) 해석이 아닙니다");
  });

  test("getInterpretationEngine()은 ANTHROPIC_API_KEY가 없으면 AIInterpretationEngine(DevFallbackProvider) 조합을 반환한다", async () => {
    const originalKey = process.env.ANTHROPIC_API_KEY;
    const originalEnv = process.env.NODE_ENV;
    delete process.env.ANTHROPIC_API_KEY;
    // NODE_ENV를 test로 유지해서 production 분기(에러 throw)를 타지 않게 한다.
    (process.env as Record<string, string>).NODE_ENV = "test";

    try {
      const engine = getInterpretationEngine();
      const result = await engine.interpret(saju, { productType: "FREE_BASIC" });
      expect(result.meta.provider).toBe("dev-fallback");
    } finally {
      if (originalKey !== undefined) process.env.ANTHROPIC_API_KEY = originalKey;
      (process.env as Record<string, string>).NODE_ENV = originalEnv ?? "test";
    }
  });

  test("production 환경에서 ANTHROPIC_API_KEY가 없으면 DevFallbackProvider로 조용히 넘어가지 않고 에러를 던진다", () => {
    const originalKey = process.env.ANTHROPIC_API_KEY;
    const originalEnv = process.env.NODE_ENV;
    delete process.env.ANTHROPIC_API_KEY;
    (process.env as Record<string, string>).NODE_ENV = "production";

    try {
      expect(() => getInterpretationEngine()).toThrow();
    } finally {
      if (originalKey !== undefined) process.env.ANTHROPIC_API_KEY = originalKey;
      (process.env as Record<string, string>).NODE_ENV = originalEnv ?? "test";
    }
  });

  // 배포 전 최종 수정 지시서 2조/7-A조: ALLOW_MOCK_IN_PRODUCTION 3가지 케이스
  describe("ALLOW_MOCK_IN_PRODUCTION - production 전용 테스트 탈출구", () => {
    const originalKey = process.env.ANTHROPIC_API_KEY;
    const originalEnv = process.env.NODE_ENV;
    const originalAllowMock = process.env.ALLOW_MOCK_IN_PRODUCTION;

    afterEach(() => {
      if (originalKey !== undefined) {
        process.env.ANTHROPIC_API_KEY = originalKey;
      } else {
        delete process.env.ANTHROPIC_API_KEY;
      }
      (process.env as Record<string, string>).NODE_ENV = originalEnv ?? "test";
      if (originalAllowMock !== undefined) {
        process.env.ALLOW_MOCK_IN_PRODUCTION = originalAllowMock;
      } else {
        delete process.env.ALLOW_MOCK_IN_PRODUCTION;
      }
    });

    test("케이스 B: production + key 없음 + ALLOW_MOCK_IN_PRODUCTION 없음 -> 에러", () => {
      delete process.env.ANTHROPIC_API_KEY;
      (process.env as Record<string, string>).NODE_ENV = "production";
      delete process.env.ALLOW_MOCK_IN_PRODUCTION;

      expect(() => getInterpretationEngine()).toThrow();
    });

    test("케이스 C: production + key 없음 + ALLOW_MOCK_IN_PRODUCTION=true -> DevFallbackProvider 사용", async () => {
      delete process.env.ANTHROPIC_API_KEY;
      (process.env as Record<string, string>).NODE_ENV = "production";
      process.env.ALLOW_MOCK_IN_PRODUCTION = "true";

      const engine = getInterpretationEngine();
      const result = await engine.interpret(saju, { productType: "FREE_BASIC" });
      expect(result.meta.provider).toBe("dev-fallback");
    });

    test("케이스 D: production + key 없음 + ALLOW_MOCK_IN_PRODUCTION='false' -> 에러 (엄격한 문자열 비교)", () => {
      delete process.env.ANTHROPIC_API_KEY;
      (process.env as Record<string, string>).NODE_ENV = "production";
      process.env.ALLOW_MOCK_IN_PRODUCTION = "false";

      expect(() => getInterpretationEngine()).toThrow();
    });

    test("케이스 D: '1', 'yes' 등 'true'가 아닌 값은 모두 거부한다", () => {
      delete process.env.ANTHROPIC_API_KEY;
      (process.env as Record<string, string>).NODE_ENV = "production";

      for (const value of ["1", "yes", "TRUE", "True", ""]) {
        process.env.ALLOW_MOCK_IN_PRODUCTION = value;
        expect(() => getInterpretationEngine()).toThrow();
      }
    });
  });

  // Gemini API 연동: ANTHROPIC_API_KEY 다음 우선순위 Provider로 추가.
  describe("GEMINI_API_KEY - ANTHROPIC_API_KEY 다음 우선순위 Provider", () => {
    const originalAnthropicKey = process.env.ANTHROPIC_API_KEY;
    const originalGeminiKey = process.env.GEMINI_API_KEY;
    const originalEnv = process.env.NODE_ENV;
    let fetchSpy: jest.SpyInstance;

    beforeEach(() => {
      fetchSpy = jest.spyOn(global, "fetch" as never);
    });

    afterEach(() => {
      fetchSpy.mockRestore();
      if (originalAnthropicKey !== undefined) process.env.ANTHROPIC_API_KEY = originalAnthropicKey;
      else delete process.env.ANTHROPIC_API_KEY;
      if (originalGeminiKey !== undefined) process.env.GEMINI_API_KEY = originalGeminiKey;
      else delete process.env.GEMINI_API_KEY;
      (process.env as Record<string, string>).NODE_ENV = originalEnv ?? "test";
    });

    test("ANTHROPIC_API_KEY와 GEMINI_API_KEY가 둘 다 있으면 Anthropic이 우선한다", async () => {
      process.env.ANTHROPIC_API_KEY = "fake-anthropic-key";
      process.env.GEMINI_API_KEY = "fake-gemini-key";
      (process.env as Record<string, string>).NODE_ENV = "test";
      fetchSpy.mockRejectedValue(new Error("네트워크 호출 자체는 이 테스트의 관심사가 아님"));

      const engine = getInterpretationEngine();
      await expect(engine.interpret(saju, { productType: "FREE_BASIC", maxRetries: 0 })).rejects.toThrow();

      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining("api.anthropic.com"),
        expect.anything()
      );
    });

    test("ANTHROPIC_API_KEY가 없고 GEMINI_API_KEY만 있으면 Gemini를 사용하고, 응답도 동일한 검증 파이프라인을 통과한다", async () => {
      delete process.env.ANTHROPIC_API_KEY;
      process.env.GEMINI_API_KEY = "fake-gemini-key";
      (process.env as Record<string, string>).NODE_ENV = "test";

      const mockAnalysis = {
        temperament: "성향 설명",
        career: "직업운 설명",
        wealth: "재물운 설명",
        love: "연애운 설명",
        relationship: "대인관계 설명",
        yearlyFlow: "올해 흐름 설명",
        caution: "주의점 설명",
        opportunity: "기회 요인 설명",
      };
      const mockBody = {
        elements: {
          wood: "-",
          fire: "-",
          earth: "-",
          metal: "-",
          water: "-",
          dominant: saju.elements.summary.dominant,
          lacking: saju.elements.summary.lacking[0] ?? null,
        },
        tenGods: { dayMaster: saju.tenGods.dayMaster.stem, summary: "-" },
        analysis: mockAnalysis,
        disclaimer: "테스트용 Gemini mock 응답",
      };

      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: JSON.stringify(mockBody) }] } }],
        }),
      } as Response);

      const engine = getInterpretationEngine();
      const result = await engine.interpret(saju, { productType: "FREE_BASIC" });

      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining("generativelanguage.googleapis.com"),
        expect.anything()
      );
      expect(result.meta.provider).toBe("gemini");
      expect(result.tenGods.dayMaster).toBe(saju.tenGods.dayMaster.stem);
    });
  });
});
