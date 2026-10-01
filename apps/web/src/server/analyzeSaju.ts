import { calculateSaju, generateSajuFreeInterpretation, getCurrentKstYear } from "saju-engine";
import type { AnalyzeResultResponse, ValidatedAnalyzeInput } from "./types";

/**
 * 지시서 6조: "API는 연결과 요청/응답 관리 역할만 담당한다" - 이 함수가 바로 그
 * 연결 지점이다. 여기서 사주 계산 로직이나 해석 로직을 새로 작성하지 않고,
 * 이미 완성된 calculateSaju()와 규칙 기반 해석 생성기를 순서대로 호출한다.
 *
 *   calculateSaju()  → SajuJson (Saju Engine, Phase 1~2)
 *   generateSajuFreeInterpretation() → InterpretationResult (규칙 기반, AI 미사용)
 *
 * ⚠️ 2026-10 수정: 이 엔드포인트(/api/saju/analyze)는 validateAnalyzeInput.ts가
 * productType을 FREE_BASIC 하나로만 제한하고 있어(SUPPORTED_PRODUCT_TYPES_PHASE4),
 * 사실상 "무료 사주 맛보기" 전용이다. 기존에는 이 무료 경로도 유료 상품과 동일하게
 * AIInterpretationEngine(Gemini/Anthropic)을 호출했는데, 이는 오늘의 운세·관상
 * 무료판이 이미 지켜온 "무료는 AI 비용 없이" 원칙과 어긋났고, 실제로 방문자가
 * 늘어나는 상황(예: 일 1,000명)에서 AI 호출 비용·속도 제한을 감당할 수 없는
 * 구조였다. 그래서 무료 경로를 규칙 기반(generateSajuFreeInterpretation)으로
 * 교체한다 - 유료(BASIC/PREMIUM) 경로(paidInterpretation.ts)는 전혀 건드리지
 * 않았고, 거기는 여전히 AI를 그대로 사용한다.
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

  try {
    const interpretation = generateSajuFreeInterpretation(saju);
    return { nickname: input.nickname, saju, interpretation };
  } catch (err) {
    // 규칙 기반이라 정상적으로는 실패하지 않지만(결정론적 순수 함수), 방어적으로 남겨둔다.
    // eslint-disable-next-line no-console
    console.error("[phase10] 무료 사주 해석 생성 실패:", err);
    throw new AiInterpretationError("해석 생성에 실패했습니다. 잠시 후 다시 시도해주세요.");
  }
}
