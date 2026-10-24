import { TENANT } from "@/tenants";

/**
 * 전자상거래법상 쇼핑몰 하단에 반드시 노출해야 하는 사업자 정보, 그리고
 * 약관/개인정보처리방침에서 공통으로 참조하는 값들.
 * 2026-10-23 베이직: 값은 고객사 설정(src/tenants/<id>.ts)에 있다 - 여기서는 모양만 맞춰 내보낸다.
 */
export const BUSINESS_INFO = {
  serviceName: TENANT.brand.name,
  ...TENANT.business,
} as const;
