import { Element } from "./rules/fiveElementTables";
import { TenGodName, Polarity } from "./rules/tenGodTables";
import type { FourPillars } from "./types";
import type { PillarPosition } from "./elements";
export interface HiddenStemTenGod {
    stem: string;
    tenGod: TenGodName;
    type: "여기" | "중기" | "정기";
    weight: number;
}
export interface BranchTenGodResult {
    /**
     * 지지 자체의 대표 십신.
     * ⚠️ DECISION REQUIRED: "지지의 십신"을 무엇으로 대표할지는 유파에 따라 다르다:
     *   (1) 지지 본기 오행 자체를 하나의 "글자"처럼 취급해서 판정 (지지에는 천간처럼
     *       명확한 음양이 없어, 통상적 지지 음양표(BRANCH_POLARITY)를 사용)
     *   (2) 그 지지의 정기(正氣) 지장간을 대표 천간으로 보고 그 천간 기준으로 판정
     *   여기서는 (2) 정기 지장간 기준을 primary로 채택했다 (실무에서 더 흔히 쓰이는 방식).
     *   방식 (1)의 결과도 참고용으로 함께 계산해 두었다.
     */
    primary: TenGodName;
    /** 지지 본기 오행 자체 + 통상 지지음양표로 판정한 대안적 결과 (참고용) */
    branchElementBased: TenGodName;
    /** 지장간 각각에 대한 십신 (여기/중기/정기 전부) */
    hiddenStemTenGods: HiddenStemTenGod[];
}
export interface TenGodsResult {
    dayMaster: {
        stem: string;
        element: Element;
        polarity: Polarity;
    };
    /** 연간/월간/시간의 십신. 일간 자신은 정의상 십신을 매기지 않는다 (일간이 기준점이므로). */
    heavenlyStems: Partial<Record<Exclude<PillarPosition, "day">, TenGodName>>;
    earthlyBranches: Partial<Record<PillarPosition, BranchTenGodResult>>;
}
/**
 * Phase 1에서 계산된 4기둥(FourPillars)을 받아 십신 구조를 계산한다.
 * 일간(일주 천간)을 기준으로 연간/월간/시간, 그리고 4개 지지(지장간 포함)의
 * 십신을 결정론적으로 판정한다. LLM을 호출하지 않는다 (Phase 2 원칙 1).
 */
export declare function calculateTenGods(pillars: FourPillars): TenGodsResult;
