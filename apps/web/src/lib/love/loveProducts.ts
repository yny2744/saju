import { PRICE } from "@/lib/yeopjeon";

/**
 * 크리스마스 연애운 상품 (2026-11-09 유샘 지시서 4·5번, 결제 로직 추가는 유샘 승인).
 *   짧은 궁합 990원 (love_pair): 내 정보는 그대로, 상대만 바꿔 몇 번이든 산다. 엔진만. 내 복주머니에 상대 이름으로 쌓인다.
 *   2027 연애 달력 9,900원: 솔로(love_cal) - 인연이 강한 달과 만날 곳 / 커플(love_cal_pair) - 좋은 달·조심할 달과 지나가는 방법.
 * 결제 personId 자리 = 내 사람 번호, topics = [상대 사람 번호] (커플 상품만).
 * 이 상품은 고객사 설정 prices.LOVE_PAIR · prices.LOVE_CAL 이 있는 곳에서만 판다.
 */
export const LOVE_PAIR = "love_pair";
export const LOVE_CAL = "love_cal";
export const LOVE_CAL_PAIR = "love_cal_pair";
export type LoveMode = typeof LOVE_PAIR | typeof LOVE_CAL | typeof LOVE_CAL_PAIR;
export const LOVE_MODES: LoveMode[] = [LOVE_PAIR, LOVE_CAL, LOVE_CAL_PAIR];
export function isLoveMode(v: unknown): v is LoveMode {
  return v === LOVE_PAIR || v === LOVE_CAL || v === LOVE_CAL_PAIR;
}
/** 상대가 있어야 하는 상품 */
export const lovePairMode = (m: LoveMode): boolean => m !== LOVE_CAL;

export const LOVE_PRODUCT: Record<LoveMode, string> = {
  love_pair: "짧은 궁합",
  love_cal: "2027 연애 달력",
  love_cal_pair: "2027 연애 달력",
};

export function lovePrice(m: LoveMode): number {
  return (m === LOVE_PAIR ? PRICE.LOVE_PAIR : PRICE.LOVE_CAL) ?? 0;
}
/** 이 고객사에서 파는지 */
export function loveOn(): boolean {
  return (PRICE.LOVE_PAIR ?? 0) > 0 && (PRICE.LOVE_CAL ?? 0) > 0;
}

/** 열람 표시 (topic_unlocks.topic): 솔로 달력 "love2027", 커플 달력 "love2027c:<상대 번호>" */
export const loveCalTopic = (partnerId?: string | null): string => (partnerId ? `love2027c:${partnerId}` : "love2027");
