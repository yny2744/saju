import {
  STEM_ELEMENT,
  BRANCH_ELEMENT,
  HIDDEN_STEMS_TABLE,
  Element,
  HiddenStemEntry,
} from "./rules/fiveElementTables";
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

const ALL_ELEMENTS: Element[] = ["목", "화", "토", "금", "수"];

function getStemElement(stemHangul: string): Element {
  const el = STEM_ELEMENT[stemHangul];
  if (!el) throw new Error(`알 수 없는 천간: ${stemHangul}`);
  return el;
}

function getBranchElement(branchHangul: string): Element {
  const el = BRANCH_ELEMENT[branchHangul];
  if (!el) throw new Error(`알 수 없는 지지: ${branchHangul}`);
  return el;
}

function getHiddenStems(branchHangul: string): HiddenStemEntry[] {
  const entries = HIDDEN_STEMS_TABLE[branchHangul];
  if (!entries) throw new Error(`지장간 테이블에 없는 지지: ${branchHangul}`);
  return entries;
}

/**
 * Phase 1에서 계산된 4기둥(FourPillars)을 받아 오행 구조를 계산한다.
 * 결정론적 계산만 수행하며 LLM을 호출하지 않는다 (Phase 2 원칙 1).
 *
 * 출생시간 미입력(pillars.hour === null)인 경우, 시주 관련 필드는
 * heavenlyStems/earthlyBranches/hiddenStems에서 모두 생략한다 (summary 집계에서도 제외).
 */
export function calculateElements(pillars: FourPillars): ElementsResult {
  const heavenlyStems: Partial<Record<PillarPosition, Element>> = {};
  const earthlyBranches: Partial<Record<PillarPosition, Element>> = {};
  const hiddenStems: Partial<Record<PillarPosition, HiddenStemEntry[]>> = {};

  const counts: Record<Element, number> = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };

  const positions: { pos: PillarPosition; pillar: FourPillars["year"] | null }[] = [
    { pos: "year", pillar: pillars.year },
    { pos: "month", pillar: pillars.month },
    { pos: "day", pillar: pillars.day },
    { pos: "hour", pillar: pillars.hour },
  ];

  for (const { pos, pillar } of positions) {
    if (!pillar) continue; // 시주 미입력 케이스

    const stemEl = getStemElement(pillar.heavenlyStem);
    const branchEl = getBranchElement(pillar.earthlyBranch);
    const hidden = getHiddenStems(pillar.earthlyBranch);

    heavenlyStems[pos] = stemEl;
    earthlyBranches[pos] = branchEl;
    hiddenStems[pos] = hidden;

    // 천간: 1글자 = 1점
    counts[stemEl] += 1;
    // 지지 본기: 1글자 = 1점
    counts[branchEl] += 1;
    // 지장간: weight/30 만큼 가중 반영 (DECISION REQUIRED - 위 타입 주석 참고)
    for (const h of hidden) {
      counts[h.element] += h.weight / 30;
    }
  }

  let dominant: Element = "목";
  let maxCount = -1;
  for (const el of ALL_ELEMENTS) {
    if (counts[el] > maxCount) {
      maxCount = counts[el];
      dominant = el;
    }
  }

  const lacking = ALL_ELEMENTS.filter((el) => counts[el] === 0);

  // 소수점 부동소수 오차 정리 (예: 0.30000000000000004 방지).
  // 주의: 반올림 정밀도를 너무 낮게 잡으면(예: 소수 3자리) 개별 원소 반올림 오차가
  // 누적되어 summary.counts 총합이 8글자 총점(정수)과 미세하게 어긋날 수 있다
  // (실제로 이 문제가 테스트에서 발견되어 정밀도를 6자리로 올려 수정함).
  for (const el of ALL_ELEMENTS) {
    counts[el] = Math.round(counts[el] * 1e6) / 1e6;
  }

  return {
    heavenlyStems,
    earthlyBranches,
    hiddenStems,
    summary: { counts, dominant, lacking },
  };
}
