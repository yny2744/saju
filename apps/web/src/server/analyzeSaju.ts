import { calculateSaju, AIInterpretationFailedError, getCurrentKstYear } from "saju-engine";
import type { AnalyzeResultResponse, ValidatedAnalyzeInput } from "./types";
import { getInterpretationEngine } from "./aiEngineProvider";

/**
 * 지시서 6조: "API는 연결과 요청/응답 관리 역할만 담당한다" - 이 함수가 바로 그
 * 연결 지점이다. 여기서 사주 계산 로직이나 AI 해석 로직을 새로 작성하지 않고,
 * 이미 완성된 calculateSaju()와 AIInterpretationEngine을 순서대로 호출한다.
 *
 *   calculateSaju()  → SajuJson (Saju Engine, Phase 1~2)
 *   engine.interpret() → InterpretationResult (AI Interpretation Engine, Phase 3)
 */
export class SajuCalculationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SajuCalculationError";
  }
}

export class AiInterpretationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiInterpretationError";
  }
}

/**
 * 세운(歲運) 조회 연도.
 *
 * README/Phase 2 원칙: calculateSaju()의 year는 "올해 자동 계산" 같은 암묵적
 * 기본값 없이 호출부가 명시적으로 지정해야 한다. 웹 서비스에서는 사용자에게
 * 별도로 "몇 년도 운세를 보시겠어요?"라고 묻지 않으므로, 서버가 요청을 처리하는
 * 시점의 연도를 그대로 사용한다.
 *
 * ⚠️ 이것은 Phase 3에서 금지한 "현재 대운 추정"과는 다른 문제다. 대운 추정은
 * 대운 목록 중 하나를 엔진이 갖고 있지 않은 방식으로 임의로 골라내는 것이었고,
 * 여기서는 Saju Engine이 이미 필수로 요구하는 "세운 조회 연도" 파라미터를
 * 채워주는 것뿐이다. 대운 관련 로직은 이 함수에서 전혀 건드리지 않는다.
 *
 * ⚠️ Fortune Engine 작업(지시서 5조) 중 발견 및 수정: 기존에는 new Date().getFullYear()로
 * 서버 프로세스의 로컬 타임존을 그대로 썼다 - 서버가 UTC 환경이면 한국시간 자정~오전 9시
 * 사이에 실제로는 다음 해인데 아직 이전 해로 계산되는 경계 버그가 있었다. saju-engine이
 * Fortune Engine용으로 새로 제공하는 getCurrentKstYear()(kstDate.ts)로 교체해 KST 기준으로
 * 고정한다. 세운 계산 로직 자체(seun.ts)는 전혀 건드리지 않았다 - "연도를 구하는 방식"만 수정.
 */
function currentSeunYear(): number {
  return getCurrentKstYear();
}

export async function analyzeSaju(input: ValidatedAnalyzeInput): Promise<AnalyzeResultResponse> {
  const year = currentSeunYear();

  let saju;
  try {
    saju = calculateSaju(input.sajuInput, year);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[phase4] Saju Engine 계산 실패:", err);
    throw new SajuCalculationError("사주 계산에 실패했습니다. 입력값을 다시 확인해주세요.");
  }

  const engine = getInterpretationEngine();

  try {
    const interpretation = await engine.interpret(saju, { productType: input.productType });
    return { nickname: input.nickname, saju, interpretation };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[phase4] AI Interpretation Engine 실패:", err);
    if (err instanceof AIInterpretationFailedError) {
      throw new AiInterpretationError("AI 해석 생성에 실패했습니다. 잠시 후 다시 시도해주세요.");
    }
    throw new AiInterpretationError("AI 해석 처리 중 알 수 없는 오류가 발생했습니다.");
  }
}
