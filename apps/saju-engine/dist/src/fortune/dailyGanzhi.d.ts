import type { Ganzhi } from "../rules/ganzhiCycle";
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
export declare function calculateDailyGanzhi(dateString: string): Ganzhi;
