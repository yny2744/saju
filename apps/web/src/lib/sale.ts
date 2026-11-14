import { TENANT } from "@/tenants";

/** 판매 잠금 (2026-11-12 유샘) - 고객사 설정 saleOnly 가 있으면 거기 적힌 것만 판다 */
export function isOnSale(kind: string): boolean {
  const only = TENANT.saleOnly;
  return !only || only.includes(kind);
}

/**
 * 재미관 사주 겹쳐 보기 판매 (2026-11-14 유샘) - "overlay" 가 있으면 전부, "overlay:<관>" 이면 그 관만.
 *   (수능 기간: MBTI·수비학·별자리·혈액형·탄생화·탄생석은 열고 타로는 수능 뒤에)
 */
export function isOverlayOnSale(kind: string): boolean {
  return isOnSale("overlay") || isOnSale(`overlay:${kind}`);
}

export const SALE_CLOSED_MESSAGE = "곧 열려요. 지금은 준비 중이에요.";
