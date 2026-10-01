import { TwelveStageName } from "./rules/twelveStageTables";
import type { FourPillars } from "./types";
import type { PillarPosition } from "./elements";
export interface TwelveStagesResult {
    dayMaster: {
        stem: string;
        polarity: "양" | "음";
    };
    /** 연지/월지/일지/시지 각각에 대한 12운성. 시주 미입력 시 hour는 생략. */
    stages: Partial<Record<PillarPosition, TwelveStageName>>;
}
/**
 * Phase 1에서 계산된 4기둥을 받아, 일간을 기준으로 연지·월지·일지·시지 각각의
 * 12운성을 계산한다. LLM을 호출하지 않는다 (Phase 2 원칙 1).
 */
export declare function calculateTwelveStages(pillars: FourPillars): TwelveStagesResult;
