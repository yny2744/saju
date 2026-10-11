import type { SajuJson } from "saju-engine";
import { determineTenGod, STEM_POLARITY, type TenGodName } from "saju-engine/dist/src/rules/tenGodTables";
import { STEM_ELEMENT } from "saju-engine/dist/src/rules/fiveElementTables";
import { BRANCH_HANJA, STEM_HANJA, buildPillarColumns, type ElementKo } from "@/lib/pillarView";
import { ELEMENT_HANJA, ageOn, elementShares, kstDateString, relationRows, type RelationRow } from "@/lib/manseView";
import { neededEnergy } from "@/lib/neededEnergy";
import { buildTenGodDistribution } from "@/lib/tenGodDistribution";
import { groupShares, type TenGodGroup } from "@/lib/journey";

/**
 * "확정 사실" 정리 (2026-10-10 수정안 30·33).
 *
 * 엔진이 계산한 값만 모아 판정까지 끝낸 형태로 만든다. 새로 계산하는 사주 값은 없다 -
 * 대운·세운 천간의 십신만 엔진의 십신 판정 함수(determineTenGod)로 같은 규칙에 따라 붙인다.
 *  - 990냥 운세 보기: 이 사실로 문장 창고(basicLibrary)에서 문단을 고른다 (AI 없음)
 *  - 4,900냥 깊게 보기: 이 사실을 문장 목록으로 AI에 넘기고 "목록에 있는 근거만 쓰라"고 묶는다
 */

export const TEN_GOD_GROUP: Record<TenGodName, TenGodGroup> = {
  비견: "비겁",
  겁재: "비겁",
  식신: "식상",
  상관: "식상",
  편재: "재성",
  정재: "재성",
  편관: "관성",
  정관: "관성",
  편인: "인성",
  정인: "인성",
};

const POS_KO: Record<string, string> = { year: "태어난 해(년주)", month: "태어난 달(월주)", day: "태어난 날(일주)", hour: "태어난 시(시주)" };

export interface DaeunFact {
  ganzhi: string;
  hanja: string;
  tenGod: TenGodName;
  group: TenGodGroup;
  startAge: number;
  endAge: number | null;
}

export interface SajuFacts {
  dayStem: string;
  dayStemHanja: string;
  dayElement: ElementKo;
  /** 일지 12운성 */
  dayBranchStage: string | null;
  /** 십신 묶음 비율 (높은 순) */
  groups: Array<{ group: TenGodGroup; percent: number }>;
  strongest: TenGodGroup;
  weakestGroup: TenGodGroup;
  elementPercents: Array<{ element: ElementKo; percent: number }>;
  /** 부족한 기운 (비어 있으면 lacking, 아니면 가장 약한 것) */
  needed: { elements: ElementKo[]; reason: "lacking" | "weakest" };
  relations: RelationRow[];
  age: number | null;
  currentDaeun: DaeunFact | null;
  nextDaeun: DaeunFact | null;
  daeunList: DaeunFact[];
  seun: { year: number; ganzhi: string; hanja: string; tenGod: TenGodName; group: TenGodGroup };
  timeUnknown: boolean;
  /** 원국 여덟 글자와 각 글자의 십신 (시·일·월·년 순) */
  pillarLine: string;
}

function tenGodOfStem(dayStem: string, other: string): TenGodName {
  return determineTenGod(STEM_ELEMENT[dayStem], STEM_POLARITY[dayStem], STEM_ELEMENT[other], STEM_POLARITY[other]);
}

export function sajuFacts(saju: SajuJson, today: string = kstDateString()): SajuFacts {
  const dayStem = saju.pillars.day.heavenlyStem;
  const dayElement = STEM_ELEMENT[dayStem] as ElementKo;
  const groups = groupShares(buildTenGodDistribution(saju));
  const periods = (saju.daeun as { periods: Array<{ startAgePrecise: number; startAgeDisplay: number; endAgePrecise: number | null; pillar: { stem: string; branch: string } }> }).periods;
  const age = ageOn(saju.birth.date, today, saju.birth.calendarType);
  const daeunList: DaeunFact[] = periods.map((p) => {
    const tg = tenGodOfStem(dayStem, p.pillar.stem);
    return {
      ganzhi: `${p.pillar.stem}${p.pillar.branch}`,
      hanja: `${STEM_HANJA[p.pillar.stem]}${BRANCH_HANJA[p.pillar.branch]}`,
      tenGod: tg,
      group: TEN_GOD_GROUP[tg],
      startAge: Math.round(p.startAgeDisplay),
      endAge: p.endAgePrecise === null ? null : Math.round(p.endAgePrecise),
    };
  });
  let curIdx = -1;
  if (age !== null) curIdx = periods.findIndex((p) => age >= p.startAgePrecise && (p.endAgePrecise === null || age < p.endAgePrecise));
  const seun = saju.seun as { year: number; pillar: { heavenlyStem?: string; earthlyBranch?: string; stem?: string; branch?: string; ganzhi?: string }; tenGod: TenGodName };
  const sStem = seun.pillar.heavenlyStem ?? seun.pillar.stem ?? "";
  const sBranch = seun.pillar.earthlyBranch ?? seun.pillar.branch ?? "";
  return {
    dayStem,
    dayStemHanja: STEM_HANJA[dayStem],
    dayElement,
    dayBranchStage: (saju.twelveStages.stages as Record<string, string | undefined>).day ?? null,
    groups,
    strongest: groups[0].group,
    weakestGroup: groups[groups.length - 1].group,
    elementPercents: elementShares(saju).map((e) => ({ element: e.element, percent: e.percent })),
    needed: neededEnergy(saju),
    relations: relationRows(saju),
    age: age === null ? null : Math.floor(age),
    currentDaeun: curIdx >= 0 ? daeunList[curIdx] : null,
    nextDaeun: curIdx >= 0 && curIdx + 1 < daeunList.length ? daeunList[curIdx + 1] : null,
    daeunList,
    seun: {
      year: seun.year,
      ganzhi: seun.pillar.ganzhi ?? `${sStem}${sBranch}`,
      hanja: `${STEM_HANJA[sStem] ?? ""}${BRANCH_HANJA[sBranch] ?? ""}`,
      tenGod: seun.tenGod,
      group: TEN_GOD_GROUP[seun.tenGod],
    },
    timeUnknown: Boolean((saju.daeun as { timeUnknownWarning?: boolean }).timeUnknownWarning),
    pillarLine: buildPillarColumns(saju)
      .map((c) => (c.empty ? `${c.label} 모름` : `${c.label} ${c.stem!.hanja}${c.branch!.hanja}(${c.stem!.tenGod}/${c.branch!.tenGod})`))
      .join(" · "),
  };
}

/** 깊게 보기 AI에 넘기는 "확정 사실 목록" - AI는 이 목록에 있는 근거만 쓴다 (수정안 30) */
export function factsForPrompt(f: SajuFacts): string {
  const lines: string[] = [];
  lines.push(`- 원국 여덟 글자(천간 십신/지지 십신): ${f.pillarLine}`);
  lines.push(`- 일간(나 자신): ${f.dayStem}(${f.dayStemHanja}) · 오행 ${f.dayElement}(${ELEMENT_HANJA[f.dayElement]})`);
  if (f.dayBranchStage) lines.push(`- 태어난 날 자리(일지)의 12운성: ${f.dayBranchStage}`);
  lines.push(`- 십신 묶음 비율(높은 순): ${f.groups.map((g) => `${g.group} ${g.percent}%`).join(", ")} → 가장 두드러진 기운: ${f.strongest}, 가장 약한 기운: ${f.weakestGroup}`);
  lines.push(`- 오행 비율: ${f.elementPercents.map((e) => `${e.element} ${e.percent}%`).join(", ")}`);
  lines.push(
    `- 부족한 기운: ${f.needed.elements.map((e) => `${e}(${ELEMENT_HANJA[e]})`).join("·")} ${f.needed.reason === "lacking" ? "(원국에 비어 있음)" : "(가장 약함)"}`
  );
  if (f.relations.length === 0) lines.push("- 원국 안의 합·충·형·파·해: 없음");
  for (const r of f.relations) lines.push(`- ${r.label}: ${r.chars} (${r.where})`);
  if (f.currentDaeun) {
    const c = f.currentDaeun;
    lines.push(`- 지금 지나는 대운: ${c.ganzhi}(${c.hanja}) 대운, ${c.startAge}세~${c.endAge ?? ""}세, 대운 천간의 십신 ${c.tenGod}(${c.group})`);
  }
  if (f.nextDaeun) {
    const n = f.nextDaeun;
    lines.push(`- 다음 대운: ${n.ganzhi}(${n.hanja}) 대운, ${n.startAge}세부터, 천간 십신 ${n.tenGod}(${n.group})`);
  }
  lines.push(`- 대운 흐름 전체: ${f.daeunList.map((d) => `${d.startAge}세 ${d.ganzhi}(${d.tenGod})`).join(" → ")}`);
  lines.push(`- ${f.seun.year}년 세운: ${f.seun.ganzhi}(${f.seun.hanja})년, 십신 ${f.seun.tenGod}(${f.seun.group})`);
  if (f.age !== null) lines.push(`- 지금 나이: 만 ${f.age}세`);
  if (f.timeUnknown) lines.push("- 태어난 시간을 몰라 대운 시작 나이는 참고용");
  return lines.join("\n");
}

/** 원국 자리 이름 (화면·문장용) */
export function posKo(pos: string): string {
  return POS_KO[pos] ?? pos;
}
