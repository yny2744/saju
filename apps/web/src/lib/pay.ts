/**
 * 결제 계산 (2026-10-10 수정안 31). 선불 충전은 없다 - 상품 하나를 살 때 가진 엽전을 먼저 쓰고 모자란 만큼만 카드·간편결제로 낸다.
 *   예) 29,500냥 전부 보기 + 무료 엽전 5,000냥 → 엽전 5,000 사용 + 24,500원 결제
 * 카드 결제는 너무 작은 금액이 안 되므로 최소 결제 금액보다 적게 모자라면 엽전을 덜 쓰고 최소 금액을 결제한다.
 */
export const MIN_CARD_AMOUNT = 100;

export function splitPayment(price: number, balance: number): { useYeopjeon: number; cash: number } {
  const useYeopjeon = Math.max(0, Math.min(price, Math.floor(balance)));
  let cash = price - useYeopjeon;
  if (cash > 0 && cash < MIN_CARD_AMOUNT && price >= MIN_CARD_AMOUNT) cash = MIN_CARD_AMOUNT;
  return { useYeopjeon: price - cash, cash };
}

/** 토스페이먼츠 주문번호 규칙: 영문·숫자·-·_ 6~64자 */
export const ORDER_ID_RE = /^[A-Za-z0-9_-]{6,64}$/;

export const PAY_BACK_KEY = "ryugyeol_pay_back";
