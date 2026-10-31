/**
 * 진태양시(眞太陽時) 보정
 *
 * 한국 표준시(KST)는 동경 135도(일본 아카시 자오선) 기준이다.
 * 실제 출생지의 경도가 135도보다 서쪽이면(한국 대부분 지역이 여기 해당),
 * 그 지역의 실제 태양시는 표준시보다 느리다.
 *
 * 보정값(분) = (출생지 경도 - 135) * 4
 *   - 경도 1도 = 시간 4분 차이 (지구 자전 360도 / 24시간 = 15도/시간 = 4분/도)
 *
 * TODO / DECISION REQUIRED (진태양시 보정 관련):
 *   - 아래 도시별 경도 테이블은 대표 좌표(시청 등 도심 기준) 근사치이며,
 *     실제 상용 서비스에서는 행정동 단위 좌표 DB나 지오코딩 API 사용을 검토해야 한다.
 *   - 해외 출생자를 지원할 경우 이 테이블만으로는 부족하므로 별도 좌표 입력 UI가 필요하다.
 *
 * 한국 표준시 자체의 역사적 변경(1908~1911·1954~1961 UTC+8:30)과 서머타임은 2026-10-31부터
 *   koreaTime.ts 에서 항상 먼저 보정한다 (사실관계라서 선택 사항이 아님). 이 파일의 진태양시 보정은
 *   그렇게 "지금의 KST(135도)"로 바꾼 시각에 적용된다.
 */
export declare const CITY_LONGITUDE_TABLE: Record<string, number>;
export declare const KOREA_STANDARD_MERIDIAN = 135;
export interface SolarTimeCorrectionResult {
    applied: boolean;
    minutes: number | null;
}
/**
 * 출생지 정보(도시명 또는 직접 경도)로부터 보정 분(minute)을 계산한다.
 * 적용 여부(applySolarTimeCorrection)가 false이거나 위치 정보가 전혀 없으면 보정하지 않는다.
 */
export declare function resolveSolarTimeCorrection(params: {
    applySolarTimeCorrection?: boolean;
    birthPlace?: string;
    longitude?: number;
}): SolarTimeCorrectionResult;
