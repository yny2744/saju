/**
 * Fortune Relations - 사용자 사주(4기둥) ↔ 오늘의 일진 사이의 관계 계산.
 *
 * 지시서 7조 배경:
 *   기존 relations.ts의 calculateRelations()는 "하나의 사주 4기둥 내부" 관계
 *   전용으로 설계되어 있다 (PillarPosition이 year/month/day/hour 4개로 고정된
 *   폐쇄적 구조). "사용자 사주 ↔ 오늘 일진"처럼 서로 다른 두 간지 집합 사이의
 *   관계는 이 구조에 억지로 끼워 넣을 수 없으므로 그대로 재사용하지 않는다.
 *
 *   대신 실제 판정 기준(합/충/형/파/해 테이블, 십신 판정 함수, 12운성 판정
 *   로직)은 전부 기존 모듈에서 그대로 import해서 재사용하고, "오늘 vs 사주"라는
 *   새로운 적용 방식만 이 파일에서 구현한다. 판정 테이블을 복제하지 않는다.
 */
import type { FourPillars, Pillar } from "../types";
import type { PillarPosition } from "../elements";
import type { Ganzhi } from "../rules/ganzhiCycle";
import {
  STEM_COMBINATIONS,
  BRANCH_LIU_HE,
  BRANCH_CHUNG,
  BRANCH_PA,
  BRANCH_HAE,
  BRANCH_JA_MYO_HYEONG,
  BRANCH_JA_HYEONG_LIST,
} from "../rules/relationTables";
import { STEM_ELEMENT } from "../rules/fiveElementTables";
import { STEM_POLARITY, determineTenGod, TenGodName } from "../rules/tenGodTables";
import { STAGE_NAMES, BRANCH_INDEX, STEM_START_BRANCH, isForward, TwelveStageName } from "../rules/twelveStageTables";

export interface FortunePillarRelation {
  position: PillarPosition;
  /** 오늘 천간과 이 기둥 천간이 천간합 관계인지 */
  stemCombination: boolean;
  /** 오늘 지지와 이 기둥 지지가 육합 관계인지 */
  branchCombination: boolean;
  /** 충(沖) */
  branchClash: boolean;
  /** 파(破) */
  branchDestruction: boolean;
  /** 해(害) */
  branchHarm: boolean;
  /** 형(刑) - 자묘형 또는 자형만 판정한다 (삼형은 사주 3글자+오늘 1글자 조합이라
   *  "사주 내부 관계"와 "오늘과의 관계"가 섞이는 모호한 영역이라 DECISION REQUIRED로 남긴다) */
  branchPunishment: "무례지형" | "자형" | null;
}

export interface FortuneRelationsResult {
  /** 일간(사용자) 대비 오늘 천간의 십신 - "오늘 나에게 어떤 기운이 들어오는가"의 핵심 지표 */
  tenGodOfDay: TenGodName;
  /** 일간(사용자) 대비 오늘 지지의 12운성 */
  twelveStageOfDay: TwelveStageName;
  /** 오늘 간지와 사주 각 기둥(연/월/일/시) 사이의 관계. 시주 미입력 시 hour는 생략 */
  perPillar: Partial<Record<PillarPosition, FortunePillarRelation>>;
  /**
   * ⚠️ DECISION REQUIRED: 삼형(무은지형/지세지형 등, 지지 3글자로 성립하는 형)과
   * 삼합/방합(지지 3글자 조합)은 "사주 원국의 지지 2글자 + 오늘 지지 1글자"
   * 조합으로도 성립할 수 있는지가 유파별로 쟁점이 다르다. 이번 1차 구현에서는
   * 2글자 관계(육합/충/파/해/자형/자묘형)만 계산하고, 3글자 관계는 서비스
   * 정책 확정 후 별도로 추가한다 (임의로 범위를 확대하지 않는다).
   */
}

function matchesPair(a: string, b: string, table: ReadonlyArray<[string, string]>): boolean {
  return table.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
}

/** 기존 twelveStages.ts의 calcStage와 동일한 로직 - 12운성 판정 테이블만 재사용하고
 *  FourPillars 전체를 순회하는 calculateTwelveStages()는 쓰지 않는다 (오늘 지지 1개만 필요하므로). */
function stageOf(dayStem: string, targetBranch: string): TwelveStageName {
  const polarity = STEM_POLARITY[dayStem];
  const startBranch = STEM_START_BRANCH[dayStem];
  if (!polarity) throw new Error(`알 수 없는 일간 천간: ${dayStem}`);
  if (!startBranch) throw new Error(`12운성 시작점 테이블에 없는 천간: ${dayStem}`);

  const forward = isForward(polarity);
  const startIdx = BRANCH_INDEX[startBranch];
  const targetIdx = BRANCH_INDEX[targetBranch];
  if (startIdx === undefined) throw new Error(`알 수 없는 시작 지지: ${startBranch}`);
  if (targetIdx === undefined) throw new Error(`알 수 없는 지지: ${targetBranch}`);

  const dist = forward ? (targetIdx - startIdx + 12) % 12 : (startIdx - targetIdx + 12) % 12;
  return STAGE_NAMES[dist];
}

export function calculateFortuneRelations(pillars: FourPillars, todayGanzhi: Ganzhi): FortuneRelationsResult {
  const dayStem = pillars.day.heavenlyStem;
  const dayPolarity = STEM_POLARITY[dayStem];
  const dayElement = STEM_ELEMENT[dayStem];
  if (!dayPolarity || !dayElement) throw new Error(`알 수 없는 일간 천간: ${dayStem}`);

  const todayElement = STEM_ELEMENT[todayGanzhi.stem];
  const todayPolarity = STEM_POLARITY[todayGanzhi.stem];
  if (!todayElement || !todayPolarity) throw new Error(`알 수 없는 오늘 천간: ${todayGanzhi.stem}`);

  const tenGodOfDay = determineTenGod(dayElement, dayPolarity, todayElement, todayPolarity);
  const twelveStageOfDay = stageOf(dayStem, todayGanzhi.branch);

  const stemPairs: ReadonlyArray<[string, string]> = STEM_COMBINATIONS.map((c) => c.pair);
  const liuHePairs: ReadonlyArray<[string, string]> = BRANCH_LIU_HE.map((c) => c.pair);

  const entries: Array<[PillarPosition, Pillar | null]> = [
    ["year", pillars.year],
    ["month", pillars.month],
    ["day", pillars.day],
    ["hour", pillars.hour],
  ];

  const perPillar: Partial<Record<PillarPosition, FortunePillarRelation>> = {};
  for (const [pos, pillar] of entries) {
    if (!pillar) continue; // 시주 미입력 케이스 - 기존 twelveStages.ts와 동일한 원칙으로 생략

    const branchPunishment: FortunePillarRelation["branchPunishment"] = matchesPair(
      pillar.earthlyBranch,
      todayGanzhi.branch,
      [BRANCH_JA_MYO_HYEONG]
    )
      ? "무례지형"
      : pillar.earthlyBranch === todayGanzhi.branch && BRANCH_JA_HYEONG_LIST.includes(todayGanzhi.branch)
        ? "자형"
        : null;

    perPillar[pos] = {
      position: pos,
      stemCombination: matchesPair(pillar.heavenlyStem, todayGanzhi.stem, stemPairs),
      branchCombination: matchesPair(pillar.earthlyBranch, todayGanzhi.branch, liuHePairs),
      branchClash: matchesPair(pillar.earthlyBranch, todayGanzhi.branch, BRANCH_CHUNG),
      branchDestruction: matchesPair(pillar.earthlyBranch, todayGanzhi.branch, BRANCH_PA),
      branchHarm: matchesPair(pillar.earthlyBranch, todayGanzhi.branch, BRANCH_HAE),
      branchPunishment,
    };
  }

  return { tenGodOfDay, twelveStageOfDay, perPillar };
}
