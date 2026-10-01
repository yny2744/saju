import { analyzeSaju } from "../src/server/analyzeSaju";
import type { ValidatedAnalyzeInput } from "../src/server/types";

/**
 * ⚠️ 2026-10 수정: analyzeSaju()(=/api/saju/analyze, FREE_BASIC 전용)는 더 이상
 * AI Provider(aiEngineProvider.ts)를 전혀 호출하지 않는다 - saju-engine의
 * generateSajuFreeInterpretation()(규칙 기반, AI 미사용)으로 교체됐다. 그래서
 * 이 테스트는 네트워크나 API Key 유무와 완전히 무관하게 항상 같은 방식으로
 * 동작한다. 유료(BASIC/PREMIUM) 경로는 paidInterpretation.ts가 따로 담당하며
 * 거기는 여전히 AI를 쓴다 (그쪽 테스트는 tests/paidInterpretation.test.ts).
 */
function baseInput(overrides: Partial<ValidatedAnalyzeInput> = {}): ValidatedAnalyzeInput {
  return {
    nickname: "테스트유저",
    sajuInput: { calendarType: "solar", date: "1990-05-20", time: "14:30", gender: "female" },
    productType: "FREE_BASIC",
    ...overrides,
  };
}

describe("analyzeSaju - calculateSaju() -> generateSajuFreeInterpretation() 연결 (Phase 10, AI 미사용)", () => {
  test("정상 입력이면 SajuJson과 InterpretationResult를 모두 포함한 결과를 반환한다", async () => {
    const result = await analyzeSaju(baseInput());

    expect(result.nickname).toBe("테스트유저");
    expect(result.saju.pillars.day.heavenlyStem).toBeTruthy();
    expect(result.interpretation.elements.dominant).toBe(result.saju.elements.summary.dominant);
    expect(result.interpretation.tenGods.dayMaster).toBe(result.saju.tenGods.dayMaster.stem);
    expect(result.interpretation.meta.productType).toBe("FREE_BASIC");
  });

  test("출생시간이 없어도 정상적으로 처리된다 (시주 미상 케이스)", async () => {
    const result = await analyzeSaju(
      baseInput({ sajuInput: { calendarType: "solar", date: "1990-05-20", gender: "female" } })
    );
    expect(result.saju.pillars.hour).toBeNull();
    expect(result.interpretation.tenGods.dayMaster).toBe(result.saju.tenGods.dayMaster.stem);
  });

  test("ANTHROPIC_API_KEY/GEMINI_API_KEY 유무와 무관하게 항상 규칙 기반(rule-engine)으로 생성된다", async () => {
    const originalAnthropic = process.env.ANTHROPIC_API_KEY;
    const originalGemini = process.env.GEMINI_API_KEY;
    try {
      // 키가 있어도 없어도 결과가 똑같아야 한다 - AI Provider를 아예 참조하지 않기 때문.
      delete process.env.ANTHROPIC_API_KEY;
      delete process.env.GEMINI_API_KEY;
      const withoutKeys = await analyzeSaju(baseInput());
      expect(withoutKeys.interpretation.meta.provider).toBe("rule-engine");

      process.env.ANTHROPIC_API_KEY = "sk-ant-fake-key-for-test";
      const withKey = await analyzeSaju(baseInput());
      expect(withKey.interpretation.meta.provider).toBe("rule-engine");
    } finally {
      if (originalAnthropic !== undefined) process.env.ANTHROPIC_API_KEY = originalAnthropic;
      else delete process.env.ANTHROPIC_API_KEY;
      if (originalGemini !== undefined) process.env.GEMINI_API_KEY = originalGemini;
      else delete process.env.GEMINI_API_KEY;
    }
  });

  test("동일 입력으로 여러 번 호출해도(=하루 수천 번 요청을 흉내) 매번 즉시, 에러 없이 응답한다", async () => {
    const calls = Array.from({ length: 20 }, () => analyzeSaju(baseInput()));
    const results = await Promise.all(calls);
    for (const r of results) {
      expect(r.interpretation.meta.provider).toBe("rule-engine");
    }
  });
});
