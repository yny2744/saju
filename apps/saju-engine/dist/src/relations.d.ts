import type { FourPillars } from "./types";
import type { PillarPosition } from "./elements";
import type { Element } from "./rules/fiveElementTables";
export interface CombinationEntry {
    type: "천간합" | "육합" | "삼합" | "반합" | "방합";
    positions: PillarPosition[];
    characters: string[];
    resultElement: Element | null;
}
export interface ClashEntry {
    positions: [PillarPosition, PillarPosition];
    branches: [string, string];
}
export interface PunishmentEntry {
    type: "무은지형" | "지세지형" | "무례지형" | "자형" | "반형";
    positions: PillarPosition[];
    branches: string[];
}
export interface DestructionEntry {
    positions: [PillarPosition, PillarPosition];
    branches: [string, string];
}
export interface HarmEntry {
    positions: [PillarPosition, PillarPosition];
    branches: [string, string];
}
export interface RelationsResult {
    combination: CombinationEntry[];
    clash: ClashEntry[];
    punishment: PunishmentEntry[];
    destruction: DestructionEntry[];
    harm: HarmEntry[];
}
/**
 * Phase 1에서 계산된 4기둥을 받아 합·충·형·파·해를 계산한다.
 * 단순 문자열 검색이 아니라, 각 관계 유형별 규칙 테이블을 순회하며
 * 원국에 실제 존재하는 글자 조합과 대조하는 방식으로 구현했다.
 * LLM을 호출하지 않는다 (Phase 2 원칙 1).
 */
export declare function calculateRelations(pillars: FourPillars): RelationsResult;
