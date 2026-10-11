import { RETRY, completeWithRetry, isTransientAiError } from "@/server/readings/generateReading";

describe("수정안 42 - Gemini 자동 다시 시도", () => {
  const saved = [...RETRY.delays];
  beforeAll(() => {
    RETRY.delays = [1, 1, 1];
  });
  afterAll(() => {
    RETRY.delays = saved;
  });

  it("붐빔(503)·한도(429)는 일시 오류로 본다", () => {
    expect(isTransientAiError(new Error("Gemini API가 오류를 반환했습니다 (status 503): overloaded"))).toBe(true);
    expect(isTransientAiError(new Error("Gemini API가 오류를 반환했습니다 (status 429): quota"))).toBe(true);
    expect(isTransientAiError(new Error("Gemini API가 오류를 반환했습니다 (status 400): bad"))).toBe(false);
  });

  it("503 두 번 뒤 성공하면 풀이를 돌려준다", async () => {
    let n = 0;
    const provider = {
      providerName: "t",
      modelName: "t",
      async complete() {
        n++;
        if (n < 3) throw new Error("Gemini API가 오류를 반환했습니다 (status 503): overloaded");
        return "ok";
      },
    };
    await expect(completeWithRetry(provider, "p", (r) => r, 10)).resolves.toBe("ok");
    expect(n).toBe(3);
  });

  it("검사 탈락도 다시 쓰고, 네 번째까지 실패하면 오류", async () => {
    let n = 0;
    const provider = { providerName: "t", modelName: "t", complete: async () => String(++n) };
    await expect(
      completeWithRetry(provider, "p", () => {
        throw new Error("너무 짧습니다");
      }, 10)
    ).rejects.toThrow("너무 짧습니다");
    expect(n).toBe(4);
  });
});
