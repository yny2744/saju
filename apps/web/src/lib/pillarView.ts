import type { SajuJson } from "saju-engine";

/**
 * 사주 원국 카드용 데이터 변환. **새로 계산하는 값은 하나도 없다** - 엔진(calculateSaju)이 이미
 * 계산해둔 십신·오행·지장간을 화면에 맞게 모양만 바꾼다. 여기서 추가한 건 한글→한자 표기표뿐이다
 * (천간 10자·지지 12자, 표기 전용).
 */
export type PillarKey = "hour" | "day" | "month" | "year";
export type ElementKo = "목" | "화" | "토" | "금" | "수";

export const STEM_HANJA: Record<string, string> = {
  갑: "甲", 을: "乙", 병: "丙", 정: "丁", 무: "戊", 기: "己", 경: "庚", 신: "辛", 임: "壬", 계: "癸",
};
export const BRANCH_HANJA: Record<string, string> = {
  자: "子", 축: "丑", 인: "寅", 묘: "卯", 진: "辰", 사: "巳", 오: "午", 미: "未", 신: "申", 유: "酉", 술: "戌", 해: "亥",
};

/** 오행(한글) → 기존 디자인 토큰 이름. 색은 globals.css의 --color-element-* 를 그대로 쓴다. */
export const ELEMENT_TOKEN: Record<ElementKo, string> = {
  목: "wood", 화: "fire", 토: "earth", 금: "metal", 수: "water",
};

/** 한국 만세력의 표준 배열: 왼쪽부터 시주·일주·월주·년주 */
const ORDER: ReadonlyArray<{ key: PillarKey; label: string }> = [
  { key: "hour", label: "시주" },
  { key: "day", label: "일주" },
  { key: "month", label: "월주" },
  { key: "year", label: "년주" },
];

export interface PillarColumn {
  key: PillarKey;
  label: string;
  /** 출생 시간을 몰라 비어 있는 기둥(시주) */
  empty: boolean;
  stem?: { hangul: string; hanja: string; element: ElementKo; tenGod: string };
  branch?: { hangul: string; hanja: string; element: ElementKo; tenGod: string };
  /** 지장간 (여기→중기→정기 순, 엔진이 준 순서 그대로). 예: ["정","을","기"] */
  hiddenStems: string[];
  /** 일간 기준 이 지지의 12운성 (엔진 twelveStages 값 그대로) */
  twelveStage?: string;
}

export function buildPillarColumns(saju: SajuJson): PillarColumn[] {
  return ORDER.map(({ key, label }) => {
    const pillar = saju.pillars[key];
    if (!pillar) return { key, label, empty: true, hiddenStems: [] };

    const stemHangul = pillar.heavenlyStem;
    const branchHangul = pillar.earthlyBranch;
    // 일주의 천간은 "나 자신"(일간)이라 십신이 따로 없다 - 엔진도 day를 heavenlyStems에 넣지 않는다.
    const stemTenGod = key === "day" ? "본인" : (saju.tenGods.heavenlyStems as Record<string, string | undefined>)[key] ?? "";
    const branchInfo = (saju.tenGods.earthlyBranches as Record<string, { primary: string } | undefined>)[key];
    const hidden = (saju.elements.hiddenStems as Record<string, Array<{ stem: string }> | undefined>)[key] ?? [];

    return {
      key,
      label,
      empty: false,
      stem: {
        hangul: stemHangul,
        hanja: STEM_HANJA[stemHangul] ?? stemHangul,
        element: (saju.elements.heavenlyStems as Record<string, ElementKo>)[key],
        tenGod: stemTenGod,
      },
      branch: {
        hangul: branchHangul,
        hanja: BRANCH_HANJA[branchHangul] ?? branchHangul,
        element: (saju.elements.earthlyBranches as Record<string, ElementKo>)[key],
        tenGod: branchInfo?.primary ?? "",
      },
      hiddenStems: hidden.map((h) => h.stem),
      twelveStage: (saju.twelveStages.stages as Record<string, string | undefined>)[key],
    };
  });
}
