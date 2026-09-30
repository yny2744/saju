import { GeminiCompletionProvider } from "../src/ai/providers/geminiCompletionProvider";
import { AIProviderError } from "../src/ai/errors";

describe("GeminiCompletionProvider", () => {
  const originalKey = process.env.GEMINI_API_KEY;
  const originalModel = process.env.SAJU_GEMINI_MODEL;

  afterEach(() => {
    if (originalKey !== undefined) process.env.GEMINI_API_KEY = originalKey;
    else delete process.env.GEMINI_API_KEY;
    if (originalModel !== undefined) process.env.SAJU_GEMINI_MODEL = originalModel;
    else delete process.env.SAJU_GEMINI_MODEL;
  });

  test("CompletionProvider 인터페이스를 구현한다 (providerName/modelName/complete)", () => {
    const provider = new GeminiCompletionProvider({ apiKey: "test-key" });
    expect(provider.providerName).toBe("gemini");
    expect(typeof provider.modelName).toBe("string");
    expect(typeof provider.complete).toBe("function");
  });

  test("apiKey/model을 생성자 인자로 주입하면 환경변수보다 우선한다", () => {
    process.env.GEMINI_API_KEY = "env-key";
    process.env.SAJU_GEMINI_MODEL = "env-model";

    const provider = new GeminiCompletionProvider({ apiKey: "injected-key", model: "injected-model" });
    expect(provider.modelName).toBe("injected-model");
  });

  test("아무 것도 주입하지 않으면 환경변수(GEMINI_API_KEY/SAJU_GEMINI_MODEL)를 사용한다", () => {
    delete process.env.GEMINI_API_KEY;
    process.env.SAJU_GEMINI_MODEL = "env-model-2";

    const provider = new GeminiCompletionProvider();
    expect(provider.modelName).toBe("env-model-2");
  });

  test("환경변수도 없으면 기본 모델(gemini-2.5-flash-lite)을 사용한다", () => {
    delete process.env.SAJU_GEMINI_MODEL;

    const provider = new GeminiCompletionProvider({ apiKey: "test-key" });
    expect(provider.modelName).toBe("gemini-2.5-flash-lite");
  });

  test("API Key가 없으면 실제 네트워크 호출 없이 AIProviderError를 던진다", async () => {
    delete process.env.GEMINI_API_KEY;
    const provider = new GeminiCompletionProvider();

    await expect(provider.complete("system", "user")).rejects.toThrow(AIProviderError);
    await expect(provider.complete("system", "user")).rejects.toThrow(/GEMINI_API_KEY/);
  });
});
