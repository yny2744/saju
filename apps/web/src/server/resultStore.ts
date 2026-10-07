import { randomUUID, createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import type { AnalyzeResultResponse } from "./types";

/**
 * Phase 4 최종 수정 지시서 3조/4조 반영.
 *
 * 문제: 기존 in-memory Map 기반 저장은 "POST /api/saju/analyze를 처리한 서버
 * 인스턴스"와 "GET /api/saju/result/[id]로 조회하는 인스턴스"가 서버리스/여러
 * 인스턴스 배포 환경에서는 서로 다를 수 있다. 프로세스 메모리는 인스턴스 간에
 * 공유되지 않으므로, 조회 요청이 다른 인스턴스로 라우팅되면 방금 저장한 결과를
 * 찾지 못하는 문제가 생긴다.
 *
 * 해결 방향: Postgres 등 영구 저장소는 이번 Phase 4 범위 밖(13조)이므로, 서버가
 * 결과를 "들고 있지" 않고, 조회에 필요한 데이터 전체를 id(토큰) 자체에 담아
 * 클라이언트에 돌려주는 완전 무상태(stateless) 방식을 기본값으로 채택한다.
 *
 *   - AES-256-GCM으로 { 결과, 만료시각 }을 암호화해서 id로 발급한다.
 *     서명(HMAC)만 하지 않고 "암호화"를 쓰는 이유: 이 id는 `/result?id=...`처럼
 *     URL 쿼리파라미터에 그대로 실린다. 서명만 하면 base64로 인코딩된 원문이
 *     그대로 노출되어, URL만 보고도 닉네임/사주 원국 등 개인정보 관련 계산결과를
 *     읽어낼 수 있다(3조 위반). 암호화하면 서버의 비밀키 없이는 내용을 읽을 수 없다.
 *   - GCM 인증 태그가 위변조 탐지를 겸하므로 별도 서명이 필요 없다.
 *   - 토큰이 데이터를 직접 담고 있으므로, 같은 RESULT_TOKEN_SECRET을 공유하는
 *     어떤 인스턴스에서 발급되었든 다른 어떤 인스턴스에서도 그대로 복호화할 수
 *     있다 - 프로세스 메모리 공유가 필요 없다.
 *
 * ResultStore 인터페이스로 분리해두었기 때문에, 향후 Postgres로 옮길 때는
 * `save(id 발급 + INSERT)` / `get(SELECT)`만 구현하는 새 클래스를 추가하고
 * getResultStore()의 반환값만 바꾸면 된다 - analyzeSaju.ts/requestHandlers.ts는
 * ResultStore 인터페이스에만 의존하므로 수정할 필요가 없다.
 *
 * 알려진 한계 (최종 보고서에도 동일하게 명시):
 *   - "1회용 토큰"이 아니라 "TTL(30분) 안에서는 재사용 가능한 토큰"이다. 진짜
 *     1회성 소모나 서버 측 강제 폐기(revocation)가 필요해지면 결국 서버 측에
 *     최소한의 상태(예: 사용된 토큰의 jti 목록)를 둬야 하고, 이는 Postgres/Redis
 *     도입 시점에 함께 구현하는 것을 권장한다.
 *   - 토큰 크기가 결과 데이터 크기에 비례해서 커진다(AI 해석 전체가 토큰 안에
 *     들어있음). 브라우저/서버의 URL 길이 제한을 넘길 정도로 해석 결과가 길어지면
 *     문제가 될 수 있으므로, 실제 운영 규모에서는 Postgres 등으로 옮기는 것을 권장한다.
 */

export interface ResultStore {
  save(value: AnalyzeResultResponse): { id: string; expiresAt: string };
  get(id: string): AnalyzeResultResponse | null;
}

// 2026-10-06: 30분 → 24시간. 무료 결과를 본 뒤 카카오 가입·990원 사주보기로 넘어가는 동안 결과가 사라지지 않게.
const TTL_MS = 24 * 60 * 60 * 1000;
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // GCM 표준 IV 길이(byte)
const DEV_ONLY_FALLBACK_SECRET = "dev-only-insecure-default-result-token-secret";

interface TokenPayload {
  v: AnalyzeResultResponse;
  exp: number;
}

/** RESULT_TOKEN_SECRET(임의 길이 문자열)을 AES-256에 필요한 32바이트 키로 정규화한다. */
function resolveEncryptionKey(): Buffer {
  const secret = process.env.RESULT_TOKEN_SECRET;

  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      // 8조와 같은 원칙: 운영 환경에서 비밀키 없이 조용히 넘어가지 않는다.
      throw new Error(
        "RESULT_TOKEN_SECRET 환경변수가 설정되지 않았습니다. 운영 환경에서는 필수입니다."
      );
    }
    // 로컬 개발/테스트 전용 기본값. 프로세스마다 동일한 값이라 인스턴스 간 호환은 되지만,
    // 실제 배포 환경에서는 반드시 별도로 강력한 비밀값을 설정해야 한다.
    // eslint-disable-next-line no-console
    console.warn(
      "[phase4] RESULT_TOKEN_SECRET 미설정 - 로컬 개발용 기본 키를 사용합니다. 운영 환경에서는 반드시 설정하세요."
    );
    return createHash("sha256").update(DEV_ONLY_FALLBACK_SECRET).digest();
  }

  return createHash("sha256").update(secret).digest();
}

/**
 * 결과 데이터 전체를 암호화해서 id 자체에 담는 무상태 저장소.
 * 서버 프로세스 메모리에 어떤 상태도 남기지 않으므로, 여러 인스턴스로 분산된
 * 서버리스 배포 환경에서도 안전하게 동작한다 (3조 핵심 요구사항).
 */
export class StatelessTokenResultStore implements ResultStore {
  save(value: AnalyzeResultResponse): { id: string; expiresAt: string } {
    const expiresAtMs = Date.now() + TTL_MS;
    const payload: TokenPayload = { v: value, exp: expiresAtMs };

    const key = resolveEncryptionKey();
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, key, iv);
    const encrypted = Buffer.concat([cipher.update(JSON.stringify(payload), "utf8"), cipher.final()]);
    const authTag = cipher.getAuthTag();

    const id = [iv, authTag, encrypted].map((buf) => buf.toString("base64url")).join(".");
    return { id, expiresAt: new Date(expiresAtMs).toISOString() };
  }

  get(id: string): AnalyzeResultResponse | null {
    try {
      const [ivPart, tagPart, dataPart] = id.split(".");
      if (!ivPart || !tagPart || !dataPart) return null;

      const key = resolveEncryptionKey();
      const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(ivPart, "base64url"));
      decipher.setAuthTag(Buffer.from(tagPart, "base64url"));
      const decrypted = Buffer.concat([
        decipher.update(Buffer.from(dataPart, "base64url")),
        decipher.final(),
      ]);

      const payload = JSON.parse(decrypted.toString("utf8")) as TokenPayload;
      if (Date.now() > payload.exp) return null; // 만료된 토큰

      return payload.v;
    } catch {
      // 변조되었거나, 형식이 다르거나, 다른 비밀키로 만들어진 토큰이면 조회 실패로 처리한다.
      // (지시서 4조: 위조 시도가 서버 오류로 새어나가지 않고 "결과 없음"으로만 보인다)
      return null;
    }
  }
}

/**
 * 단일 프로세스 로컬 개발/테스트 편의를 위한 인메모리 구현체.
 * ⚠️ 여러 인스턴스(서버리스 등) 환경에서는 인스턴스마다 별도 메모리를 쓰므로
 * 사용하지 않는다 - getResultStore()의 기본 선택지는 항상 StatelessTokenResultStore다.
 * ResultStore 인터페이스를 그대로 구현하므로, Postgres 등으로 교체할 때 참고할
 * 최소 예시로도 남겨둔다.
 */
export class InMemoryResultStore implements ResultStore {
  private readonly entries = new Map<string, { value: AnalyzeResultResponse; expiresAt: number }>();

  private purgeExpired(): void {
    const now = Date.now();
    for (const [id, entry] of this.entries) {
      if (entry.expiresAt <= now) {
        this.entries.delete(id);
      }
    }
  }

  save(value: AnalyzeResultResponse): { id: string; expiresAt: string } {
    this.purgeExpired();
    const id = randomUUID();
    const expiresAtMs = Date.now() + TTL_MS;
    this.entries.set(id, { value, expiresAt: expiresAtMs });
    return { id, expiresAt: new Date(expiresAtMs).toISOString() };
  }

  get(id: string): AnalyzeResultResponse | null {
    this.purgeExpired();
    const entry = this.entries.get(id);
    return entry ? entry.value : null;
  }
}

let defaultStore: ResultStore | null = null;

/** 실제 서비스 코드(analyzeSaju.ts, requestHandlers.ts)는 이 함수를 통해서만 저장소에 접근한다. */
export function getResultStore(): ResultStore {
  if (!defaultStore) {
    defaultStore = new StatelessTokenResultStore();
  }
  return defaultStore;
}

/** 기존 호출부와의 호환을 위한 함수형 API. 내부적으로 getResultStore()를 사용한다. */
export function saveResult(value: AnalyzeResultResponse): { id: string; expiresAt: string } {
  return getResultStore().save(value);
}

export function getResult(id: string): AnalyzeResultResponse | null {
  return getResultStore().get(id);
}
