/**
 * saju-engine의 rules/twelveStageTables.ts에 있는 순환 순서를 그대로 옮겨왔다
 * (엔진 내부 상수라 export되어 있지 않아 복사함 - 엔진 파일은 수정하지 않는다).
 * 전통적으로 제왕(帝王)이 기운이 가장 강한 지점이고, 거기서 순환상 멀어질수록
 * (장생→...→제왕→...→절→...다시 장생) 기운이 약해진다고 보는 "포태법" 흐름을
 * 참고해서, 제왕으로부터의 순환 거리로 0~100 지수를 매긴다.
 *
 * ⚠️ 이건 명리학적으로 "확정된 점수"가 아니라 전통 12운성 순환을 참고용으로
 * 수치화한 것일 뿐이다 - fortuneRuleEngine.ts의 문구 톤과 동일하게, 참고용
 * 콘텐츠임을 화면에서 항상 같이 안내한다.
 */
const TWELVE_STAGE_ORDER = ["장생", "목욕", "관대", "임관", "제왕", "쇠", "병", "사", "묘", "절", "태", "양"];
const PEAK_INDEX = TWELVE_STAGE_ORDER.indexOf("제왕"); // 4
const CYCLE_LENGTH = TWELVE_STAGE_ORDER.length; // 12
const MAX_DISTANCE = CYCLE_LENGTH / 2; // 6

export function fortuneStrengthScore(twelveStageOfDay: string): number {
  const index = TWELVE_STAGE_ORDER.indexOf(twelveStageOfDay);
  if (index === -1) return 50; // 알 수 없는 값이면 중립값 (임의 추정 대신 중립 처리)

  const rawDistance = Math.abs(index - PEAK_INDEX);
  const cyclicalDistance = Math.min(rawDistance, CYCLE_LENGTH - rawDistance);
  const normalized = 1 - cyclicalDistance / MAX_DISTANCE;
  return Math.round(normalized * 100);
}
