/**
 * Fortune Rule Engine 공용 타입.
 * 지시서 8조가 요구하는 { ruleId, condition, category, priority, text } 구조를
 * 이 프로젝트 스타일에 맞게 정리했다. "condition"은 규칙이 이미 어느 데이터
 * 조건에서 만들어졌는지가 파일 구조(tenGodRules.ts 등) 자체로 드러나므로
 * 별도 필드로 중복 기록하지 않고, ruleId 접두사로 조건을 식별한다.
 */

export type FortuneCategory = "overall" | "money" | "love" | "relationship" | "work";

export interface FortuneRule {
  ruleId: string;
  category: FortuneCategory;
  /** 숫자가 클수록 더 중요한(우선하는) 규칙. 카테고리별로 가장 높은 priority만 최종 채택한다. */
  priority: number;
  text: string;
}
