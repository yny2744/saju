import type { AnalyzeRequestBody, ValidatedAnalyzeInput } from "./types";
import { isFocus } from "@/lib/focus";

/**
 * 지시서 7조: "프론트엔드 검증만 믿지 않는다" - 서버에서 반드시 다시 검증한다.
 *
 * 지시서 3조/9조: Saju Engine이 실제로 지원하는 입력 타입(SajuInput)과 옵션만
 * 받는다. 여기서 새로운 입력 필드나 옵션을 만들어내지 않는다.
 *
 * 지시서 12/13조: 이번 Phase 4 단계에서는 무료 분석(FREE_BASIC)만 실제로
 * 서비스한다. Saju Engine/AI Engine의 ProductType 자체는 이미
 * LOVE_3900/MONEY_3900/CAREER_3900/YEARLY_3900/PREMIUM_9900까지 정의되어
 * 있지만(향후 결제 연동을 위한 확장 지점), 결제 기능이 없는 이번 단계에서
 * 유료 상품을 그대로 내려주면 실제로는 결제 없이 유료 콘텐츠를 제공하는
 * 것이 되므로, API 레벨에서 명시적으로 막아둔다.
 *
 * Phase4 최종 수정 지시서 12조의 "FREE_BASIC / BASIC / PREMIUM" 3단계 상품
 * 구조는 개념적인 티어(무료 / 유료 기본 / 유료 프리미엄) 구분이며, Phase 3에서
 * 이미 확정한 AI Engine의 세부 ProductType(엔진 타입은 변경 금지 대상)과
 * 아래처럼 대응된다. 결제 PG가 붙는 다음 단계에서 이 대응관계를 그대로
 * 사용해 "구매한 티어에 맞는 productType"을 결정하면 된다.
 *   - FREE 티어    → FREE_BASIC
 *   - BASIC 티어   → LOVE_3900 / MONEY_3900 / CAREER_3900 / YEARLY_3900
 *   - PREMIUM 티어 → PREMIUM_9900
 */
const SUPPORTED_PRODUCT_TYPES_PHASE4 = ["FREE_BASIC"] as const;

const NICKNAME_MAX_LENGTH = 20;
const HANJA_NAME_MAX_LENGTH = 10;
/**
 * 한자(Han 문자 전체)만 허용한다. 사주 계산에는 쓰지 않고, 결과 화면 표시용일 뿐이다.
 *
 * ⚠️ 2026-10 수정: 예전엔 U+4E00~9FFF(일반 한자 영역)만 허용했는데, 한국어 입력기의 한자 변환은
 * 두음법칙 때문에 같은 글자를 "호환 한자"(U+F900~FAFF)로 입력하는 경우가 있어, 눈으로는 정상인
 * 한자가 "한자만 입력해주세요" 오류로 거부됐다. Script=Han은 호환 한자까지 포함하고,
 * 아래 normalize("NFC")가 호환 한자를 표준 한자로 바꿔서 저장·표시를 일정하게 만든다.
 */
/**
 * 한자이름: 한자, 또는 한자 + 한글(글자별 선택 팝업에서 "없음/모름"을 고른 글자는 한글로 남는다).
 * 한자가 한 글자도 없으면(전부 한글) 한자이름으로 보지 않는다.
 */
const HANJA_NAME_RE = /^[\p{Script=Han}\uAC00-\uD7A3]+$/u;
const HAS_HAN_RE = /\p{Script=Han}/u;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;
const MIN_YEAR = 1900;
const MAX_YEAR = 2200;

export type ValidationResult =
  | { ok: true; value: ValidatedAnalyzeInput }
  | { ok: false; issues: string[] };

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

/** 닉네임 표시 화면에 그대로 삽입될 수 있으므로, 원시 HTML 태그 형태를 거부한다 (명세서 25조: XSS 방지). */
function containsHtmlTag(v: string): boolean {
  return /[<>]/.test(v);
}

function isValidCalendarDate(dateStr: string, calendarType: unknown): boolean {
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d)) return false;
  if (y < MIN_YEAR || y > MAX_YEAR) return false;
  if (m < 1 || m > 12) return false;
  if (d < 1) return false;

  if (calendarType === "lunar") {
    // 지시서 1조: 계산 로직(Saju Engine)을 재작성하지 않는다. 음력 달의 실제
    // 일수(29 또는 30일, 윤달 포함)는 lunar-javascript 기반 계산이 필요한
    // 영역이라 Saju Engine의 몫으로 남겨두고, 여기서는 음력 달이 가질 수 있는
    // 최대 일수(30일)까지만 걸러내는 최소한의 형식 검증만 한다. 실제로 존재하지
    // 않는 음력 날짜는 calculateSaju() 호출 시 엔진이 걸러내고, analyzeSaju.ts가
    // 이를 SAJU_CALCULATION_FAILED로 안전하게 변환해 사용자에게 안내한다.
    return d <= 30;
  }

  // 양력(기본값 취급 포함)은 실제 그레고리력 달력 기준으로 정확히 검증한다 (지시서 5조).
  // 예: 2월 31일/4월 31일 거부, 윤년 2월 29일 정상 통과.
  return d <= daysInMonth(y, m);
}

/** 1~12월(1-based) 기준, 해당 연/월의 실제 마지막 날짜(28~31)를 구한다. UTC 고정으로 타임존 오차를 없앤다. */
function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function validateAnalyzeInput(body: AnalyzeRequestBody): ValidationResult {
  const issues: string[] = [];

  // --- 닉네임 ---
  let nickname = "";
  if (!isNonEmptyString(body.nickname)) {
    issues.push("nickname: 닉네임을 입력해주세요.");
  } else {
    const trimmed = body.nickname.trim();
    if (trimmed.length > NICKNAME_MAX_LENGTH) {
      issues.push(`nickname: 닉네임은 ${NICKNAME_MAX_LENGTH}자 이하로 입력해주세요.`);
    } else if (containsHtmlTag(trimmed)) {
      issues.push("nickname: 닉네임에 사용할 수 없는 문자가 포함되어 있습니다.");
    } else {
      nickname = trimmed;
    }
  }

  // --- 한자이름 (선택) ---
  let hanjaName: string | undefined;
  if (body.hanjaName !== undefined && body.hanjaName !== null && body.hanjaName !== "") {
    if (!isNonEmptyString(body.hanjaName)) {
      issues.push("hanjaName: 문자열이어야 합니다.");
    } else {
      const trimmed = body.hanjaName.trim().normalize("NFC");
      if (trimmed.length > HANJA_NAME_MAX_LENGTH) {
        issues.push(`hanjaName: 한자이름은 ${HANJA_NAME_MAX_LENGTH}자 이하로 입력해주세요.`);
      } else if (!HANJA_NAME_RE.test(trimmed) || !HAS_HAN_RE.test(trimmed)) {
        issues.push("hanjaName: 한자(漢字)로 입력해주세요.");
      } else {
        hanjaName = trimmed;
      }
    }
  }

  // --- 성별 ---
  if (body.gender !== "male" && body.gender !== "female") {
    issues.push("gender: 성별은 'male' 또는 'female'이어야 합니다.");
  }

  // --- 양력/음력 ---
  if (body.calendarType !== "solar" && body.calendarType !== "lunar") {
    issues.push("calendarType: 'solar' 또는 'lunar'만 지원합니다.");
  }

  // --- 생년월일 ---
  if (!isNonEmptyString(body.date) || !DATE_RE.test(body.date)) {
    issues.push("date: 생년월일은 'YYYY-MM-DD' 형식이어야 합니다.");
  } else if (!isValidCalendarDate(body.date, body.calendarType)) {
    issues.push(`date: 유효한 날짜가 아니거나 지원 범위(${MIN_YEAR}~${MAX_YEAR}년)를 벗어났습니다.`);
  }

  // --- 출생시간 (선택) ---
  if (body.time !== undefined && body.time !== null && body.time !== "") {
    if (!isNonEmptyString(body.time) || !TIME_RE.test(body.time)) {
      issues.push("time: 출생시간은 'HH:mm' (24시간제) 형식이어야 합니다.");
    }
  }

  // --- 출생도시 (선택) ---
  if (body.birthCity !== undefined && body.birthCity !== null && body.birthCity !== "") {
    if (!isNonEmptyString(body.birthCity)) {
      issues.push("birthCity: 문자열이어야 합니다.");
    } else if (body.birthCity.length > 50) {
      issues.push("birthCity: 도시명이 너무 깁니다.");
    }
  }

  // --- 경도 (선택, birthCity 대신 직접 지정 가능 - SajuInput.longitude) ---
  if (body.longitude !== undefined && body.longitude !== null) {
    if (typeof body.longitude !== "number" || Number.isNaN(body.longitude)) {
      issues.push("longitude: 숫자여야 합니다.");
    } else if (body.longitude < -180 || body.longitude > 180) {
      issues.push("longitude: -180 ~ 180 범위여야 합니다.");
    }
  }

  // --- 태양시 보정 (선택) ---
  if (body.applySolarTimeCorrection !== undefined && typeof body.applySolarTimeCorrection !== "boolean") {
    issues.push("applySolarTimeCorrection: true/false여야 합니다.");
  }

  // --- 야자시/조자시 (선택) ---
  if (
    body.ziHourMethod !== undefined &&
    body.ziHourMethod !== "standard" &&
    body.ziHourMethod !== "yaja_joja_split"
  ) {
    issues.push("ziHourMethod: 'standard' 또는 'yaja_joja_split'만 지원합니다.");
  }

  // --- 윤달 여부 (선택) ---
  if (body.isLeapMonth !== undefined && typeof body.isLeapMonth !== "boolean") {
    issues.push("isLeapMonth: true/false여야 합니다.");
  }

  // --- 상품 유형 (선택, 기본값 FREE_BASIC) ---
  const requestedProductType = body.productType === undefined ? "FREE_BASIC" : body.productType;
  if (typeof requestedProductType !== "string" || !SUPPORTED_PRODUCT_TYPES_PHASE4.includes(requestedProductType as never)) {
    issues.push(
      `productType: 이번 단계에서는 [${SUPPORTED_PRODUCT_TYPES_PHASE4.join(", ")}]만 제공합니다. (유료 상품은 결제 기능이 구현되는 다음 단계에서 연결됩니다)`
    );
  }

  // --- 가장 궁금한 것 (선택) ---
  if (body.focus !== undefined && body.focus !== null && !isFocus(body.focus)) {
    issues.push("focus: 'love' | 'work' | 'health' | 'relationship' 중 하나여야 합니다.");
  }

  if (issues.length > 0) {
    return { ok: false, issues };
  }

  return {
    ok: true,
    value: {
      nickname,
      hanjaName,
      ...(isFocus(body.focus) ? { focus: body.focus } : {}),
      sajuInput: {
        calendarType: body.calendarType as "solar" | "lunar",
        date: body.date as string,
        time: isNonEmptyString(body.time) ? (body.time as string) : undefined,
        gender: body.gender as "male" | "female",
        birthPlace: isNonEmptyString(body.birthCity) ? (body.birthCity as string) : undefined,
        longitude: typeof body.longitude === "number" ? body.longitude : undefined,
        applySolarTimeCorrection:
          typeof body.applySolarTimeCorrection === "boolean" ? body.applySolarTimeCorrection : undefined,
        ziHourMethod:
          body.ziHourMethod === "standard" || body.ziHourMethod === "yaja_joja_split"
            ? body.ziHourMethod
            : undefined,
        isLeapMonth: typeof body.isLeapMonth === "boolean" ? body.isLeapMonth : undefined,
      },
      productType: requestedProductType as "FREE_BASIC",
    },
  };
}
