import { analyzeSaju } from "../src/server/analyzeSaju";
import type { ValidatedAnalyzeInput } from "../src/server/types";

/**
 * 이 환경에는 ANTHROPIC_API_KEY가 없으므로 (지시서 27조 근거) 실제 LLM 대신
 * src/server/aiEngineProvider.ts의 DevFallbackProvider가 사용된다. 이 provider는
 * Saju Engine이 이미 계산한 값을 그대로 되읽어 응답을 구성하므로,
 * checkDataConsistency 검증까지 포함한 전체 흐름을 네트워크 호출 없이 검증할 수 있다.
 */
function baseInput(overrides: Partial<ValidatedAnalyzeInput> = {}): ValidatedAnalyzeInput {
  return {
    nickname: "테스트유저",
    sajuInput: { calendarType: "solar", date: "1990-05-20", time: "14:30", gender: "female" },
    productType: "FREE_BASIC",
    ...overrides,
  };
}

describe("analyzeSaju - calculateSaju() -> AIInterpretationEngine.interpret() 연결", () => {
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

  test("API Key가 없는 로컬 환경에서는 DevFallbackProvider가 사용되었음을 결과에서 확인할 수 있다", async () => {
    const result = await analyzeSaju(baseInput());
    // 실제 서비스 배포 시에는 반드시 ANTHROPIC_API_KEY를 설정해야 한다는 신호.
    expect(result.interpretation.meta.provider).toBe("dev-fallback");
  });
});
