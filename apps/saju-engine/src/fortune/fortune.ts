/**
 * Fortune Engine - 오늘의 운세 계산 진입점.
 *
 * 원칙(지시서 10조, Saju Engine 원칙 1과 동일): 순수 결정론적 계산만 수행하며
 * LLM을 호출하지 않는다. 이 함수의 결과(FortuneJson)가 AI Interpretation에
 * 그대로 전달되는 "검증된 데이터"가 된다.
 *
 * 구조: Saju JSON(이미 계산됨, 재계산하지 않음) + 오늘 날짜 → 오늘의 일진 →
 *      사주 ↔ 오늘 관계 → FortuneJson
 */
import type { SajuJson } from "../types";
import type { Ganzhi } from "../rules/ganzhiCycle";
import { getTodayKstDateString, assertValidDateString } from "../kstDate";
import { calculateDailyGanzhi } from "./dailyGanzhi";
import { calculateFortuneRelations, FortuneRelationsResult } from "./fortuneRelations";

export interface FortuneCalculationMeta {
  timezone: "Asia/Seoul";
  /** 실제 계산에 사용된 날짜(KST 기준, YYYY-MM-DD). targetDate 생략 시 서버 실행 시점의 KST 오늘 날짜 */
  resolvedDate: string;
}

export interface FortuneJson {
  date: string;
  dayGanzhi: Ganzhi;
  relationToday: FortuneRelationsResult;
  calculationMeta: FortuneCalculationMeta;
}

/**
 * @param saju 이미 계산된 사용자 Saju JSON (calculateSaju()의 결과를 그대로 전달 - 재계산하지 않음)
 * @param targetDate YYYY-MM-DD (KST 기준). 생략 시 "지금"의 KST 기준 오늘 날짜를 사용한다.
 *   이 KST 변환은 이 프로젝트에 없던 처리를 이번에 명시적으로 추가한 것이다
 *   (지시서 5조 - kstDate.ts 참고).
 */
export function calculateFortune(saju: SajuJson, targetDate?: string): FortuneJson {
  const resolvedDate = targetDate ?? getTodayKstDateString();
  assertValidDateString(resolvedDate);

  const dayGanzhi = calculateDailyGanzhi(resolvedDate);
  const relationToday = calculateFortuneRelations(saju.pillars, dayGanzhi);

  return {
    date: resolvedDate,
    dayGanzhi,
    relationToday,
    calculationMeta: {
      timezone: "Asia/Seoul",
      resolvedDate,
    },
  };
}
