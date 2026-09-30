/**
 * Phase 4 최종 수정 지시서 7조 반영.
 *
 * LLM 호출은 비용과 시간이 드는 작업이라, 인증 없이 열려있는 무료 분석 API를
 * 무제한 반복 호출하지 못하도록 IP(또는 clientKey)당 짧은 시간에 허용하는 요청
 * 수를 제한한다.
 *
 * ⚠️ 명시적 한계: 아래 InMemoryRateLimiter는 단일 프로세스 메모리 안에서만
 * 유효한 슬라이딩 윈도우다. 서버리스처럼 요청마다 다른 인스턴스가 뜰 수 있는
 * 환경에서는 인스턴스별로 카운트가 따로 관리되어 "완전한" 방어가 되지 않는다
 * (예: 인스턴스가 5개면 사실상 5배까지 허용될 수 있음). Phase 4 범위에서는
 * Redis 등 새 인프라를 추가하지 않고, 최소 수준의 abuse 방지 수단으로만 사용한다.
 *
 * RateLimiter 인터페이스로 분리해두었으므로, 향후 Redis/KV 기반 구현체로
 * 교체하려면 이 인터페이스만 구현하고 getRateLimiter()의 반환값만 바꾸면 된다.
 */
export interface RateLimiter {
  isRateLimited(clientKey: string): boolean;
}

const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 10;

export class InMemoryRateLimiter implements RateLimiter {
  private readonly hits = new Map<string, number[]>();

  isRateLimited(clientKey: string): boolean {
    const now = Date.now();
    const windowStart = now - WINDOW_MS;
    const timestamps = (this.hits.get(clientKey) ?? []).filter((t) => t > windowStart);

    if (timestamps.length >= MAX_REQUESTS_PER_WINDOW) {
      this.hits.set(clientKey, timestamps);
      return true;
    }

    timestamps.push(now);
    this.hits.set(clientKey, timestamps);
    return false;
  }
}

let defaultLimiter: RateLimiter | null = null;

/** 실제 서비스 코드(requestHandlers.ts)는 이 함수를 통해서만 rate limiter에 접근한다. */
export function getRateLimiter(): RateLimiter {
  if (!defaultLimiter) {
    defaultLimiter = new InMemoryRateLimiter();
  }
  return defaultLimiter;
}

/** 기존 호출부와의 호환을 위한 함수형 API. 내부적으로 getRateLimiter()를 사용한다. */
export function isRateLimited(clientKey: string): boolean {
  return getRateLimiter().isRateLimited(clientKey);
}
