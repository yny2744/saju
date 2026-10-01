/**
 * Saju Engine - 타입 정의
 *
 * 명세서 7조 "Saju JSON 표준"을 기반으로 하되,
 * Phase 1 범위(사주 8글자 계산)에 맞춰 pillars 관련 필드만 우선 확정한다.
 * elements, tenGods, relations, twelveStages, daeun, seun은 Phase 2 이후에
 * 채워지는 필드이므로 Phase 1에서는 빈 구조로 남겨둔다 (스키마 자리만 유지).
 */
export type CalendarType = "solar" | "lunar";
export type Gender = "male" | "female";
/** 야자시/조자시 처리 방식. 자시(23:00~01:00) 처리에 대한 명리학 유파 차이가 있어 명시적으로 선택받는다. */
export type ZiHourMethod = "standard" | "yaja_joja_split";
export interface SajuInput {
    calendarType: CalendarType;
    /** YYYY-MM-DD */
    date: string;
    /** HH:mm, 24시간제. 출생시간 모름/생략 시 undefined */
    time?: string;
    gender: Gender;
    /** 시/도 등 대략적 지역명. Phase 1에서는 태양시 보정 계산에만 사용, 저장 X */
    birthPlace?: string;
    /** 출생지 경도. 태양시 보정 계산에 사용 (birthPlace 대신 직접 지정 가능) */
    longitude?: number;
    /** 태양시 보정 적용 여부 */
    applySolarTimeCorrection?: boolean;
    /** 자시 처리 방식. 기본값은 "standard" */
    ziHourMethod?: ZiHourMethod;
    /** 윤달인 경우 true (음력 입력 시에만 의미 있음) */
    isLeapMonth?: boolean;
}
/** 하나의 기둥(干支) - 천간 + 지지 */
export interface Pillar {
    /** 천간 (갑을병정무기경신임계) */
    heavenlyStem: string;
    /** 지지 (자축인묘진사오미신유술해) */
    earthlyBranch: string;
    /** 간지 결합 표기, 예: "갑자" */
    ganzhi: string;
}
export interface FourPillars {
    year: Pillar;
    month: Pillar;
    day: Pillar;
    /** 출생시간 미입력 시 null */
    hour: Pillar | null;
}
export interface CalculationMeta {
    timezone: "Asia/Seoul";
    /** 계산에 사용된 라이브러리와 버전 (출처 추적용) */
    calculationSource: string;
    /** 실제 태양시 보정이 반영되었는지 여부 (입력 요청과 별개로, 실제 반영 여부를 기록) */
    solarTimeCorrectionApplied: boolean;
    /** 보정에 사용된 분 단위 오프셋 (표준시 대비) */
    solarTimeCorrectionMinutes: number | null;
    ziHourMethod: ZiHourMethod;
    /** 절기 기준 월주 계산에 사용된 태양력 절입일시 (디버깅/검증용) */
    monthPillarSolarTermBoundary: string | null;
    /** 입력된 출생시간이 없어 시주를 계산하지 않았는지 여부 */
    hourPillarSkipped: boolean;
    /**
     * 태양시 보정까지 반영된 최종 계산 기준 시각 (ISO 8601, 초 단위, 자시 sect 처리 이전 기준).
     * Phase 2-5(대운) 계산이 절기까지의 거리를 잴 때 이 값을 그대로 재사용해서,
     * 사주 원국 계산과 완전히 동일한 기준 시각으로 대운수를 계산하도록 보장한다.
     */
    resolvedSolarDateTime: string;
}
export interface SajuJson {
    birth: {
        calendarType: CalendarType;
        date: string;
        time?: string;
        gender: Gender;
    };
    pillars: FourPillars;
    elements: import("./elements").ElementsResult;
    tenGods: import("./tenGods").TenGodsResult;
    relations: import("./relations").RelationsResult;
    twelveStages: import("./twelveStages").TwelveStagesResult;
    daeun: import("./daeun").DaeunResult;
    seun: import("./seun").SeunResult;
    calculationMeta: CalculationMeta;
}
