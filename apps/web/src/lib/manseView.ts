import type { SajuJson } from "saju-engine";
import { STEM_POLARITY, BRANCH_POLARITY } from "saju-engine/dist/src/rules/tenGodTables";
import { BRANCH_HANJA, STEM_HANJA, type ElementKo } from "@/lib/pillarView";

/**
 * 무료 만세력 화면용 데이터 변환. 새로 계산하는 사주 값은 없다 - 엔진이 낸 오행 점수, 합충형파해,
 * 대운을 화면 모양으로 바꾸고, 음양은 엔진의 음양표(STEM_POLARITY/BRANCH_POLARITY)로 8글자를 센다.
 */

export const ELEMENTS: ElementKo[] = ["목", "화", "토", "금", "수"];
export const ELEMENT_HANJA: Record<ElementKo, string> = { 목: "木", 화: "火", 토: "土", 금: "金", 수: "水" };
export const ELEMENT_NATURE: Record<ElementKo, string> = { 목: "나무", 화: "불", 토: "흙", 금: "쇠", 수: "물" };

const POS_LABEL: Record<string, string> = { year: "년", month: "월", day: "일", hour: "시" };

/** 받침 여부로 이/가 고르기 */
export function iGa(word: string): string {
  const c = word.charCodeAt(word.length - 1);
  return c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 !== 0 ? "이" : "가";
}

export interface ElementShare {
  element: ElementKo;
  score: number;
  percent: number;
}

/** 엔진 오행 점수(천간·지지·지장간 가중) → 비율 */
export function elementShares(saju: SajuJson): ElementShare[] {
  const counts = saju.elements.summary.counts as Record<ElementKo, number>;
  const total = ELEMENTS.reduce((s, e) => s + counts[e], 0) || 1;
  return ELEMENTS.map((element) => ({
    element,
    score: counts[element],
    percent: Math.round((counts[element] / total) * 100),
  }));
}

/** 원국 겉글자(천간·지지)의 음양 개수 */
export function yinYangCount(saju: SajuJson): { yang: number; yin: number } {
  let yang = 0;
  let yin = 0;
  for (const key of ["year", "month", "day", "hour"] as const) {
    const p = saju.pillars[key];
    if (!p) continue;
    for (const pol of [STEM_POLARITY[p.heavenlyStem], BRANCH_POLARITY[p.earthlyBranch]]) {
      if (pol === "양") yang += 1;
      else if (pol === "음") yin += 1;
    }
  }
  return { yang, yin };
}

export interface RelationRow {
  kind: "합" | "충" | "형" | "파" | "해";
  /** 화면 표시용 관계 이름. 예: "육합(土)", "충", "자형" */
  label: string;
  chars: string;
  where: string;
  tone: "good" | "bad";
}

function hanjaOf(ch: string): string {
  return STEM_HANJA[ch] ?? BRANCH_HANJA[ch] ?? ch;
}
function whereOf(positions: string[]): string {
  return positions.map((p) => POS_LABEL[p] ?? p).join("·") + "주";
}

/** 엔진 relations(원국 내부 합충형파해) → 표 행 */
export function relationRows(saju: SajuJson): RelationRow[] {
  const r = saju.relations as {
    combination: Array<{ type: string; positions: string[]; characters: string[]; resultElement: ElementKo | null }>;
    clash: Array<{ positions: string[]; branches: string[] }>;
    punishment: Array<{ type: string; positions: string[]; branches: string[] }>;
    destruction: Array<{ positions: string[]; branches: string[] }>;
    harm: Array<{ positions: string[]; branches: string[] }>;
  };
  const rows: RelationRow[] = [];
  for (const c of r.combination) {
    rows.push({
      kind: "합",
      label: c.resultElement ? `${c.type}(${ELEMENT_HANJA[c.resultElement]})` : c.type,
      chars: c.characters.map(hanjaOf).join("·"),
      where: whereOf(c.positions),
      tone: "good",
    });
  }
  const pairs: Array<[RelationRow["kind"], string, Array<{ positions: string[]; branches: string[]; type?: string }>]> = [
    ["충", "충", r.clash],
    ["형", "형", r.punishment],
    ["파", "파", r.destruction],
    ["해", "해", r.harm],
  ];
  for (const [kind, label, list] of pairs) {
    for (const e of list) {
      rows.push({
        kind,
        label: e.type ? `${label}(${e.type})` : label,
        chars: e.branches.map(hanjaOf).join("·"),
        where: whereOf(e.positions),
        tone: "bad",
      });
    }
  }
  return rows;
}

export interface DaeunCell {
  startAge: number;
  stem: string;
  branch: string;
  current: boolean;
}

/** 엔진 대운 → 타임라인 칸. 현재 대운은 만 나이(오늘 KST 기준)로 표시만 한다. */
export function daeunCells(saju: SajuJson, todayKst: string): DaeunCell[] {
  const periods = (saju.daeun as { periods: Array<{ startAgePrecise: number; startAgeDisplay: number; endAgePrecise: number | null; pillar: { stem: string; branch: string } }> }).periods;
  const age = ageOn(saju.birth.date, todayKst, saju.birth.calendarType);
  return periods.map((p) => ({
    startAge: Math.round(p.startAgeDisplay),
    stem: p.pillar.stem,
    branch: p.pillar.branch,
    current: age !== null && age >= p.startAgePrecise && (p.endAgePrecise === null || age < p.endAgePrecise),
  }));
}

/** 양력 생일일 때만 정확한 만 나이(소수)를 낸다. 음력이면 연도 차로 근사. */
function ageOn(birth: string, today: string, calendarType: string): number | null {
  const [by, bm, bd] = birth.split("-").map(Number);
  const [ty, tm, td] = today.split("-").map(Number);
  if (!by || !ty) return null;
  if (calendarType !== "solar") return ty - by;
  const b = Date.UTC(by, bm - 1, bd);
  const t = Date.UTC(ty, tm - 1, td);
  return (t - b) / (365.2425 * 24 * 3600 * 1000);
}

/** 오늘 KST 날짜(YYYY-MM-DD), offsetDays만큼 이동 */
export function kstDateString(offsetDays = 0): string {
  const d = new Date(Date.now() + 9 * 3600 * 1000 + offsetDays * 24 * 3600 * 1000);
  return d.toISOString().slice(0, 10);
}
