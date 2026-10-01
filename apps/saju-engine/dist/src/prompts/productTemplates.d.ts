/**
 * 상품별 Prompt Template
 * 명세서 13조 기준: FREE_BASIC_PROMPT / LOVE_3900_PROMPT / MONEY_3900_PROMPT /
 * CAREER_3900_PROMPT / YEARLY_3900_PROMPT / PREMIUM_9900_PROMPT
 *
 * 각 템플릿은 "이번 요청에서 analysis 필드에 어떤 카테고리를 얼마나 깊게
 * 채워야 하는지"만 지정한다. 공통 규칙(오행/십신 도출 방식, 안전 원칙,
 * 출력 형식)은 systemPrompt.ts가 전담한다.
 *
 * 명세서 10원칙(제7원칙): "무료/유료 차이는 정확도가 아니라 분석 깊이와 범위"
 * 이 원칙을 그대로 코드 구조에 반영 - 모든 템플릿이 동일한 오행/십신 계산
 * 규칙을 쓰고, 차이는 오직 analysis에 담을 카테고리 개수와 각 항목의 분량이다.
 */
export type ProductType = "FREE_BASIC" | "LOVE_3900" | "MONEY_3900" | "CAREER_3900" | "YEARLY_3900" | "PREMIUM_9900";
interface ProductTemplate {
    productType: ProductType;
    /** 사용자에게 보여줄 상품명 */
    displayName: string;
    /** LLM에게 지시할 카테고리별 분량/깊이 */
    instruction: string;
}
export declare const PRODUCT_TEMPLATES: Record<ProductType, ProductTemplate>;
export {};
