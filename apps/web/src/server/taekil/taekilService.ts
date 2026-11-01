import { calculateSaju, getCurrentKstYear, getTodayKstDateString, recommendDays, TAEKIL_PURPOSES, type TaekilPurpose, type TaekilResult } from "saju-engine";
import { isRateLimited } from "@/server/rateLimit";
import { neededEnergy } from "@/lib/neededEnergy";

/**
 * 택일관 (2026-11-01 유샘 승인 기준, AI 없음, 지금은 무료) - 계산은 엔진(saju-engine/src/taekil.ts).
 *   요청: { purpose: "move"|"wedding"|"opening"|"contract", period: "this"|"next", calendarType, date, isLeapMonth?, time? }
 *   본인 띠(연지)·일지·남은 작은 빈자리는 생년월일로 엔진이 계산한 값을 쓴다. 입력한 생년월일은 저장하지 않는다.
 */

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

export interface TaekilResponse extends TaekilResult {
  purposeName: string;
  /** 본인 띠 (예: "말띠") */
  tti: string;
}

type Out = { status: number; body: TaekilResponse | { error: { code: string; message: string } } };
const bad = (message: string): Out => ({ status: 400, body: { error: { code: "INVALID_INPUT", message } } });

const TTI: Record<string, string> = { 자: "쥐", 축: "소", 인: "호랑이", 묘: "토끼", 진: "용", 사: "뱀", 오: "말", 미: "양", 신: "원숭이", 유: "닭", 술: "개", 해: "돼지" };

function isPurpose(v: unknown): v is TaekilPurpose {
  return typeof v === "string" && v in TAEKIL_PURPOSES;
}

export function handleTaekil(raw: unknown, clientKey: string, now = new Date()): Out {
  if (isRateLimited(`taekil:${clientKey}`)) return { status: 429, body: { error: { code: "RATE_LIMITED", message: "잠시 후 다시 시도해 주세요." } } };
  const b = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  if (!isPurpose(b.purpose)) return bad("무엇을 할 날인지 골라 주세요.");
  const period = b.period === "next" ? "next" : "this";
  const calendarType = b.calendarType === "lunar" ? "lunar" : "solar";
  const date = typeof b.date === "string" ? b.date : "";
  if (!DATE_RE.test(date) || Number(date.slice(0, 4)) < 1900) return bad("생년월일을 확인해 주세요.");
  const time = typeof b.time === "string" && TIME_RE.test(b.time) ? b.time : undefined;

  let saju;
  try {
    saju = calculateSaju({ calendarType, date, time, gender: "male", isLeapMonth: calendarType === "lunar" ? b.isLeapMonth === true : undefined }, getCurrentKstYear());
  } catch {
    return bad("없는 날짜예요. 생년월일(양력·음력·윤달)을 다시 확인해 주세요.");
  }

  const today = getTodayKstDateString(now);
  let year = Number(today.slice(0, 4));
  let month = Number(today.slice(5, 7));
  if (period === "next") {
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
  const yearBranch = saju.pillars.year.earthlyBranch;
  const result = recommendDays({
    purpose: b.purpose,
    year,
    month,
    after: today,
    yearBranch,
    dayBranch: saju.pillars.day.earthlyBranch,
    neededElements: neededEnergy(saju).elements,
  });
  return { status: 200, body: { ...result, purposeName: TAEKIL_PURPOSES[b.purpose].name, tti: `${TTI[yearBranch] ?? yearBranch}띠` } };
}
