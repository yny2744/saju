/**
 * 한국시간(KST, Asia/Seoul, UTC+09:00) 기준 날짜 처리 공통 유틸.
 *
 * 배경 (Fortune Engine 지시서 5조):
 *   이 프로젝트에는 지금까지 서버 시간대를 KST로 명시적으로 고정하는 처리가
 *   없었다. 예: apps/web/src/server/analyzeSaju.ts의 currentSeunYear()가
 *   new Date().getFullYear()를 그대로 사용 - 서버 프로세스가 UTC 환경에서
 *   돌면(예: 대부분의 클라우드 컨테이너 기본값) 한국시간 자정~오전 9시 사이에
 *   "오늘"의 연도/날짜가 하루 밀려서 계산될 위험이 있다.
 *
 *   Fortune Engine은 "오늘의 일진"이 핵심이라 이 문제에 특히 민감하므로,
 *   여기서 KST 변환을 명시적으로 한 번만 구현하고 Fortune Engine과
 *   analyzeSaju.ts(세운 연도)가 함께 재사용한다 (지시서 22조: 중복 구현 금지).
 *
 * 기존 Saju Engine의 계산 로직(pillars.ts 등)은 건드리지 않는다 - 이 파일은
 * "오늘이 몇 년/몇 월/며칠인지"를 안전하게 구하는 순수 유틸일 뿐, 사주 계산
 * 자체의 방식(절기 기준, 태양시 보정 등)에는 전혀 관여하지 않는다.
 */

export const KST_TIME_ZONE = "Asia/Seoul";

const DATE_STRING_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * 주어진 시각(기본값: 지금)을 KST 기준 "YYYY-MM-DD" 문자열로 변환한다.
 *
 * Intl.DateTimeFormat(en-CA)은 ISO 형식(YYYY-MM-DD)을 그대로 반환하므로
 * 별도의 문자열 조립 없이 타임존 변환 결과를 안전하게 얻을 수 있다.
 * (직접 getFullYear() 등을 쓰면 서버 로컬 타임존에 의존하게 되어 지시서 5조가
 * 지적한 문제가 그대로 재발하므로 반드시 Intl의 timeZone 옵션을 통해 변환한다.)
 */
export function getTodayKstDateString(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: KST_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** KST 기준 "오늘"의 연도만 필요한 호출부(예: 세운 조회 연도)를 위한 편의 함수. */
export function getCurrentKstYear(now: Date = new Date()): number {
  return Number(getTodayKstDateString(now).slice(0, 4));
}

/**
 * "YYYY-MM-DD" 형식 검증.
 * 존재하지 않는 날짜(2월 30일 등)까지는 걸러내지 않는다 - 실제 달력 유효성
 * 검증은 이 문자열을 사용하는 쪽(예: calculateFourPillars 내부)에서 이미
 * 수행하므로 여기서 중복 구현하지 않는다 (지시서 22조).
 */
export function assertValidDateString(value: string): void {
  if (typeof value !== "string" || !DATE_STRING_PATTERN.test(value)) {
    throw new Error(`날짜 형식 오류: "YYYY-MM-DD" 형식이어야 합니다 (입력값: ${value})`);
  }
}
