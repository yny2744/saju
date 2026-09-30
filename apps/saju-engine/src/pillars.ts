import { Solar, Lunar } from "lunar-javascript";
import { hanjaStemToHangul, hanjaBranchToHangul } from "./hanjaMap";
import { resolveSolarTimeCorrection } from "./solarTime";
import type {
  SajuInput,
  FourPillars,
  Pillar,
  CalculationMeta,
  ZiHourMethod,
} from "./types";

const LUNAR_JAVASCRIPT_SOURCE = "lunar-javascript (MIT License, Copyright (c) 2018 6tail)";

/**
 * ziHourMethod -> lunar-javascript의 EightChar.setSect() 인자로 매핑.
 *
 * 실제로 라이브러리를 직접 실행해서 검증한 내용 (2026-09-06 확인):
 *   - setSect(1): 23:00~23:59를 다음날의 자시로 보고 일주를 다음날로 넘긴다.
 *     (예: 1999-12-31 23:10 -> 2000-01-01의 일주와 동일한 값 산출을 직접 실행해 확인함)
 *   - setSect(2) [라이브러리 기본값]: 자정(00:00)에만 날짜가 바뀐다. 23:00~23:59는 당일 유지.
 *   - 연주/월주는 sect 값과 무관하게 항상 절기(입춘 등) 기준으로만 결정된다.
 *     (1999-12-31 23:10을 sect1로 계산해도 연주가 계속 己卯로 유지되는 것을 직접 실행해 확인함 -
 *      날짜가 다음날(2000-01-01)로 넘어가도 입춘 전이라 연주가 안 바뀌는 것과는 별개로,
 *      "일주가 하루 밀렸다고 연주/월주까지 같이 밀리지는 않는다"는 것을 확인한 것)
 *
 * 이 매핑을 라이브러리에 위임함으로써, 이전 버전에서 직접 날짜를 +1일 계산하던
 * 수동 로직(및 그로 인한 음력 입력 시 버그)을 완전히 제거했다.
 */
function ziHourMethodToSect(method: ZiHourMethod): 1 | 2 {
  return method === "standard" ? 1 : 2;
}

interface SolarWallClock {
  /** 양력(그레고리력) 기준 년/월/일. addMinutes 등 날짜 산술은 이 값에만 적용한다. */
  y: number;
  m: number;
  d: number;
  h: number;
  mi: number;
  s: number;
}

/**
 * Date.UTC의 자동 정규화(월/일 롤오버) 특성을 역이용해 날짜 유효성을 검증한다.
 * 존재하지 않는 날짜(예: 2월 30일, 4월 31일, 평년의 2월 29일)를 라이브러리가
 * 조용히(에러 없이) 받아들이는 것을 실제로 확인했기 때문에, 엔진 자체에서
 * 한 번 더 명시적으로 검증한다.
 */
function isValidGregorianDate(y: number, m: number, d: number): boolean {
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

/**
 * 순수 캘린더 산술을 위해 Date.UTC를 "타임존 없는 계산기"로만 사용한다.
 * (실제 시간대 변환이 아니라 날짜/시간 덧셈만 필요하므로 UTC로 고정해 부작용을 없앤다.)
 *
 * 중요: 이 함수는 반드시 "양력(그레고리력) 기준" 값에만 사용해야 한다.
 * 음력 날짜 숫자를 그대로 넣으면 잘못된 결과가 나온다 (음력 월은 29일/30일이 섞여있고
 * 윤달도 있어서 그레고리력 산술 규칙과 다르다).
 */
function addMinutesToSolarWallClock(
  wc: SolarWallClock,
  deltaMinutes: number
): SolarWallClock {
  const utcMs = Date.UTC(wc.y, wc.m - 1, wc.d, wc.h, wc.mi, wc.s) + deltaMinutes * 60000;
  const dt = new Date(utcMs);
  return {
    y: dt.getUTCFullYear(),
    m: dt.getUTCMonth() + 1,
    d: dt.getUTCDate(),
    h: dt.getUTCHours(),
    mi: dt.getUTCMinutes(),
    s: dt.getUTCSeconds(),
  };
}

function parseDate(date: string): { y: number; m: number; d: number } {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) {
    throw new Error(`날짜 형식 오류: ${date} (YYYY-MM-DD 형식이어야 함)`);
  }
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  if (m < 1 || m > 12) {
    throw new Error(`날짜 오류: 월(${m})은 1~12 사이여야 함`);
  }
  // 주의: 이 검증은 "양력 입력"에만 안전하게 적용 가능하다.
  // 음력 입력의 경우 이 함수는 (y, 음력월, 음력일) 원본 숫자를 그대로 검증하는데,
  // 음력 날짜 유효성(예: 그 음력월이 29일까지인지 30일까지인지)은 그레고리력 규칙과
  // 다르므로 여기서 걸러지지 않는다 - 음력 유효성은 Lunar.fromYmd 호출 시
  // 라이브러리가 던지는 에러에 위임한다 (아래 calculateFourPillars 참고).
  return { y, m, d };
}

function parseTime(time: string): { h: number; mi: number; s: number } {
  // HH:mm 또는 HH:mm:ss 형식 모두 지원 (초 단위 정밀도가 필요한 경계값 테스트 대응)
  const match = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(time);
  if (!match) {
    throw new Error(`시간 형식 오류: ${time} (HH:mm 또는 HH:mm:ss 형식이어야 함)`);
  }
  const h = Number(match[1]);
  const mi = Number(match[2]);
  const s = match[3] !== undefined ? Number(match[3]) : 0;
  if (h < 0 || h > 23 || mi < 0 || mi > 59 || s < 0 || s > 59) {
    throw new Error(`시간 형식 오류: ${time} (시 00-23, 분/초 00-59 범위여야 함)`);
  }
  return { h, mi, s };
}

function toPillar(stemHanja: string, branchHanja: string): Pillar {
  const stem = hanjaStemToHangul(stemHanja);
  const branch = hanjaBranchToHangul(branchHanja);
  return {
    heavenlyStem: stem,
    earthlyBranch: branch,
    ganzhi: `${stem}${branch}`,
  };
}

/**
 * 통합된 계산 흐름 (양력/음력 입력 모두 동일한 파이프라인을 거친다):
 *
 *   1) 입력을 "양력 기준 날짜(y,m,d) + 시각(h,mi)"으로 정규화
 *      - 양력 입력: 그대로 사용
 *      - 음력 입력: Lunar.fromYmd(...).getSolar()로 먼저 양력 변환 (이 시점에 시각은 아직 미반영)
 *   2) 정규화된 "양력 wall clock"에 대해서만 그레고리력 날짜 산술(addMinutes)로 태양시 보정 적용
 *   3) Solar.fromYmdHms(...)로 최종 Solar 객체 생성 -> EightChar 도출
 *   4) EightChar.setSect(...)로 자시 처리 방식 적용 (날짜를 직접 조작하지 않음 - 라이브러리에 위임)
 *
 * 이렇게 하면 "음력 날짜 숫자에 직접 분 단위 산술을 하는" 이전 버전의 버그가 원천적으로 발생하지 않는다.
 */
export function calculateFourPillars(input: SajuInput): {
  pillars: FourPillars;
  meta: CalculationMeta;
} {
  const { y, m, d } = parseDate(input.date);
  const hasTime = !!input.time;
  const { h, mi, s } = hasTime ? parseTime(input.time as string) : { h: 12, mi: 0, s: 0 };
  // 출생시간 미입력 시 정오(12:00:00)를 임시값으로 사용해 연/월/일주만 계산하고,
  // 시주는 아래에서 명시적으로 null 처리한다 (정오 값은 시주 계산에는 절대 사용하지 않음).

  const ziHourMethod: ZiHourMethod = input.ziHourMethod ?? "standard";

  // 1) 입력을 "양력 기준 날짜"로 정규화 (음력이면 여기서 변환, 시각은 아직 원본 그대로)
  let solarY: number;
  let solarM: number;
  let solarD: number;

  if (input.calendarType === "lunar") {
    // lunar-javascript 규약: 윤달은 month를 음수로 지정한다 (별도의 leap 파라미터 없음).
    // 존재하지 않는 윤달(예: 그 해에 실제로 없는 윤달)을 입력하면 라이브러리가
    // 명확한 에러를 던지는 것을 직접 실행해 확인했으므로, 별도 사전 검증 없이 위임한다.
    const lunar = Lunar.fromYmd(y, input.isLeapMonth ? -m : m, d);
    const baseSolar = lunar.getSolar();
    solarY = baseSolar.getYear();
    solarM = baseSolar.getMonth();
    solarD = baseSolar.getDay();
  } else {
    // 양력 입력은 라이브러리가 2/30 같은 존재하지 않는 날짜를 "조용히" 받아들이는 것을
    // 직접 실행해 확인했기 때문에, 여기서 명시적으로 한 번 더 검증한다.
    if (!isValidGregorianDate(y, m, d)) {
      throw new Error(`존재하지 않는 양력 날짜: ${input.date}`);
    }
    solarY = y;
    solarM = m;
    solarD = d;
  }

  let wc: SolarWallClock = { y: solarY, m: solarM, d: solarD, h, mi, s };

  // 2) 태양시 보정 - 이제 wc는 항상 "양력" 값이므로 그레고리력 날짜 산술이 안전하다.
  const correction = resolveSolarTimeCorrection({
    applySolarTimeCorrection: input.applySolarTimeCorrection,
    birthPlace: input.birthPlace,
    longitude: input.longitude,
  });

  if (correction.applied && correction.minutes !== null) {
    wc = addMinutesToSolarWallClock(wc, correction.minutes);
  }

  // 3) Solar 객체 생성 -> EightChar 도출
  const solar = Solar.fromYmdHms(wc.y, wc.m, wc.d, wc.h, wc.mi, wc.s);
  const eightChar = solar.getLunar().getEightChar();

  // 4) 자시 처리 방식 적용 - 날짜를 직접 조작하지 않고 라이브러리 내장 기능(setSect)에 위임.
  //    이전 버전에서 직접 +1일 계산하던 로직을 완전히 제거했다 (중복 적용 리스크 원천 차단).
  eightChar.setSect(ziHourMethodToSect(ziHourMethod));

  const pillars: FourPillars = {
    year: toPillar(eightChar.getYearGan(), eightChar.getYearZhi()),
    month: toPillar(eightChar.getMonthGan(), eightChar.getMonthZhi()),
    day: toPillar(eightChar.getDayGan(), eightChar.getDayZhi()),
    hour: hasTime ? toPillar(eightChar.getTimeGan(), eightChar.getTimeZhi()) : null,
  };

  const meta: CalculationMeta = {
    timezone: "Asia/Seoul",
    calculationSource: LUNAR_JAVASCRIPT_SOURCE,
    solarTimeCorrectionApplied: correction.applied,
    solarTimeCorrectionMinutes: correction.minutes,
    ziHourMethod,
    monthPillarSolarTermBoundary: null, // Phase 2: 절기 절입일시 노출 예정
    hourPillarSkipped: !hasTime,
    resolvedSolarDateTime: `${String(wc.y).padStart(4, "0")}-${String(wc.m).padStart(2, "0")}-${String(
      wc.d
    ).padStart(2, "0")}T${String(wc.h).padStart(2, "0")}:${String(wc.mi).padStart(2, "0")}:${String(
      wc.s
    ).padStart(2, "0")}`,
  };

  return { pillars, meta };
}
