import type { FortuneRequestBody, ValidatedFortuneInput } from "./types";

/**
 * 지시서 7조: 프론트엔드 검증만 믿지 않고 서버에서 반드시 다시 검증한다
 * (validateAnalyzeInput.ts와 동일한 원칙).
 */
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export type FortuneValidationResult =
  | { ok: true; value: ValidatedFortuneInput }
  | { ok: false; issues: string[] };

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

/** 1~12월(1-based) 기준, 해당 연/월의 실제 마지막 날짜(28~31)를 구한다. UTC 고정으로 타임존 오차를 없앤다. */
function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/**
 * targetDate의 형식(YYYY-MM-DD)뿐 아니라 실제로 존재하는 그레고리력 날짜인지 검증한다
 * (예: 2026-02-31, 2026-04-31, 2026-13-01은 형식은 맞아도 실재하지 않는 날짜).
 * 계산 로직(calculateDailyGanzhi 등)은 건드리지 않고, API 입력 검증 단계에서만 걸러낸다.
 */
function isValidGregorianDate(dateStr: string): boolean {
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d)) return false;
  if (m < 1 || m > 12) return false;
  if (d < 1 || d > daysInMonth(y, m)) return false;
  return true;
}

export function validateFortuneInput(body: FortuneRequestBody): FortuneValidationResult {
  const issues: string[] = [];

  if (!isNonEmptyString(body.resultId)) {
    issues.push("resultId는 필수이며 문자열이어야 합니다.");
  }

  let targetDate: string | undefined;
  if (body.targetDate !== undefined) {
    if (typeof body.targetDate !== "string" || !DATE_RE.test(body.targetDate)) {
      issues.push("targetDate는 YYYY-MM-DD 형식이어야 합니다.");
    } else if (!isValidGregorianDate(body.targetDate)) {
      issues.push("targetDate: 실제로 존재하는 날짜가 아닙니다.");
    } else {
      targetDate = body.targetDate;
    }
  }

  if (issues.length > 0) {
    return { ok: false, issues };
  }

  return {
    ok: true,
    value: { resultId: body.resultId as string, targetDate },
  };
}
