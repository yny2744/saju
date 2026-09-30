import type { ProductType as EngineProductType } from "saju-engine";

/**
 * 지시서 4조: "상품명과 가격을 여러 API나 화면에 하드코딩하지 않는다. 하나의 상품
 * 정의 모듈에서 관리한다 ... 가격과 상품 권한은 반드시 서버를 최종 기준으로 한다."
 *
 * 이 파일이 그 단일 기준이다. 서버의 모든 API(주문 생성, 결제 승인, 결과 조회)와
 * 프론트엔드 화면(상품 선택 페이지)이 전부 이 모듈만 참조한다.
 *
 * 지시서 3조: BASIC은 "연애/재물/직업/올해 운세"를 포함한다고 명시되어 있다.
 * 그런데 Saju Engine(Phase 3)에는 이미 그 네 카테고리를 각각 깊게 다루는
 * 독립 상품 템플릿(LOVE_3900/MONEY_3900/CAREER_3900/YEARLY_3900)이 있고,
 * PREMIUM_9900은 이미 그 전부 + 확장 해석을 한 번에 다루는 템플릿이다.
 *
 * Phase 5 지시서 2조("AI Interpretation Engine 변경 금지", "기존 productTemplates
 * 변경 금지")를 지키기 위해, 새로운 엔진 템플릿을 만들지 않고 대신 커머스
 * 상품(BASIC/PREMIUM) 하나가 "엔진 상품 여러 개를 조합해서 부르는 방식"으로
 * 매핑한다:
 *
 *   BASIC(3,900원)   -> LOVE_3900 + MONEY_3900 + CAREER_3900 + YEARLY_3900 (4회 호출)
 *   PREMIUM(9,900원) -> PREMIUM_9900 (이미 전체를 포함하므로 1회 호출)
 *
 * ⚠️ 트레이드오프(최종 보고서에도 명시): BASIC은 내부적으로 LLM을 4번 호출한다.
 * 가격(3,900원)에 맞춰 "네 카테고리를 한 번에 요청하는 전용 템플릿"을 새로
 * 만드는 편이 비용상 더 효율적일 수 있으나, 그건 Phase 3 엔진의 productTemplates를
 * 수정하는 일이라 이번 지시서 2조/25조("기존 AI 로직 변경 금지", "최소 수정 원칙")
 * 위반이 된다. 그래서 이번 단계에서는 "엔진을 그대로 두고 여러 번 호출해서
 * 조합"하는 방식을 택했다 - 다음 Phase에서 필요하면 전용 BASIC 템플릿을 엔진
 * 쪽에 추가하는 것을 권장한다(남아있는 문제에도 기재).
 */

/**
 * Phase 9 지시서 3조: "기존 orders.ts에 필요한 최소한의 관상 상품 분기만
 * 추가한다." 그 분기가 가능하려면 상품 카탈로그 자체에 관상 상품이 먼저
 * 존재해야 하므로, 이 파일에 FACE_PREMIUM을 추가한다(기존 FREE_BASIC/BASIC/
 * PREMIUM 세 값과 그 동작은 전혀 바꾸지 않는 순수 추가).
 */
export type CommerceProductType = "FREE_BASIC" | "BASIC" | "PREMIUM" | "FACE_PREMIUM";

export interface ProductDefinition {
  productType: CommerceProductType;
  name: string;
  /** 원화 기준 가격. FREE_BASIC은 0원. */
  priceKRW: number;
  /** 사용자에게 보여줄 제공 기능 목록 */
  features: string[];
  /**
   * 이 커머스 상품을 제공하기 위해 실제로 호출할 Saju Engine의 ProductType 목록.
   * 관상 상품(FACE_PREMIUM)은 Saju Engine을 전혀 호출하지 않으므로 빈 배열을 둔다
   * (paidInterpretation.ts가 이 필드를 항상 배열로 가정하고 순회하므로, optional로
   * 바꾸지 않고 필수 필드를 유지해서 그 파일을 전혀 건드리지 않는다).
   */
  engineProductTypes: EngineProductType[];
}

export const PRODUCT_CATALOG: Record<CommerceProductType, ProductDefinition> = {
  FREE_BASIC: {
    productType: "FREE_BASIC",
    name: "무료 기본 사주 분석",
    priceKRW: 0,
    features: ["오행/십신 기본 해석", "성향/직업/재물/연애/관계/올해 흐름 요약"],
    engineProductTypes: ["FREE_BASIC"],
  },
  BASIC: {
    productType: "BASIC",
    name: "베이직 심층 분석",
    priceKRW: 3900,
    features: ["연애·결혼 심층 분석", "재물·사업 심층 분석", "직업·커리어 심층 분석", "연간 운세 심층 분석"],
    engineProductTypes: ["LOVE_3900", "MONEY_3900", "CAREER_3900", "YEARLY_3900"],
  },
  PREMIUM: {
    productType: "PREMIUM",
    name: "프리미엄 종합 리포트",
    priceKRW: 9900,
    features: [
      "베이직 전체 내용 포함",
      "사주 원국 확장 해석",
      "월별(분기별) 흐름",
      "웹 결과 제공",
      "PDF 제공 기반 (PDF 생성 자체는 추후 단계)",
    ],
    engineProductTypes: ["PREMIUM_9900"],
  },
  FACE_PREMIUM: {
    productType: "FACE_PREMIUM",
    name: "관상 심층 해석 · 인연 궁합",
    priceKRW: 4900,
    features: [
      "얼굴 특징 상세 분석 (전통 관상학 기반)",
      "종합 관상 해석",
      "연애·관계 전통적 해석",
      "어울리는 인연의 관상적 특징",
      "관계에서 살펴볼 조화 포인트와 유의점",
    ],
    engineProductTypes: [], // Saju Engine을 호출하지 않는 상품 (위 인터페이스 주석 참고)
  },
};

export function isCommerceProductType(value: unknown): value is CommerceProductType {
  return value === "FREE_BASIC" || value === "BASIC" || value === "PREMIUM" || value === "FACE_PREMIUM";
}

export function isPaidProductType(value: unknown): value is "BASIC" | "PREMIUM" | "FACE_PREMIUM" {
  return value === "BASIC" || value === "PREMIUM" || value === "FACE_PREMIUM";
}

/** orders.ts가 "사주 결과 저장소 vs 관상 결과 저장소" 중 어디를 확인할지 분기할 때 쓴다. */
export function isFaceProductType(value: unknown): value is "FACE_PREMIUM" {
  return value === "FACE_PREMIUM";
}

export function getProduct(productType: unknown): ProductDefinition | null {
  if (!isCommerceProductType(productType)) return null;
  return PRODUCT_CATALOG[productType];
}
