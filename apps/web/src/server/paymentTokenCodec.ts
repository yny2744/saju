import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

/**
 * Phase 4의 resultStore.ts와 똑같은 "무상태(stateless) 서명/암호화 토큰" 패턴을
 * 결제 도메인에도 적용한다 (주문/결제상태/구매권한을 서버 프로세스 메모리에
 * 의존하는 단순 Map으로 관리하지 않는다 - 지시서 20조).
 *
 * 굳이 resultStore.ts의 암복호화 코드를 공유 모듈로 추출해서 재사용하지 않고
 * 이 파일을 독립적으로 새로 만든 이유: 지시서 25조("기존 Phase 1~4 파일은 꼭
 * 필요한 최소 수정만, 불필요한 리팩터링 금지")를 지키기 위해서다. 코드가 약간
 * 중복되지만, 그 대가로 Phase 4의 resultStore.ts는 단 한 줄도 건드리지 않는다.
 *
 * 결제 토큰에 담기는 데이터(orderId/productType/amount/status)는 개인정보가
 * 아니지만, 위변조 방지(무결성)를 위해 resultStore.ts와 동일하게 AES-256-GCM을
 * 사용한다 - GCM의 인증 태그가 "서명"과 "암호화"를 동시에 제공한다.
 */

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const DEV_ONLY_FALLBACK_SECRET = "dev-only-insecure-default-payment-token-secret";

function resolvePaymentTokenKey(): Buffer {
  const secret = process.env.PAYMENT_TOKEN_SECRET;

  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("PAYMENT_TOKEN_SECRET 환경변수가 설정되지 않았습니다. 운영 환경에서는 필수입니다.");
    }
    // eslint-disable-next-line no-console
    console.warn(
      "[phase5] PAYMENT_TOKEN_SECRET 미설정 - 로컬 개발용 기본 키를 사용합니다. 운영 환경에서는 반드시 설정하세요."
    );
    return createHash("sha256").update(DEV_ONLY_FALLBACK_SECRET).digest();
  }

  return createHash("sha256").update(secret).digest();
}

export function encodePaymentToken<T>(payload: T, ttlMs: number): string {
  const key = resolvePaymentTokenKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const body = JSON.stringify({ v: payload, exp: Date.now() + ttlMs });
  const encrypted = Buffer.concat([cipher.update(body, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [iv, authTag, encrypted].map((buf) => buf.toString("base64url")).join(".");
}

export function decodePaymentToken<T>(token: string): T | null {
  try {
    const [ivPart, tagPart, dataPart] = token.split(".");
    if (!ivPart || !tagPart || !dataPart) return null;

    const key = resolvePaymentTokenKey();
    const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(ivPart, "base64url"));
    decipher.setAuthTag(Buffer.from(tagPart, "base64url"));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(dataPart, "base64url")),
      decipher.final(),
    ]).toString("utf8");

    const parsed = JSON.parse(decrypted) as { v: T; exp: number };
    if (Date.now() > parsed.exp) return null;
    return parsed.v;
  } catch {
    // 위조/변조/만료/형식 오류 - 전부 "유효하지 않은 토큰"으로 취급한다 (내부 사유 비노출).
    return null;
  }
}
