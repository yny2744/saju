import { calculateTwelveStages } from "saju-engine/dist/src/twelveStages";
import { STEM_ELEMENT, BRANCH_ELEMENT } from "saju-engine/dist/src/rules/fiveElementTables";
import { shiftGanzhi } from "saju-engine/dist/src/rules/ganzhiCycle";
import type { ElementKo } from "@/lib/pillarView";
import { BRANCH_HANJA, STEM_HANJA } from "@/lib/pillarView";

/**
 * 사주 책자용 엔진 값 (수정안 44). 새 명리 규칙은 없다 - 엔진의 12운성 계산·오행표·60갑자 순환을 그대로 쓴다.
 */

export function stemElement(stem: string): ElementKo {
  return STEM_ELEMENT[stem] as ElementKo;
}

export function branchElement(branch: string): ElementKo {
  return BRANCH_ELEMENT[branch] as ElementKo;
}

/** 일간 기준 어느 지지의 12운성 (엔진 calculateTwelveStages를 그대로 부른다) */
export function stageOf(dayStem: string, branch: string): string {
  const p = { heavenlyStem: dayStem, earthlyBranch: branch };
  const r = calculateTwelveStages({ year: p, month: p, day: p, hour: null } as unknown as Parameters<typeof calculateTwelveStages>[0]);
  return r.stages.year ?? "";
}

export interface FillYear {
  year: number;
  ganzhi: string;
  hanja: string;
  /** 천간·지지 중 부족한 기운이 든 자리 */
  where: "천간" | "지지" | "천간·지지";
}

/** 올해부터 n년 동안, 부족한 기운이 저절로 들어오는 해 (세운 간지를 60갑자 순서로 이어 간다) */
export function fillYears(seunYear: number, seunGanzhi: string, need: ElementKo, n = 10): FillYear[] {
  const [s0, b0] = [...seunGanzhi];
  const out: FillYear[] = [];
  for (let k = 0; k < n; k++) {
    const g = shiftGanzhi(s0, b0, k);
    const inStem = stemElement(g.stem) === need;
    const inBranch = branchElement(g.branch) === need;
    if (!inStem && !inBranch) continue;
    out.push({
      year: seunYear + k,
      ganzhi: g.ganzhi,
      hanja: `${STEM_HANJA[g.stem]}${BRANCH_HANJA[g.branch]}`,
      where: inStem && inBranch ? "천간·지지" : inStem ? "천간" : "지지",
    });
  }
  return out;
}
