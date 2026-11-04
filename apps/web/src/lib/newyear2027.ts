import { PRICE } from "@/lib/yeopjeon";

/**
 * 2027 신년운 (2026-11-03 유샘 지시서) - 링크 대문 /go/newyear2027 의 상품.
 *   무료: 만세력 + 2027 총운 맛보기 (엔진 문장, AI 없음)
 *   990원(가입 선물 엽전으로): 2027 총운 끝까지 (엔진 문장)
 *   9,900원(오픈 특가): 2027 신년운 전체 보기 - 정미년 총운 · 열두 달 · 그해 재물·연애·건강 흐름 (AI, 엔진 값만 근거)
 * 2027년은 엔진이 계산한 그대로 정미(丁未)년 - 연도만 2027로 넘기고 계산 방식은 바꾸지 않는다 (입춘 기준, 인월~축월).
 * 이 상품은 고객사 설정 prices.NEWYEAR 가 있는 곳에서만 판다.
 */

export const NY_YEAR = 2027;

/**
 * 날짜는 여기 한 곳에만 둔다 (2026-11-04 유샘). 둘 다 그날이 끝나는 순간(다음 날 0시, 한국 시각)부터 적용.
 *   NY_SALE_END: 오픈 특가 표시 마감 - 2027-03-01 0시부터 "오픈 특가"·"2월 28일까지" 문구만 지운다. 판매·가격(9,900원)은 그대로.
 *   NY_SELL_END: 판매 종료 - 2028-01-01 0시부터 990원(총운 끝까지)·9,900원(전체 보기) 판매를 막는다. 이미 산 손님은 계속 본다.
 */
export const NY_SALE_END = "2027-02-28";
export const NY_SELL_END = "2027-12-31";

/** 그날 다음 날 0시(한국 시각) */
const nextDayKst = (day: string): number => Date.parse(`${day}T00:00:00+09:00`) + 24 * 3600 * 1000;
/** 오픈 특가 문구를 보여 줄 때인가 */
export function nyPromoOn(now: number = Date.now()): boolean {
  return now < nextDayKst(NY_SALE_END);
}
/** 아직 파는 때인가 */
export function nySellOn(now: number = Date.now()): boolean {
  return now < nextDayKst(NY_SELL_END);
}

/** 구매·열람 표시 (topic_unlocks.topic · 결제 mode 같은 이름) */
export const NY_LIGHT = "ny2027";
export const NY_FULL = "ny2027_full";
export type NyMode = typeof NY_LIGHT | typeof NY_FULL;
export function isNyMode(v: unknown): v is NyMode {
  return v === NY_LIGHT || v === NY_FULL;
}

/** 이 고객사에서 파는지 */
export function nyOn(): boolean {
  return typeof PRICE.NEWYEAR === "number" && PRICE.NEWYEAR > 0;
}

/** 총운 끝까지 (가입 선물 엽전 990) */
export const nyLightPrice = (): number => PRICE.BASIC;
/** 전체 보기 오픈 특가 */
export const nyFullPrice = (): number => PRICE.NEWYEAR ?? 0;

const won = (n: number) => `${n.toLocaleString("ko-KR")}원`;
const saleDay = () => {
  const [, m, d] = NY_SALE_END.split("-").map(Number);
  return `${m}월 ${d}일까지`;
};

/** "2027 신년운 오픈 특가 9,900원 · 2월 28일까지" (지시서 문구 그대로, 줄 그은 정가·할인율 없음) - 특가 표시가 끝나면 null (문구를 지운다) */
export function nySaleLine(price: number = nyFullPrice(), now: number = Date.now()): string | null {
  return nyPromoOn(now) ? `${NY_YEAR} 신년운 오픈 특가 ${won(price)} · ${saleDay()}` : null;
}

/** 이미 선물을 쓴 손님의 단추: 특가 동안 "2027 신년운 전체 보기 · 오픈 특가 9,900원", 그 뒤 "2027 신년운 9,900원" (2026-11-04 유샘) */
export function nyFullButton(price: number = nyFullPrice(), now: number = Date.now()): string {
  return nyPromoOn(now) ? `${NY_YEAR} 신년운 전체 보기 · 오픈 특가 ${won(price)}` : `${NY_YEAR} 신년운 ${won(price)}`;
}

/** 선물을 아직 안 쓴 손님의 단추 (지시서 문구 그대로) */
export const NY_GIFT_BUTTON = "로그인하고 선물 엽전으로 총운 끝까지 보기";

/** 결제 창·이용내역 상품 이름 */
export const NY_PRODUCT = { [NY_LIGHT]: `${NY_YEAR} 신년운 총운`, [NY_FULL]: `${NY_YEAR} 신년운 전체 보기` } as const;
