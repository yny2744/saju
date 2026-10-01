import type { SajuInput, FourPillars, CalculationMeta } from "./types";
/**
 * 통합된 계산 흐름 (양력/음력 입력 모두 동일한 파이프라인을 거친다):
 *
 *   1) 입력을 "양력 기준 날짜(y,m,d) + 시각(h,mi)"으로 정규화
 *      - 양력 입력: 그대로 사용
 *      - 음력 입력: Lunar.fromYmd(...).getSolar()로 먼저 양력 변환 (이 시점에 시각은 아직 미반영)
 *   2) 정규화된 "양력 wall clock"에 대해서만 그레고리력 날짜 산술(addMinutes)로 태양시 보정 적용
 *   3) Solar.fromYmdHms(...)로 최종 Solar 객체 생성 -> EightChar 도출
 *   4) EightChar.setSect(...)로 자시 처리 방식 적용 (날짜를 직접 조작하지 않음 - 라이브러리에 위임)
 *
 * 이렇게 하면 "음력 날짜 숫자에 직접 분 단위 산술을 하는" 이전 버전의 버그가 원천적으로 발생하지 않는다.
 */
export declare function calculateFourPillars(input: SajuInput): {
    pillars: FourPillars;
    meta: CalculationMeta;
};
