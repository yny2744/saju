import { Element } from "./fiveElementTables";
/**
 * 합·충·형·파·해 계산용 명리 규칙 테이블.
 * 이 파일은 순수 데이터만 담는다 (계산 로직은 ../relations.ts).
 */
export declare const STEM_COMBINATIONS: Array<{
    pair: [string, string];
    resultElement: Element;
}>;
export declare const BRANCH_LIU_HE: Array<{
    pair: [string, string];
    resultElement: Element | null;
}>;
export declare const BRANCH_SAM_HAP: Array<{
    group: [string, string, string];
    wangji: string;
    resultElement: Element;
}>;
export declare const BRANCH_BANG_HAP: Array<{
    group: [string, string, string];
    resultElement: Element;
}>;
export declare const BRANCH_CHUNG: Array<[string, string]>;
export declare const BRANCH_SAM_HYEONG_GROUPS: Array<{
    group: [string, string, string];
    name: string;
}>;
export declare const BRANCH_JA_MYO_HYEONG: [string, string];
export declare const BRANCH_JA_HYEONG_LIST: string[];
export declare const BRANCH_PA: Array<[string, string]>;
export declare const BRANCH_HAE: Array<[string, string]>;
