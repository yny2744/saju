import type { SajuJson } from "saju-engine";
import type { ElementKo } from "@/lib/pillarView";
import { BRANCH_HANJA, STEM_HANJA } from "@/lib/pillarView";
import { ELEMENTS, ELEMENT_HANJA, ELEMENT_NATURE } from "@/lib/manseView";
import { neededEnergy } from "@/lib/neededEnergy";
import { FILL } from "@/lib/basic/common";

/**
 * 나를 채우는 행운 배경화면 (2026-10-14 수정안 12, 990냥 시험판) - 엔진이 재료를 정하고 화면(캔버스)이 그린다. AI 없음.
 * 같은 사주면 늘 같은 그림 (난수 없음, 사주 글자로 무늬 배치를 정한다).
 */

const STEM_EL: Record<string, ElementKo> = { 갑: "목", 을: "목", 병: "화", 정: "화", 무: "토", 기: "토", 경: "금", 신: "금", 임: "수", 계: "수" };
const BRANCH_EL: Record<string, ElementKo> = { 자: "수", 축: "토", 인: "목", 묘: "목", 진: "토", 사: "화", 오: "화", 미: "토", 신: "금", 유: "금", 술: "토", 해: "수" };
const ANIMAL: Record<string, string> = { 자: "쥐", 축: "소", 인: "호랑이", 묘: "토끼", 진: "용", 사: "뱀", 오: "말", 미: "양", 신: "원숭이", 유: "닭", 술: "개", 해: "돼지" };

/** 부족한 기운마다 가운데에 새길 두 번째 글자 (기운을 북돋는 뜻) */
const BLESS: Record<ElementKo, string> = { 목: "榮", 화: "昌", 토: "安", 금: "成", 수: "潤" };

/** 바탕색 (짙은 색 → 옅은 색), 무늬 */
export const WALL_THEME: Record<ElementKo, { deep: string; mid: string; pattern: "wave" | "leaf" | "flame" | "earth" | "metal" }> = {
  목: { deep: "#16352a", mid: "#2f5d43", pattern: "leaf" },
  화: { deep: "#3e1414", mid: "#7a2a24", pattern: "flame" },
  토: { deep: "#3a2c14", mid: "#6b5530", pattern: "earth" },
  금: { deep: "#23252b", mid: "#4a4d55", pattern: "metal" },
  수: { deep: "#0b1428", mid: "#1d3358", pattern: "wave" },
};

export interface WallpaperSpec {
  name: string;
  hanjaName: string | null;
  element: ElementKo;
  second: ElementKo;
  big: string;
  bless: string;
  nature: string;
  pillars: Array<{ label: string; stem: string; branch: string; stemEl: ElementKo | null; branchEl: ElementKo | null }>;
  animal: string;
  animalHanja: string;
  dayStem: string;
  numbers: string;
  direction: string;
  colors: string;
  /** 무늬 배치 씨앗 (사주 글자로 정함) */
  seed: number;
}

export function wallpaperSpec(saju: SajuJson, name: string, hanjaName: string | null): WallpaperSpec {
  const need = neededEnergy(saju).elements;
  const element = need[0];
  const counts = saju.elements.summary.counts as Record<ElementKo, number>;
  const second = ELEMENTS.filter((e) => e !== element).sort((a, b) => counts[a] - counts[b])[0];
  const order = [["시", "hour"], ["일", "day"], ["월", "month"], ["년", "year"]] as const;
  const pillars = order.map(([label, k]) => {
    const p = saju.pillars[k];
    return {
      label,
      stem: p ? STEM_HANJA[p.heavenlyStem as string] ?? "" : "",
      branch: p ? BRANCH_HANJA[p.earthlyBranch as string] ?? "" : "",
      stemEl: p ? STEM_EL[p.heavenlyStem as string] ?? null : null,
      branchEl: p ? BRANCH_EL[p.earthlyBranch as string] ?? null : null,
    };
  });
  const yb = saju.pillars.year.earthlyBranch as string;
  const f = FILL[element];
  const seed = [...pillars.map((p) => p.stem + p.branch).join("")].reduce((s, c) => (s * 31 + c.charCodeAt(0)) % 100003, 7);
  return {
    name,
    hanjaName,
    element,
    second,
    big: ELEMENT_HANJA[element],
    bless: BLESS[element],
    nature: ELEMENT_NATURE[element],
    pillars,
    animal: ANIMAL[yb] ?? "",
    animalHanja: BRANCH_HANJA[yb] ?? "",
    dayStem: STEM_HANJA[saju.pillars.day.heavenlyStem as string] ?? "",
    numbers: f.numbers,
    direction: f.direction,
    colors: f.colors,
    seed,
  };
}
