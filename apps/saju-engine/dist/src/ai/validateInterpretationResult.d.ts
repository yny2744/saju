import type { ProductType } from "../prompts/productTemplates";
import type { ElementsInterpretation, InterpretationAnalysis, TenGodsInterpretation } from "./types";
export interface ValidatedInterpretationBody {
    elements: ElementsInterpretation;
    tenGods: TenGodsInterpretation;
    analysis: InterpretationAnalysis;
    disclaimer: string;
}
/**
 * AI 응답(JSON.parse 결과)이 InterpretationResult 본문 스키마를 만족하는지 검증한다.
 * meta는 AIInterpretationEngine이 별도로 붙이므로 여기서는 검증하지 않는다.
 *
 * 성공 시 타입이 좁혀진 값을 반환하고, 실패 시 AIValidationError를 던진다
 * (명세서 11조: "InterpretationResult 구조 준수 / 필수 항목 누락 여부 /
 * 문자열·배열 타입 검증"을 하나의 함수로 처리).
 */
export declare function validateInterpretationResult(value: unknown, productType: ProductType): ValidatedInterpretationBody;
