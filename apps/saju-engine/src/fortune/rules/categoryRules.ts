/**
 * 여러 규칙 중 카테고리별로 가장 우선순위 높은 규칙 하나만 채택한다.
 * (지시서 9조: 문장을 단순히 이어붙이지 않고, 우선순위에 따라 하나로 정리한다.)
 */
import type { FortuneCategory, FortuneRule } from "./types";

export const FALLBACK_TEXTS: Record<FortuneCategory, string> = {
  overall: "특별한 굴곡 없이 평온하게 흘러가는 하루예요. 평소 하던 대로 차분하게 보내면 좋아요.",
  money: "재물 관련해서는 큰 변화 없이 평소 흐름이 유지되는 날이에요.",
  love: "연애·감정 면에서는 무난하게 흘러가는 날이에요.",
  relationship: "대인관계는 평소와 비슷한 흐름으로 무난해요.",
  work: "업무·활동 면에서는 특별한 변수 없이 순조로운 날이에요.",
};

export interface CategorySelection {
  text: string;
  ruleId: string | null;
}

/**
 * 같은 카테고리에 후보가 여럿이면 priority가 가장 높은 것을, priority가 같으면
 * ruleId 사전순으로 골라 항상 같은 입력에 같은 결과가 나오도록 한다(결정론성).
 */
export function selectCategoryTexts(
  rules: FortuneRule[]
): Record<FortuneCategory, CategorySelection> {
  const categories: FortuneCategory[] = ["overall", "money", "love", "relationship", "work"];
  const result = {} as Record<FortuneCategory, CategorySelection>;

  for (const category of categories) {
    const candidates = rules.filter((r) => r.category === category);
    if (candidates.length === 0) {
      result[category] = { text: FALLBACK_TEXTS[category], ruleId: null };
      continue;
    }
    const best = [...candidates].sort((a, b) => b.priority - a.priority || a.ruleId.localeCompare(b.ruleId))[0];
    result[category] = { text: best.text, ruleId: best.ruleId };
  }

  return result;
}
