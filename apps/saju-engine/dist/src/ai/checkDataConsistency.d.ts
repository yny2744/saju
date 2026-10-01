import type { SajuJson } from "../types";
import type { ValidatedInterpretationBody } from "./validateInterpretationResult";
/**
 * 명세서 3조/6조 절대 원칙 - "AI는 입력 JSON과 다른 간지나 십신을 만들어내지 않는다" -
 * 을 코드 레벨에서 실제로 강제하는 검사.
 *
 * 스키마 검증(validateInterpretationResult)은 "필요한 필드가 올바른 타입으로
 * 존재하는가"만 확인할 뿐, "그 값이 Saju Engine이 계산한 사실과 일치하는가"는
 * 확인하지 않는다. 이 함수가 그 간극을 메운다.
 *
 * 여기서는 AI가 반드시 그대로 되풀이해야 하는 두 가지 핵심 사실만 엄격히 검사한다:
 *   1) 일간(day master) 천간 - saju.tenGods.dayMaster.stem
 *   2) 오행 우세(dominant element) - saju.elements.summary.dominant
 * 그 외 서술형 텍스트(성향/직업/재물 등)는 자연어 해석 영역이라 문자열 완전
 * 일치를 요구할 수 없으므로 이 검사 대상에 포함하지 않는다.
 */
export declare function checkDataConsistency(saju: SajuJson, result: ValidatedInterpretationBody): void;
