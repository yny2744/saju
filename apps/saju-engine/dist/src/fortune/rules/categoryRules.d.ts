/**
 * 여러 규칙 중 카테고리별로 가장 우선순위 높은 규칙 하나만 채택한다.
 * (지시서 9조: 문장을 단순히 이어붙이지 않고, 우선순위에 따라 하나로 정리한다.)
 */
import type { FortuneCategory, FortuneRule } from "./types";
export declare const FALLBACK_TEXTS: Record<FortuneCategory, string>;
export interface CategorySelection {
    text: string;
    ruleId: string | null;
}
/**
 * 같은 카테고리에 후보가 여럿이면 priority가 가장 높은 것을, priority가 같으면
 * ruleId 사전순으로 골라 항상 같은 입력에 같은 결과가 나오도록 한다(결정론성).
 */
export declare function selectCategoryTexts(rules: FortuneRule[]): Record<FortuneCategory, CategorySelection>;
