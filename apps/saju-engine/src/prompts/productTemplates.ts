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

export type ProductType =
  | "FREE_BASIC"
  | "LOVE_3900"
  | "MONEY_3900"
  | "CAREER_3900"
  | "YEARLY_3900"
  | "PREMIUM_9900";

interface ProductTemplate {
  productType: ProductType;
  /** 사용자에게 보여줄 상품명 */
  displayName: string;
  /** LLM에게 지시할 카테고리별 분량/깊이 */
  instruction: string;
}

export const PRODUCT_TEMPLATES: Record<ProductType, ProductTemplate> = {
  FREE_BASIC: {
    productType: "FREE_BASIC",
    displayName: "무료 기본 사주 분석",
    instruction: `analysis 필드에 아래 항목을 포함하세요. 각 항목은 2~3문장 내외로 간결하게:
{
  "temperament": "오행/일간 기반 기본 성향",
  "career": "직업운 - 짧은 요약",
  "wealth": "재물운 - 짧은 요약",
  "love": "연애운 - 짧은 요약",
  "relationship": "인간관계 - 짧은 요약",
  "yearlyFlow": "올해 전체적인 흐름 - 핵심 키워드 포함",
  "caution": "올해 주의할 점 (짧게, 확정적 예언 금지)",
  "opportunity": "올해 활용하면 좋은 방향 (짧게)"
}
전체 분량은 충분히 유용하되 유료 상품과 확실히 차별화되도록 각 항목을 짧게 유지하세요.
무료라고 해서 성의 없이 빈약하게 쓰지 마세요 - 처음 사용자가 이 결과만 보고도
"쓸모 있다"고 느껴야 다음 유료 상품으로 전환됩니다.`,
  },

  LOVE_3900: {
    productType: "LOVE_3900",
    displayName: "연애·결혼 심층 분석",
    instruction: `analysis 필드에 연애/결혼 주제만 깊게 다루세요 (다른 카테고리는 포함하지 마세요):
{
  "loveStyle": "이 사주가 가진 연애 스타일과 성향 (구체적으로, 4~5문장)",
  "idealPartnerType": "궁합이 잘 맞는 상대방 유형에 대한 명리학적 해석",
  "currentFlow": "현재 세운에서의 연애/결혼운 흐름",
  "challenges": "연애/결혼에서 특히 조심해야 할 패턴 (단정적 예언 금지, 경향성으로 서술)",
  "actionGuide": "연애운을 좋게 만들기 위한 실전 행동 가이드 3가지"
}
무료 버전보다 훨씬 구체적이고 깊이 있게, 실제 상담을 받는 듯한 밀도로 작성하세요.`,
  },

  MONEY_3900: {
    productType: "MONEY_3900",
    displayName: "재물·사업 심층 분석",
    instruction: `analysis 필드에 재물/사업 주제만 깊게 다루세요:
{
  "wealthStructure": "이 사주의 재성(財星) 구조와 재물을 대하는 성향 (4~5문장)",
  "incomeStyle": "안정적 수입형 vs 사업/투자형 중 어느 쪽에 가까운지와 근거",
  "currentFlow": "현재 세운에서의 재물운 흐름",
  "riskAreas": "재물 관리에서 주의할 패턴 (투자를 단정적으로 지시하지 말 것)",
  "actionGuide": "재물운을 좋게 만들기 위한 실전 행동 가이드 3가지"
}`,
  },

  CAREER_3900: {
    productType: "CAREER_3900",
    displayName: "직업·커리어 심층 분석",
    instruction: `analysis 필드에 직업/커리어 주제만 깊게 다루세요:
{
  "careerAptitude": "관성(官星)/식상(食傷) 구조로 본 적성과 일하는 스타일 (4~5문장)",
  "suitableFields": "어울리는 직업 분야나 역할 유형 (구체적으로)",
  "currentFlow": "현재 세운에서의 직업/커리어운 흐름",
  "challenges": "커리어에서 조심해야 할 패턴",
  "actionGuide": "커리어운을 좋게 만들기 위한 실전 행동 가이드 3가지"
}`,
  },

  YEARLY_3900: {
    productType: "YEARLY_3900",
    displayName: "연간 운세 심층 분석",
    instruction: `analysis 필드에 올해 세운을 중심으로 월별 흐름까지 다루세요:
{
  "yearOverview": "올해 세운과 사주 원국의 상호작용에 대한 종합 해석 (5~6문장)",
  "quarterlyFlow": {
    "q1": "1~3월 흐름", "q2": "4~6월 흐름", "q3": "7~9월 흐름", "q4": "10~12월 흐름"
  },
  "keyMonths": "특히 중요하게 챙겨야 할 시기 (구체적 사고/질병 예언 금지)",
  "actionGuide": "올해를 잘 보내기 위한 실전 행동 가이드 3가지"
}`,
  },

  PREMIUM_9900: {
    productType: "PREMIUM_9900",
    displayName: "종합 사주 프리미엄 리포트",
    instruction: `analysis 필드에 아래 모든 카테고리를 상세하게 포함하세요 (전체 상품 중 가장 깊은 버전):
{
  "sajuOverview": "사주 원국 상세 분석 - 오행/십신 구조 종합 해석 (6~8문장)",
  "temperament": "성향 - 깊이 있게",
  "wealth": "재물/사업 - 깊이 있게",
  "career": "직업/사업 - 깊이 있게",
  "love": "연애/결혼 - 깊이 있게",
  "relationship": "인간관계 - 깊이 있게",
  "yearlyFlow": "올해 전체 흐름",
  "monthlyFlow": "월별 흐름 (분기 단위라도 괜찮음)",
  "importantPeriods": "중요한 시기와 주의할 시기",
  "actionGuide": "실전 행동 가이드 (전체 종합, 5가지 이상)"
}
이 상품은 최고가 상품이므로 각 항목을 무료/BASIC 상품과 명확히 구분되는
밀도와 구체성으로 작성하세요.`,
  },
};
