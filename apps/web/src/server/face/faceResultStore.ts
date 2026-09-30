import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import type { FaceResultResponse } from "./types";

/**
 * Phase 4의 resultStore.ts(사주)와 Phase 5의 paymentTokenCodec.ts(결제)가 이미
 * 두 번 반복한 것과 같은 "무상태(stateless) 암호화 토큰" 패턴을 관상 도메인에도
 * 적용한다.
 *
 * 코드를 공유 모듈로 추출하지 않고 이 파일을 독립적으로 새로 만든 이유는 이
 * 프로젝트에 이미 명시적으로 남아있는 원칙과 같다(paymentTokenCodec.ts 주석
 * 참고): "기존 파일은 꼭 필요한 최소 수정만, 불필요한 리팩터링 금지." 코드가
 * 조금 중복되지만, 그 대가로 resultStore.ts/paymentTokenCodec.ts는 한 줄도
 * 건드리지 않는다. 비밀키도 별도(FACE_RESULT_TOKEN_SECRET)로 두어, 결제
 * 비밀키를 회전시켜도 관상 결과가 무효화되지 않고, 그 반대도 마찬가지다.
 *
 * 저장되는 값(FaceResultResponse)에는 원본 사진도, 478개 랜드마크 좌표도
 * 없다 - 닉네임과 6개 비율 버킷, 규칙 기반 해석 텍스트뿐이다 (Phase 9 지시서
 * 4조: "정밀 랜드마크 전체를 서버로 전송하지 않는다").
 */
export interface FaceResultStore {
  save(value: FaceResultResponse): { id: string; expiresAt: string };
  get(id: string): FaceResultResponse | null;
}

const TTL_MS = 30 * 60 * 1000; // 사주 resultStore.ts와 동일한 30분 정책
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const DEV_ONLY_FALLBACK_SECRET = "dev-only-insecure-default-face-result-token-secret";

function resolveKey(): Buffer {
  const secret = process.env.FACE_RESULT_TOKEN_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("FACE_RESULT_TOKEN_SECRET 환경변수가 설정되지 않았습니다. 운영 환경에서는 필수입니다.");
    }
    // eslint-disable-next-line no-console
    console.warn(
      "[phase9] FACE_RESULT_TOKEN_SECRET 미설정 - 로컬 개발용 기본 키를 사용합니다. 운영 환경에서는 반드시 설정하세요."
    );
    return createHash("sha256").update(DEV_ONLY_FALLBACK_SECRET).digest();
  }
  return createHash("sha256").update(secret).digest();
}

/** export하는 이유: 테스트(faceResultStore.test.ts)에서 만료 시각을 직접 조작하려면 독립된 인스턴스가 필요하다. */
export class StatelessFaceResultStore implements FaceResultStore {
  save(value: FaceResultResponse): { id: string; expiresAt: string } {
    const expiresAtMs = Date.now() + TTL_MS;
    const payload = JSON.stringify({ v: value, exp: expiresAtMs });

    const key = resolveKey();
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, key, iv);
    const encrypted = Buffer.concat([cipher.update(payload, "utf8"), cipher.final()]);
    const authTag = cipher.getAuthTag();

    const id = [iv, authTag, encrypted].map((b) => b.toString("base64url")).join(".");
    return { id, expiresAt: new Date(expiresAtMs).toISOString() };
  }

  get(id: string): FaceResultResponse | null {
    try {
      const [ivPart, tagPart, dataPart] = id.split(".");
      if (!ivPart || !tagPart || !dataPart) return null;

      const key = resolveKey();
      const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(ivPart, "base64url"));
      decipher.setAuthTag(Buffer.from(tagPart, "base64url"));
      const decrypted = Buffer.concat([decipher.update(Buffer.from(dataPart, "base64url")), decipher.final()]);

      const parsed = JSON.parse(decrypted.toString("utf8")) as { v: FaceResultResponse; exp: number };
      if (Date.now() > parsed.exp) return null;
      return parsed.v;
    } catch {
      return null;
    }
  }
}

let store: FaceResultStore | null = null;

export function getFaceResultStore(): FaceResultStore {
  if (!store) store = new StatelessFaceResultStore();
  return store;
}

export function saveFaceResult(value: FaceResultResponse): { id: string; expiresAt: string } {
  return getFaceResultStore().save(value);
}

export function getFaceResult(id: string): FaceResultResponse | null {
  return getFaceResultStore().get(id);
}
