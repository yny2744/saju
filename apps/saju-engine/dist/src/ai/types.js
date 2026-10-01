"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
