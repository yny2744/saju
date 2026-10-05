import type { SajuJson } from "saju-engine";
import type { ElementKo } from "@/lib/pillarView";
import { ELEMENTS } from "@/lib/manseView";

/**
 * 무료 만세력 "나에게 필요한 기운" (수정안 1번, AI 없음).
 *
 * 어떤 기운인지: 엔진이 낸 비어 있는 오행(summary.lacking)을 그대로 쓰고, 비어 있는 오행이 없으면
 * 엔진 오행 점수가 가장 낮은 오행 하나를 쓴다. 새로 계산하는 사주 값은 없다.
 * 색·방위·숫자는 전통 오행 배속표(숫자는 하도 河圖 배속), "가까이하면 좋은 것"은 그 배속을 생활 소재로
 * 옮긴 표시용 문구다.
 *
 * ⚠️ 표현 원칙(유샘): 판매·굿즈를 드러내지 않는다. 사용자가 스스로 "이 기운이 나한테 부족하구나"를
 * 느끼게 하는 정보로만 보여준다.
 */

export interface EnergyGuide {
  colors: Array<{ name: string; hex: string }>;
  direction: string;
  numbers: string;
  near: string[];
}

export const ENERGY_GUIDE: Record<ElementKo, EnergyGuide> = {
  목: {
    colors: [
      { name: "초록", hex: "#4f8a5b" },
      { name: "청록", hex: "#3f8f8a" },
    ],
    direction: "동쪽",
    numbers: "3 · 8",
    near: ["초록 식물", "숲길 산책", "나무 소품"],
  },
  화: {
    colors: [
      { name: "빨강", hex: "#c0473d" },
      { name: "분홍", hex: "#d9849a" },
    ],
    direction: "남쪽",
    numbers: "2 · 7",
    near: ["햇볕 쬐기", "따뜻한 조명", "밝은 색 옷"],
  },
  토: {
    colors: [
      { name: "노랑", hex: "#d0a640" },
      { name: "갈색", hex: "#9a7048" },
    ],
    direction: "중앙",
    numbers: "5 · 10",
    near: ["도자기 그릇", "흙길 걷기", "규칙적인 하루"],
  },
  금: {
    colors: [
      { name: "흰색", hex: "#f4f1ea" },
      { name: "은색", hex: "#b7bcc2" },
    ],
    direction: "서쪽",
    numbers: "4 · 9",
    near: ["금속 소품", "정리정돈", "맑은 소리"],
  },
  수: {
    colors: [
      { name: "검정", hex: "#2b2a2e" },
      { name: "남색", hex: "#2f4a74" },
    ],
    direction: "북쪽",
    numbers: "1 · 6",
    near: ["물가 산책", "물 자주 마시기", "충분한 휴식"],
  },
};

export interface NeededEnergy {
  elements: ElementKo[];
  /** lacking = 원국에 비어 있음, weakest = 비어 있진 않지만 가장 약함 */
  reason: "lacking" | "weakest";
}

export function neededEnergy(saju: SajuJson): NeededEnergy {
  const lacking = (saju.elements.summary.lacking as ElementKo[]).filter((e) => ELEMENTS.includes(e));
  if (lacking.length > 0) return { elements: lacking, reason: "lacking" };

  const counts = saju.elements.summary.counts as Record<ElementKo, number>;
  let weakest: ElementKo = ELEMENTS[0];
  for (const e of ELEMENTS) if (counts[e] < counts[weakest]) weakest = e;
  return { elements: [weakest], reason: "weakest" };
}
