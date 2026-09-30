import { Solar } from "lunar-javascript";
import { STEM_POLARITY } from "./rules/tenGodTables";
import { shiftGanzhi, Ganzhi } from "./rules/ganzhiCycle";
import { hanjaJieToHangul } from "./hanjaMap";
import type { FourPillars, CalculationMeta, Gender } from "./types";

/**
 * ⚠️ DECISION REQUIRED (대운수 환산 규칙 자체):
 *   "3일=1년"(DAYS_PER_YEAR=3) 환산은 대운수 계산에서 가장 널리 쓰이는 통설이지만,
 *   실제로는 세부 계산 방식(하루 미만 시간을 어떻게 반영할지, 반올림/버림 시점 등)에서
 *   문헌·서비스별로 미묘한 차이가 존재한다. "이견이 전혀 없는 확정 규칙"으로 단정하지
 *   않고, 이 프로젝트에서 채택한 하나의 구현으로 취급한다. 상용 서비스 적용 전
 *   명리학 전문가 검수를 통해 최종 확정할 것을 권장한다.
 */

export interface DaeunPeriod {
  /** 몇 번째 대운인지 (1부터 시작) */
  order: number;
  /**
   * 이 대운이 시작되는 나이 - 정밀값(반올림 없음). 내부 계산/검증용으로 사용하고,
   * 화면에 그대로 노출할지는 별도 정책(startAgeDisplay) 문제로 분리했다.
   */
  startAgePrecise: number;
  /**
   * 이 대운이 시작되는 나이 - 화면 표시용(소수 첫째자리 반올림).
   * ⚠️ DECISION REQUIRED: 이 반올림 방식은 "서비스에서 이렇게 보여주면 무난하다"는
   * 잠정 값일 뿐, 명리학적으로 확정된 규칙이 아니다. 올림/버림/정수화 등 다른
   * 표시 방식을 채택할 수도 있으므로, 상용 적용 전 별도로 정책을 확정할 것.
   * startAgePrecise를 기준으로 언제든 다른 표시 규칙으로 재계산 가능하도록
   * 두 값을 분리해서 제공한다.
   */
  startAgeDisplay: number;
  /**
   * 다음 대운이 시작되는 정밀 나이 (이 대운의 끝을 "다음 대운의 시작"으로 정의).
   * 마지막 대운은 다음 경계가 없으므로 null이다.
   * ⚠️ DECISION REQUIRED: 대운 사이 경계를 "다음 대운 시작 나이"로 정의하는 것
   * 자체는 자연스럽지만, 화면에 "OO세까지"라고 보여줄 때 이 값을 그대로 쓸지,
   * 아니면 관례상 정수/반올림된 값으로 보여줄지는 별도 확정이 필요하다.
   */
  endAgePrecise: number | null;
  pillar: Ganzhi;
}

export interface DaeunResult {
  /** 순행(다음 간지로 진행) 또는 역행(이전 간지로 진행) */
  direction: "forward" | "backward";
  /**
   * 대운수(정밀값) - 첫 번째 대운이 시작되는 나이, 반올림 없이 그대로.
   * "3일=1년" 환산 규칙(DAYS_PER_YEAR)은 대운수 계산에서 가장 널리 쓰이는 통설이지만,
   * 이 프로젝트의 DECISION REQUIRED 원칙에 따라 "이견이 전혀 없는 확정 규칙"이라고
   * 단정하지는 않는다. 이 값 자체는 아직 어떤 표시 규칙도
   * 적용하지 않은 순수 계산값이다.
   */
  startAgePrecise: number;
  /**
   * 대운수(화면 표시용) - 소수 첫째자리 반올림.
   * ⚠️ DECISION REQUIRED: 위 DaeunPeriod.startAgeDisplay와 동일한 사유로,
   * 이 반올림 방식이 서비스 확정 규칙은 아니다. startAgePrecise를 기준으로
   * 언제든 다른 규칙(올림/버림/정수 등)으로 다시 계산할 수 있다.
   */
  startAgeDisplay: number;
  /** 검증/디버깅용: 기준 절기까지의 실제 일수 차이(소수 포함, 반올림 없음) */
  daysToBoundaryJie: number;
  /** 기준으로 삼은 절기 이름과 절입 일시 (검증용) */
  boundaryJie: { name: string; dateTime: string };
  periods: DaeunPeriod[];
  /**
   * ⚠️ 중요: 출생시간이 입력되지 않아 정오(12:00)를 임시값으로 사용해 계산된
   * 결과인지 여부. 대운수는 절기까지의 정확한 시간 거리에 좌우되므로, 출생시간을
   * 모르면 이 startAge/periods는 실제와 몇 년씩 어긋날 수 있다. 이 값이 true이면
   * 화면에 "출생시간 미상으로 대운은 참고용입니다" 같은 명확한 경고를 반드시 노출할 것.
   */
  timeUnknownWarning: boolean;
}

const DAYS_PER_YEAR = 3; // "3일=1년" 환산 규칙 (가장 널리 쓰이는 통설이나, 아래 DECISION REQUIRED 참고)

/** 소수 첫째자리 반올림 - 화면 표시용 값에만 사용. 정밀값(Precise)에는 절대 적용하지 않는다. */
function roundToOneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}

/**
 * Phase 1에서 계산된 4기둥 + calculationMeta를 받아 대운을 계산한다.
 * LLM을 호출하지 않는다 (Phase 2 원칙 1).
 *
 * 계산 순서:
 *   1) 순행/역행 판정: 연간 음양 + 성별 조합 ("양남음녀 순행, 음남양녀 역행" 정설 채택)
 *   2) 기준 절기 결정: 순행이면 다음 절(節), 역행이면 이전 절(節)까지의 거리를 잰다
 *      (calculationMeta.resolvedSolarDateTime을 그대로 재사용해서 사주 원국 계산과
 *      완전히 동일한 기준 시각을 쓴다 - 태양시 보정 등이 이미 반영된 값)
 *   3) 그 거리(일수, 소수 포함)를 3으로 나눠 대운수(시작 나이, 정밀값)를 구한다.
 *      화면 표시용 반올림값은 별도로 분리해서 제공한다(DECISION REQUIRED).
 *   4) 월주를 기준으로 순행/역행 방향에 따라 60갑자를 이동시키며 대운 목록을 생성한다.
 *      각 대운의 끝은 "다음 대운의 시작 정밀값"으로 정의한다 (임의의 -0.1 보정 등을 쓰지 않음).
 *
 * @param periodCount 생성할 대운 개수 (기본 9개 = 대략 90세까지 커버)
 */
export function calculateDaeun(
  pillars: FourPillars,
  meta: CalculationMeta,
  gender: Gender,
  periodCount = 9
): DaeunResult {
  const yearStemPolarity = STEM_POLARITY[pillars.year.heavenlyStem];
  if (!yearStemPolarity) {
    throw new Error(`알 수 없는 연간 천간: ${pillars.year.heavenlyStem}`);
  }

  // 순행/역행 판정: 양남음녀 순행, 음남양녀 역행 (정설 채택) - 이 로직은 이번 수정에서 변경하지 않음.
  const isYangYear = yearStemPolarity === "양";
  const isMale = gender === "male";
  const forward = (isYangYear && isMale) || (!isYangYear && !isMale);
  const direction: "forward" | "backward" = forward ? "forward" : "backward";

  // resolvedSolarDateTime을 그대로 재사용해서 사주 원국 계산과 동일한 기준 시각 확보
  const dt = meta.resolvedSolarDateTime;
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})$/.exec(dt);
  if (!match) {
    throw new Error(`resolvedSolarDateTime 형식 오류: ${dt}`);
  }
  const [, y, m, d, h, mi, s] = match.map(Number as unknown as (v: string) => number);
  const solar = Solar.fromYmdHms(y, m, d, h, mi, s);
  const lunar = solar.getLunar();

  // 절(節) 기준으로만 거리 계산 (기(氣)는 제외 - 대운수는 전통적으로 절 기준) - 변경 없음.
  const boundaryJie = forward ? lunar.getNextJie() : lunar.getPrevJie();
  const boundarySolar = boundaryJie.getSolar();

  const birthMs = Date.UTC(y, m - 1, d, h, mi, s);
  const [bh, bmi, bs] = parseHms(boundarySolar.toYmdHms());
  const boundaryMs = Date.UTC(
    boundarySolar.getYear(),
    boundarySolar.getMonth() - 1,
    boundarySolar.getDay(),
    bh,
    bmi,
    bs
  );

  const daysToBoundaryJie = Math.abs(boundaryMs - birthMs) / (1000 * 60 * 60 * 24);
  const startAgePrecise = daysToBoundaryJie / DAYS_PER_YEAR; // 반올림하지 않은 정밀값
  const startAgeDisplay = roundToOneDecimal(startAgePrecise); // 화면 표시용 (DECISION REQUIRED)

  // 월주를 기준으로 방향에 따라 60갑자를 이동시키며 대운 목록 생성.
  // 각 period의 startAgePrecise를 먼저 전부 계산한 뒤, endAgePrecise는
  // "다음 period의 startAgePrecise"로 채운다 (임의의 -0.1 보정 제거).
  const step = forward ? 1 : -1;
  const rawPeriods: { pillar: Ganzhi; startAgePrecise: number }[] = [];
  for (let i = 1; i <= periodCount; i++) {
    const pillar = shiftGanzhi(pillars.month.heavenlyStem, pillars.month.earthlyBranch, step * i);
    rawPeriods.push({ pillar, startAgePrecise: startAgePrecise + (i - 1) * 10 });
  }

  const periods: DaeunPeriod[] = rawPeriods.map((rp, idx) => {
    const next = rawPeriods[idx + 1];
    return {
      order: idx + 1,
      startAgePrecise: rp.startAgePrecise,
      startAgeDisplay: roundToOneDecimal(rp.startAgePrecise),
      endAgePrecise: next ? next.startAgePrecise : null, // 마지막 대운은 다음 경계가 없어 null
      pillar: rp.pillar,
    };
  });

  return {
    direction,
    startAgePrecise,
    startAgeDisplay,
    daysToBoundaryJie, // 반올림하지 않은 정밀값 그대로 제공 (검증 용도)
    boundaryJie: { name: hanjaJieToHangul(boundaryJie.getName()), dateTime: boundarySolar.toYmdHms() },
    periods,
    timeUnknownWarning: meta.hourPillarSkipped,
  };
}

/** "2024-02-04 10:26:18" 형식 문자열에서 시/분/초만 추출 */
function parseHms(ymdHms: string): [number, number, number] {
  const timePart = ymdHms.split(" ")[1] ?? "00:00:00";
  const [h, mi, s] = timePart.split(":").map(Number);
  return [h, mi, s];
}
