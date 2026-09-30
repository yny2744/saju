import { STEM_POLARITY } from "./rules/tenGodTables";
import {
  STAGE_NAMES,
  BRANCH_INDEX,
  STEM_START_BRANCH,
  isForward,
  TwelveStageName,
} from "./rules/twelveStageTables";
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

function calcStage(startBranch: string, forward: boolean, targetBranch: string): TwelveStageName {
  const startIdx = BRANCH_INDEX[startBranch];
  const targetIdx = BRANCH_INDEX[targetBranch];
  if (startIdx === undefined) throw new Error(`알 수 없는 시작 지지: ${startBranch}`);
  if (targetIdx === undefined) throw new Error(`알 수 없는 대상 지지: ${targetBranch}`);
  const dist = forward ? (targetIdx - startIdx + 12) % 12 : (startIdx - targetIdx + 12) % 12;
  return STAGE_NAMES[dist];
}

/**
 * Phase 1에서 계산된 4기둥을 받아, 일간을 기준으로 연지·월지·일지·시지 각각의
 * 12운성을 계산한다. LLM을 호출하지 않는다 (Phase 2 원칙 1).
 */
export function calculateTwelveStages(pillars: FourPillars): TwelveStagesResult {
  const dayStem = pillars.day.heavenlyStem;
  const polarity = STEM_POLARITY[dayStem];
  if (!polarity) throw new Error(`알 수 없는 일간 천간: ${dayStem}`);

  const startBranch = STEM_START_BRANCH[dayStem];
  if (!startBranch) throw new Error(`12운성 시작점 테이블에 없는 천간: ${dayStem}`);

  const forward = isForward(polarity);

  const stages: Partial<Record<PillarPosition, TwelveStageName>> = {};
  const positions: [PillarPosition, string | null][] = [
    ["year", pillars.year.earthlyBranch],
    ["month", pillars.month.earthlyBranch],
    ["day", pillars.day.earthlyBranch],
    ["hour", pillars.hour ? pillars.hour.earthlyBranch : null],
  ];

  for (const [pos, branch] of positions) {
    if (!branch) continue; // 시주 미입력 케이스
    stages[pos] = calcStage(startBranch, forward, branch);
  }

  return {
    dayMaster: { stem: dayStem, polarity },
    stages,
  };
}
