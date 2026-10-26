import { calculateSaju, getCurrentKstYear } from "saju-engine";
import { isRateLimited } from "@/server/rateLimit";
import { numerologyResult } from "@/lib/fun/numerology";
import { zodiacResult } from "@/lib/fun/zodiac";
import { bloodResult } from "@/lib/fun/blood";
import { flowerResult } from "@/lib/fun/flower";
import { buildOverlay, type OverlayView } from "@/lib/fun/overlay";
import { isBloodType, isFunKind, type FunKind, type FunResult } from "@/lib/fun/types";

/**
 * 무료 묶음 (2026-10-26) - 수비학·별자리·혈액형·탄생화 + 사주 겹쳐 보기. AI 없음, 저장 없음.
 *
 *   요청: { kind, calendarType: "solar"|"lunar", date: "YYYY-MM-DD", isLeapMonth?, time?: "HH:mm", blood? }
 *   응답: { kind, solarDate, result: FunResult, overlay: OverlayView }
 *
 * 음력 생일도 받는다 - 별자리·탄생화·인생 수는 양력 날짜로 보므로, 엔진이 계산한 양력 날짜(resolvedSolarDateTime)로 바꿔 쓴다.
 * 성별: 일간과 오행 균형(부족한 기운)은 성별과 상관이 없다 (성별은 대운 방향에만 쓰임). 그래서 묻지 않고 엔진에는 정해진 값을 넘긴다.
 * 입력한 생년월일은 저장하지 않는다 (응답만 돌려준다).
 */

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

export interface FunResponse {
  kind: FunKind;
  solarDate: string;
  result: FunResult;
  overlay: OverlayView;
}

type Out = { status: number; body: FunResponse | { error: { code: string; message: string } } };

function bad(message: string, code = "INVALID_INPUT"): Out {
  return { status: 400, body: { error: { code, message } } };
}

function validSolar(date: string): boolean {
  const [y, m, d] = date.split("-").map(Number);
  if (y < 1900 || y > getCurrentKstYear() || m < 1 || m > 12 || d < 1) return false;
  return d <= new Date(Date.UTC(y, m, 0)).getUTCDate();
}

export function handleFun(raw: unknown, clientKey: string): Out {
  if (isRateLimited(`fun:${clientKey}`)) return { status: 429, body: { error: { code: "RATE_LIMITED", message: "잠시 후 다시 시도해 주세요." } } };
  const b = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  if (!isFunKind(b.kind)) return bad("무엇을 볼지 골라 주세요.");
  const kind = b.kind;
  const calendarType = b.calendarType === "lunar" ? "lunar" : "solar";
  const date = typeof b.date === "string" ? b.date : "";
  if (!DATE_RE.test(date)) return bad("생년월일을 확인해 주세요.");
  if (calendarType === "solar" ? !validSolar(date) : !(Number(date.slice(8, 10)) <= 30 && Number(date.slice(0, 4)) >= 1900)) return bad("생년월일을 확인해 주세요.");
  const time = typeof b.time === "string" && TIME_RE.test(b.time) ? b.time : undefined;
  if (kind === "blood" && !isBloodType(b.blood)) return bad("혈액형을 골라 주세요.");

  let saju;
  try {
    saju = calculateSaju(
      { calendarType, date, time, gender: "male", isLeapMonth: calendarType === "lunar" ? b.isLeapMonth === true : undefined },
      getCurrentKstYear()
    );
  } catch {
    return bad("없는 날짜예요. 생년월일(양력·음력·윤달)을 다시 확인해 주세요.", "SAJU_CALCULATION_FAILED");
  }

  const solarDate = calendarType === "solar" ? date : saju.calculationMeta.resolvedSolarDateTime.slice(0, 10);
  const result =
    kind === "numerology"
      ? numerologyResult(solarDate)
      : kind === "zodiac"
        ? zodiacResult(solarDate)
        : kind === "flower"
          ? flowerResult(solarDate)
          : bloodResult(b.blood as Parameters<typeof bloodResult>[0]);

  return { status: 200, body: { kind, solarDate, result, overlay: buildOverlay(kind, saju, result) } };
}
