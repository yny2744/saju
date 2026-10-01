import type { SajuJson } from "../types";
import type { InterpretationResult } from "../ai/types";
/**
 * FREE_BASIC 전용 규칙 기반 해석 생성. AI를 전혀 호출하지 않는다.
 * 반환 타입은 AIInterpretationEngine.interpret()과 동일한 InterpretationResult라서,
 * 호출부(analyzeSaju.ts) 이후 코드는 수정할 필요가 없다.
 */
export declare function generateSajuFreeInterpretation(saju: SajuJson): InterpretationResult;
