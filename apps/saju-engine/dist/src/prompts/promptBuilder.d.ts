import { ProductType } from "./productTemplates";
import type { SajuJson } from "../types";
export interface BuiltPrompt {
    system: string;
    user: string;
}
/**
 * 상품 유형에 맞는 system/user 프롬프트를 조립해서 반환한다.
 * 반환된 { system, user }를 그대로 LLM API의 system / messages[0].content로 사용하면 된다.
 */
export declare function buildSajuPrompt(saju: SajuJson, productType: ProductType): BuiltPrompt;
