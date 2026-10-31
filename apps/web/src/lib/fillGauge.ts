import type { SajuJson } from "saju-engine";
import type { ElementKo } from "@/lib/pillarView";
import { ELEMENT_HANJA, ELEMENT_NATURE } from "@/lib/manseView";

/**
 * "남은 작은 빈자리" 게이지 (2026-10-31 유샘) - 사이트 전체의 표식.
 *   일곱 칸 중 여섯 칸은 금빛으로 차오르고, 마지막 칸은 절반쯤만 찬다. 빈 곳은 그 손님에게 필요한 기운의 색으로 숨 쉬듯 깜빡인다.
 *   "한 칸이 통째로 비었다"가 아니라 "작은 틈 하나만 채우면 된다"는 느낌.
 * 빈 곳 크기: 40~60% 사이에서 손님마다 다르다. 무작위가 아니라 사주 여덟 글자(생년월일·시)로 정한다 -
 *   같은 사람이 다시 보거나 부모님이 같은 사주로 봐도 늘 같은 크기라, 볼 때마다 바뀌어 미덥지 않은 일이 없다.
 * 말투: "부족한 기운"·"마지막 한 칸" 대신 "남은 작은 빈자리" (결핍·탓이 아니라 거의 다 찼다는 희망).
 */

export const FILL_GAP_MIN = 40;
export const FILL_GAP_MAX = 60;

/** 빈 곳 깜빡임 색 (2026-10-31 유샘: 불 붉은 주황, 물 푸른빛, 나무 푸른 초록, 흙 황토빛 노랑, 쇠 은백색) */
export const FILL_COLOR: Record<ElementKo, string> = {
  목: "#2e9a6e",
  화: "#e4602f",
  토: "#d4a02c",
  금: "#dfe3e8",
  수: "#3d8fd8",
};

/** 밝은 바탕용 - 은백·황토가 금빛 칸과 섞여 보이지 않게 조금 짙게 */
export const FILL_COLOR_ON_LIGHT: Record<ElementKo, string> = {
  목: "#23845c",
  화: "#d9531f",
  토: "#a8711a",
  금: "#7f8b98",
  수: "#2f7cc4",
};

/** 문자열 → 32비트 해시 (FNV-1a) - 같은 글자면 어느 기기에서나 같은 값 */
export function hash32(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** 여덟 글자(시주를 모르면 여섯 글자)로 정하는 빈 곳 크기 40~60 (%) */
export function fillGapFromKey(key: string): number {
  return FILL_GAP_MIN + (hash32(key) % (FILL_GAP_MAX - FILL_GAP_MIN + 1));
}

export function fillGapPercent(saju: SajuJson): number {
  const p = saju.pillars;
  return fillGapFromKey([p.year.ganzhi, p.month.ganzhi, p.day.ganzhi, p.hour?.ganzhi ?? "-"].join("|"));
}

/** "불(火)" · 여러 기운이면 "불(火)·물(水)" */
export function fillNames(elements: ElementKo[]): string {
  return elements.map((el) => `${ELEMENT_NATURE[el]}(${ELEMENT_HANJA[el]})`).join("·");
}

/** 게이지 아래 한 줄 (2026-10-31 유샘이 고른 2번 문구) */
export function fillLine(elements: ElementKo[]): string {
  return `남은 작은 빈자리는 ${fillNames(elements)}의 기운으로 채워요`;
}
