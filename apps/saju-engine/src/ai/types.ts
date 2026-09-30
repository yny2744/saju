/**
 * AI Interpretation Engine - 공통 타입 정의
 *
 * 명세서(3단계 지시서) 5조/9조 기준.
 *
 * 설계 메모:
 *   - 명세서 5조의 예시 InterpretationResult(summary/personality/career/... 평면 구조)를
 *     그대로 쓰지 않는다. 이미 이 프로젝트에는 src/prompts/productTemplates.ts에
 *     "상품 유형별로 analysis에 담기는 카테고리 자체가 달라지는" 구조가 구현되어 있고
 *     (FREE_BASIC/LOVE_3900/MONEY_3900/CAREER_3900/YEARLY_3900/PREMIUM_9900), 명세서
 *     8조("무료/유료 상품 확장성")도 이 구조를 그대로 요구한다. 따라서 기존 타입 구조와
 *     충돌하지 않도록, analysis는 상품 유형에 따라 형태가 달라지는 여유 있는 구조로 두고,
 *     상품과 무관하게 항상 존재하는 elements/tenGods/disclaimer/meta만 고정 필드로 둔다.
 *   - elements/tenGods 필드는 AI가 "계산"하는 값이 아니라, 이미 Saju Engine이 계산한
 *     saju.elements / saju.tenGods 값을 사람이 읽기 쉬운 문장으로 "설명"한 결과물이다.
 *     (명세서 3조: AI는 계산하지 않고 해석만 한다)
 */

import type { ProductType } from "../prompts/productTemplates";

/** 오행 해석 - Saju Engine이 계산한 saju.elements.summary를 문장으로 풀어쓴 결과 */
export interface ElementsInterpretation {
  wood: string;
  fire: string;
  earth: string;
  metal: string;
  water: string;
  /** Saju Engine의 saju.elements.summary.dominant와 동일해야 한다 (검증 대상) */
  dominant: string;
  /** Saju Engine의 saju.elements.summary.lacking과 일치해야 한다. 부족한 오행이 없으면 null */
  lacking: string | null;
}

/** 십신 해석 - Saju Engine이 계산한 saju.tenGods를 문장으로 풀어쓴 결과 */
export interface TenGodsInterpretation {
  /** Saju Engine의 saju.tenGods.dayMaster.stem과 동일해야 한다 (검증 대상) */
  dayMaster: string;
  summary: string;
}

/**
 * 상품 유형별 analysis 카테고리는 src/prompts/productTemplates.ts의 템플릿 정의를
 * 그대로 계약(contract)으로 삼는다. 값 형태가 상품마다 다르므로(문자열/배열/중첩객체)
 * 여기서는 unknown 레코드로 느슨하게 잡고, 실제 검증은
 * src/ai/validateInterpretationResult.ts의 상품별 스키마가 담당한다.
 */
export type InterpretationAnalysis = Record<string, unknown>;

export interface InterpretationMeta {
  productType: ProductType;
  /** 이 결과를 생성한 AI Provider 식별자 (예: "anthropic", "mock") */
  provider: string;
  /** 실제 호출에 사용된 모델명 */
  model: string;
  /** 결과 생성 시각 (ISO 8601) */
  generatedAt: string;
  /** 성공하기까지 소요된 시도 횟수 (1부터 시작) */
  attempts: number;
}

/**
 * AI Interpretation Engine의 최종 반환 타입.
 * 명세서 5조의 "구조화된 JSON 결과" 요구사항을 만족한다.
 */
export interface InterpretationResult {
  elements: ElementsInterpretation;
  tenGods: TenGodsInterpretation;
  analysis: InterpretationAnalysis;
  disclaimer: string;
  meta: InterpretationMeta;
}

export interface InterpretationOptions {
  /** 기본값: "FREE_BASIC" */
  productType?: ProductType;
  /** 실패 시 재시도 횟수 (기본 2 → 최대 3회 시도) */
  maxRetries?: number;
  /** 단일 호출당 타임아웃(ms). 기본 30000 */
  timeoutMs?: number;
}

/**
 * 명세서 9조의 AIInterpreter 추상화.
 * 특정 AI API(Anthropic/OpenAI/Gemini 등)에 강하게 종속되지 않도록,
 * 실제 서비스 코드는 이 인터페이스에만 의존해야 한다.
 */
export interface AIInterpreter {
  interpret(saju: import("../types").SajuJson, options?: InterpretationOptions): Promise<InterpretationResult>;
}
