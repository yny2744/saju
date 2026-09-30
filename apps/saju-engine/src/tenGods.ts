import { STEM_ELEMENT, BRANCH_ELEMENT, HIDDEN_STEMS_TABLE, Element } from "./rules/fiveElementTables";
import { STEM_POLARITY, BRANCH_POLARITY, determineTenGod, TenGodName, Polarity } from "./rules/tenGodTables";
import type { FourPillars, Pillar } from "./types";
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
 * BRANCH_POLARITY는 위에서 이미 tenGodTables로부터 import했다 (branchElementBased 계산에 사용).
 */


function stemInfo(stemHangul: string): { element: Element; polarity: Polarity } {
  const element = STEM_ELEMENT[stemHangul];
  const polarity = STEM_POLARITY[stemHangul];
  if (!element || !polarity) {
    throw new Error(`알 수 없는 천간: ${stemHangul}`);
  }
  return { element, polarity };
}

function calculateBranchTenGod(
  branchHangul: string,
  dayElement: Element,
  dayPolarity: Polarity
): BranchTenGodResult {
  const hidden = HIDDEN_STEMS_TABLE[branchHangul];
  if (!hidden) throw new Error(`지장간 테이블에 없는 지지: ${branchHangul}`);

  const hiddenStemTenGods: HiddenStemTenGod[] = hidden.map((h) => ({
    stem: h.stem,
    tenGod: determineTenGod(dayElement, dayPolarity, h.element, STEM_POLARITY[h.stem]),
    type: h.type,
    weight: h.weight,
  }));

  const primaryEntry = hidden.find((h) => h.type === "정기");
  if (!primaryEntry) {
    throw new Error(`지지 '${branchHangul}'에 정기(正氣) 지장간이 없음 - 데이터 오류`);
  }
  const primary = determineTenGod(dayElement, dayPolarity, primaryEntry.element, STEM_POLARITY[primaryEntry.stem]);

  const branchElement = BRANCH_ELEMENT[branchHangul];
  const branchPolarity = BRANCH_POLARITY[branchHangul];
  const branchElementBased = determineTenGod(dayElement, dayPolarity, branchElement, branchPolarity);

  return { primary, branchElementBased, hiddenStemTenGods };
}

/**
 * Phase 1에서 계산된 4기둥(FourPillars)을 받아 십신 구조를 계산한다.
 * 일간(일주 천간)을 기준으로 연간/월간/시간, 그리고 4개 지지(지장간 포함)의
 * 십신을 결정론적으로 판정한다. LLM을 호출하지 않는다 (Phase 2 원칙 1).
 */
export function calculateTenGods(pillars: FourPillars): TenGodsResult {
  const dayStemHangul = pillars.day.heavenlyStem;
  const { element: dayElement, polarity: dayPolarity } = stemInfo(dayStemHangul);

  const heavenlyStems: Partial<Record<Exclude<PillarPosition, "day">, TenGodName>> = {};
  const earthlyBranches: Partial<Record<PillarPosition, BranchTenGodResult>> = {};

  const stemPositions: { pos: Exclude<PillarPosition, "day">; pillar: Pillar | null }[] = [
    { pos: "year", pillar: pillars.year },
    { pos: "month", pillar: pillars.month },
    { pos: "hour", pillar: pillars.hour },
  ];

  for (const { pos, pillar } of stemPositions) {
    if (!pillar) continue; // 시주 미입력 케이스
    const { element, polarity } = stemInfo(pillar.heavenlyStem);
    heavenlyStems[pos] = determineTenGod(dayElement, dayPolarity, element, polarity);
  }

  const branchPositions: { pos: PillarPosition; pillar: Pillar | null }[] = [
    { pos: "year", pillar: pillars.year },
    { pos: "month", pillar: pillars.month },
    { pos: "day", pillar: pillars.day },
    { pos: "hour", pillar: pillars.hour },
  ];

  for (const { pos, pillar } of branchPositions) {
    if (!pillar) continue;
    earthlyBranches[pos] = calculateBranchTenGod(pillar.earthlyBranch, dayElement, dayPolarity);
  }

  return {
    dayMaster: { stem: dayStemHangul, element: dayElement, polarity: dayPolarity },
    heavenlyStems,
    earthlyBranches,
  };
}
