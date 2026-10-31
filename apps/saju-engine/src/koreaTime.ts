/**
 * 한국 시계 역사 보정 + 절기 시각 기준 맞추기 (2026-10-31 유샘 승인)
 *
 * 1) 한국 시계의 역사 (사실관계라서 사용자 선택 없이 항상 적용한다 - 진태양시 보정과는 별개 문제)
 *   출생 기록(출생증명·주민등록)의 시각은 "그 시절 한국 시계"로 적혀 있다. 그런데 그 시계가 늘 지금의
 *   KST(UTC+9)였던 것은 아니다.
 *     - 1908.04.01 ~ 1911.12.31: UTC+8:30 (동경 127도30분)
 *     - 1954.03.21 ~ 1961.08.09: UTC+8:30 (동경 127도30분으로 환원)
 *     - 서머타임(시계를 1시간 앞당김): 1948~1951, 1955~1960, 1987~1988 (기간은 아래 표)
 *   예) 1987-07-01 10:30 출생 기록 = 서머타임(UTC+10) 시계 → 지금의 KST로는 09:30.
 *   예) 1958-03-01 10:30 출생 기록 = UTC+8:30 시계 → 지금의 KST로는 11:00.
 *   이 엔진의 다른 계산(시주 경계, 진태양시 보정 135도 기준)은 모두 "지금의 KST" 시각을 전제로 하므로,
 *   기록된 시각을 먼저 KST 기준으로 바꿔 둔다.
 *   표의 출처: IANA 시간대 자료(tzdata) Asia/Seoul - Node.js 내장 ICU 시간대 자료로 뽑아 테스트에서 대조한다.
 *   1908년 이전(표준시 도입 전)은 보정하지 않는다.
 *
 * 2) 절기 시각의 기준 시간대
 *   lunar-javascript는 절기(절입) 시각을 베이징 시간(UTC+8)으로 계산한다 (2026-10-30 직접 실행해 확인:
 *   2024년 입춘을 라이브러리는 02-04 16:26:53으로 주는데, 한국천문연구원 기준 KST는 17:27).
 *   그래서 연주·월주(절기로 정해지는 기둥)는 KST 시각에서 60분 뺀 "베이징 시각"으로 판정해야
 *   한국에서 실제 절입 순간과 같은 기준이 된다. 일주·시주는 출생지의 시계(날짜·시각)로 정하므로 그대로 둔다.
 */

/** 지금의 한국 표준시 (UTC+9) */
export const KST_OFFSET_MINUTES = 540;

/** lunar-javascript가 절기 시각을 계산하는 시간대 (베이징 시간, UTC+8) */
export const SOLAR_TERM_LIBRARY_OFFSET_MINUTES = 480;

/**
 * 서울 시계의 UTC 기준 변경 시점 표 [이 순간(UTC)부터, 이 UTC 오프셋(분)].
 * 첫 줄 이전은 KST_OFFSET_MINUTES 로 본다 (표준시 도입 전은 보정하지 않음).
 */
const SEOUL_OFFSET_TRANSITIONS: ReadonlyArray<readonly [string, number]> = [
  ["1908-03-31T15:30:00Z", 510],
  ["1911-12-31T15:30:00Z", 540],
  ["1948-05-31T15:00:00Z", 600],
  ["1948-09-12T14:00:00Z", 540],
  ["1949-04-02T15:00:00Z", 600],
  ["1949-09-10T14:00:00Z", 540],
  ["1950-03-31T15:00:00Z", 600],
  ["1950-09-09T14:00:00Z", 540],
  ["1951-05-05T15:00:00Z", 600],
  ["1951-09-08T14:00:00Z", 540],
  ["1954-03-20T15:00:00Z", 510],
  ["1955-05-04T15:30:00Z", 570],
  ["1955-09-08T14:30:00Z", 510],
  ["1956-05-19T15:30:00Z", 570],
  ["1956-09-29T14:30:00Z", 510],
  ["1957-05-04T15:30:00Z", 570],
  ["1957-09-21T14:30:00Z", 510],
  ["1958-05-03T15:30:00Z", 570],
  ["1958-09-20T14:30:00Z", 510],
  ["1959-05-02T15:30:00Z", 570],
  ["1959-09-19T14:30:00Z", 510],
  ["1960-04-30T15:30:00Z", 570],
  ["1960-09-17T14:30:00Z", 510],
  ["1961-08-09T15:30:00Z", 540],
  ["1987-05-09T17:00:00Z", 600],
  ["1987-10-10T17:00:00Z", 540],
  ["1988-05-07T17:00:00Z", 600],
  ["1988-10-08T17:00:00Z", 540],
];

const TRANSITIONS_MS = SEOUL_OFFSET_TRANSITIONS.map(([iso, offset]) => [Date.parse(iso), offset] as const);

/** 어떤 순간(UTC ms)에 서울 시계가 쓰던 UTC 오프셋(분) */
export function seoulOffsetAtUtc(utcMs: number): number {
  let offset = KST_OFFSET_MINUTES;
  for (const [startMs, o] of TRANSITIONS_MS) {
    if (utcMs < startMs) break;
    offset = o;
  }
  return offset;
}

export type KoreanClockReason = "summer_time" | "utc_plus_8_30" | "summer_time_utc_plus_8_30";

export interface KoreanClockResolution {
  /** 기록된 시각에 더하면 지금의 KST 시각이 되는 분 (0이면 보정 없음) */
  correctionMinutes: number;
  /** 그 시절 서울 시계의 UTC 오프셋(분) */
  offsetMinutes: number;
  reason: KoreanClockReason | null;
  /**
   * 서머타임이 끝나며 시계를 되돌린 1시간처럼 같은 시각이 두 번 있었던 경우 true.
   * 이때는 서머타임 쪽(먼저 온 시각)으로 본다.
   */
  ambiguous: boolean;
  /**
   * 서머타임이 시작되며 시계를 앞당겨 실제로는 없었던 시각인 경우 true.
   * 이때는 서머타임 쪽 오프셋으로 본다.
   */
  nonexistent: boolean;
}

function reasonOf(offset: number): KoreanClockReason | null {
  if (offset === 600) return "summer_time";
  if (offset === 510) return "utc_plus_8_30";
  if (offset === 570) return "summer_time_utc_plus_8_30";
  return null;
}

/**
 * 기록된 서울 시계(양력 연월일시)를 지금의 KST 기준으로 바꾸는 데 필요한 보정을 구한다.
 * wallClockMs 는 기록된 시각을 Date.UTC(...)로 만든 "시간대 없는 계산용" 값이다.
 */
export function resolveKoreanClock(wallClockMs: number): KoreanClockResolution {
  const candidates = Array.from(new Set([KST_OFFSET_MINUTES, ...SEOUL_OFFSET_TRANSITIONS.map(([, o]) => o)]));
  // 그 시계가 실제로 그 오프셋을 쓰던 순간과 맞아떨어지는 오프셋만 남긴다
  const valid = candidates.filter((o) => seoulOffsetAtUtc(wallClockMs - o * 60000) === o);

  let offset: number;
  let ambiguous = false;
  let nonexistent = false;
  if (valid.length === 1) {
    offset = valid[0];
  } else if (valid.length > 1) {
    // 같은 시각이 두 번 - 서머타임(오프셋이 큰 쪽, 먼저 온 시각)으로 본다
    ambiguous = true;
    offset = Math.max(...valid);
  } else {
    // 시계를 앞당겨 없었던 시각 - 바뀐 뒤(서머타임) 오프셋으로 본다
    nonexistent = true;
    offset = seoulOffsetAtUtc(wallClockMs - KST_OFFSET_MINUTES * 60000 + 60 * 60000);
  }

  return {
    correctionMinutes: KST_OFFSET_MINUTES - offset,
    offsetMinutes: offset,
    reason: reasonOf(offset),
    ambiguous,
    nonexistent,
  };
}

/** KST 시각을 lunar-javascript 절기 판정용(베이징 시간) 시각으로 바꿀 때 더하는 분 (-60) */
export const KST_TO_SOLAR_TERM_LIBRARY_MINUTES = SOLAR_TERM_LIBRARY_OFFSET_MINUTES - KST_OFFSET_MINUTES;
