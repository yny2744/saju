import { calculateDailyGanzhi, getTodayKstDateString } from "saju-engine";
import { BRANCHES, STEMS, allTtiFortunes, nextDate, type Branch, type Stem, type TtiFortune } from "@/lib/tti";

export interface TtiDay {
  date: string;
  dayGanzhi: string;
  fortunes: TtiFortune[];
}

/** 그날 일진(엔진 계산) + 12띠 운세 (+ 띠마다 만 40~75세 년생별 한 줄) */
export function ttiDay(date: string): TtiDay {
  const g = calculateDailyGanzhi(date);
  const branch = g.branch as Branch;
  const stem = g.stem as Stem;
  if (!(BRANCHES as readonly string[]).includes(branch)) throw new Error(`알 수 없는 지지: ${g.branch}`);
  if (!(STEMS as readonly string[]).includes(stem)) throw new Error(`알 수 없는 천간: ${g.stem}`);
  return { date, dayGanzhi: g.ganzhi, fortunes: allTtiFortunes(branch, date, stem) };
}

/** 한국 시간 기준 오늘·내일 */
export function ttiTodayAndTomorrow(now: Date = new Date()): { today: TtiDay; tomorrow: TtiDay } {
  const today = getTodayKstDateString(now);
  return { today: ttiDay(today), tomorrow: ttiDay(nextDate(today)) };
}
