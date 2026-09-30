import type { CommerceProductType } from "./products";
import { encodePaymentToken, decodePaymentToken } from "./paymentTokenCodec";

/**
 * 지시서 13조: "URL의 단순 파라미터(?paid=true)를 믿고 권한을 부여하지 않는다.
 * 권한은 반드시 서버에서 확인한다."
 *
 * 결제 승인이 끝나면 서버가 이 서명된 entitlement 토큰을 발급한다. 이후
 * "이 사용자가 이 resultId에 대해 이 상품을 결제했는지"는 이 토큰의 서명
 * 검증만으로 확인한다 - 브라우저가 URL이나 요청 바디에 어떤 값을 실어 보내든
 * 서버 비밀키로 서명되지 않은 토큰은 절대 통과할 수 없다.
 */
export interface EntitlementPayload {
  resultId: string;
  productType: CommerceProductType;
  orderId: string;
  paidAt: string;
}

const ENTITLEMENT_TTL_MS = 24 * 60 * 60 * 1000; // 결제 후 24시간 동안 결과 재조회 허용

export function issueEntitlement(payload: EntitlementPayload): string {
  return encodePaymentToken(payload, ENTITLEMENT_TTL_MS);
}

export function verifyEntitlement(token: string): EntitlementPayload | null {
  return decodePaymentToken<EntitlementPayload>(token);
}
