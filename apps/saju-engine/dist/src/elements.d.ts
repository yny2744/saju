import { Element, HiddenStemEntry } from "./rules/fiveElementTables";
import type { FourPillars } from "./types";
export type PillarPosition = "year" | "month" | "day" | "hour";
export interface ElementsResult {
    /** 4기둥 천간 각각의 오행 */
    heavenlyStems: Partial<Record<PillarPosition, Element>>;
    /** 4기둥 지지 각각의 오행 (본기 기준) */
    earthlyBranches: Partial<Record<PillarPosition, Element>>;
    /** 4기둥 지지 각각에 숨어있는 지장간 목록 (여기/중기/정기 + 가중치) */
    hiddenStems: Partial<Record<PillarPosition, HiddenStemEntry[]>>;
    /**
     * 오행 강약 요약.
     *
     * ⚠️ DECISION REQUIRED: 아래 count는 "천간 1글자 = 1점, 지지 본기 1글자 = 1점,
     * 지장간은 (weight/30)점" 방식으로 합산한 것이다. 이는 여러 계산 방식 중 하나이며,
     * 실제로는:
     *   - 지장간을 아예 무시하고 8글자(천간4+지지4) 표면 오행만 세는 유파
     *   - 지장간 중 정기(正氣)만 반영하는 유파
     *   - 지장간 전체(여기/중기/정기)를 가중치대로 반영하는 유파
     *   가 각각 존재한다. 여기서는 "지장간 전체 가중치 반영" 방식을 채택했다.
     *   상용 서비스 적용 전 어느 방식을 기본값으로 할지 확정 필요.
     */
    summary: {
        counts: Record<Element, number>;
        dominant: Element;
        /** 점수가 0인 오행이 있으면 그 오행, 없으면 null. 여러 개면 배열. */
        lacking: Element[];
    };
}
/**
 * Phase 1에서 계산된 4기둥(FourPillars)을 받아 오행 구조를 계산한다.
 * 결정론적 계산만 수행하며 LLM을 호출하지 않는다 (Phase 2 원칙 1).
 *
 * 출생시간 미입력(pillars.hour === null)인 경우, 시주 관련 필드는
 * heavenlyStems/earthlyBranches/hiddenStems에서 모두 생략한다 (summary 집계에서도 제외).
 */
export declare function calculateElements(pillars: FourPillars): ElementsResult;
