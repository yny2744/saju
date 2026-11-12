import { TENANT } from "@/tenants";

/** 판매 잠금 (2026-11-12 유샘) - 고객사 설정 saleOnly 가 있으면 거기 적힌 것만 판다 */
export function isOnSale(kind: string): boolean {
  const only = TENANT.saleOnly;
  return !only || only.includes(kind);
}

export const SALE_CLOSED_MESSAGE = "곧 열려요. 지금은 준비 중이에요.";
