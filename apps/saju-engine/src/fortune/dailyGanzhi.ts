/**
 * 일진(日辰) - 특정 날짜의 간지 계산.
 *
 * 지시서 6조: 동일한 계산 로직을 새로 복제하지 않는다. calculateFourPillars()는
 * 생일 전용 함수가 아니라 임의의 날짜에 대해 간지를 계산할 수 있는 범용 함수이므로
 * (내부적으로 lunar-javascript의 EightChar를 그대로 사용), 일진 계산에도 그대로
 * 재사용한다.
 */
import { calculateFourPillars } from "../pillars";
import type { Ganzhi } from "../rules/ganzhiCycle";
import { assertValidDateString } from "../kstDate";

/**
 * 주어진 날짜(YYYY-MM-DD, KST 기준으로 이미 확정된 날짜)의 일진을 계산한다.
 *
 * - time을 의도적으로 넘기지 않는다: pillars.ts는 time이 없으면 정오(12:00)를
 *   기준으로 계산하므로 (hasTime=false 분기), 자시(23:00~01:00) 경계 처리
 *   로직이 전혀 개입하지 않는 가장 안전한 "그날의 대표 간지"를 얻을 수 있다.
 *   "오늘의 운세"가 필요한 것은 사용자 개인의 시주가 아니라 그날 하루 전체를
 *   대표하는 일진이므로 이 방식이 정확히 맞는다.
 * - gender는 일진 계산 결과에 전혀 영향을 주지 않는 필드라 placeholder로 고정한다
 *   (calculateFourPillars의 입력 타입이 요구하는 필수 필드일 뿐).
 */
export function calculateDailyGanzhi(dateString: string): Ganzhi {
  assertValidDateString(dateString);

  const { pillars } = calculateFourPillars({
    calendarType: "solar",
    date: dateString,
    gender: "male",
  });

  const { heavenlyStem: stem, earthlyBranch: branch, ganzhi } = pillars.day;
  return { stem, branch, ganzhi };
}
