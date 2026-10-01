"use strict";
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
 * TODO / DECISION REQUIRED (한국 표준시 자체의 역사적 변경 - 진태양시 보정과 별개 문제):
 *   한국은 표준시 기준 자오선 자체가 시대에 따라 바뀌었다. 이 엔진은 현재
 *   "Asia/Seoul = 항상 동경 135도(UTC+9) 기준"으로만 계산하는데, 아래 기간 출생자는
 *   실제로는 다른 표준시(동경 127도30분, UTC+8:30)를 쓰고 있었다:
 *     - 1908.04.01 ~ 1911.12.31: 동경 127도30분(UTC+8:30)
 *     - 1912.01.01 ~ 1954.03.20: 동경 135도(UTC+9) - 일제강점기 표준
 *     - 1954.03.21 ~ 1961.08.09: 동경 127도30분(UTC+8:30)로 환원
 *     - 1961.08.10 ~ 현재: 동경 135도(UTC+9)
 *   즉 1954.03.21~1961.08.09 사이 출생자는 현재 엔진 계산값이 실제보다 30분
 *   빠른 시각을 기준으로 계산되어, 시주 경계에 걸리는 경우 틀린 결과가 나올 수 있다.
 *   Phase 2에서 이 기간을 별도 상수 테이블로 처리하고, applySolarTimeCorrection과는
 *   무관하게 항상 적용할지(과거 표준시는 선택이 아니라 사실관계이므로) 결정 필요.
 *   출처: 대한민국 「표준시에 관한 법률」 연혁 및 다수 언론 보도 교차 확인.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.KOREA_STANDARD_MERIDIAN = exports.CITY_LONGITUDE_TABLE = void 0;
exports.resolveSolarTimeCorrection = resolveSolarTimeCorrection;
exports.CITY_LONGITUDE_TABLE = {
    "서울": 126.978,
    "부산": 129.075,
    "대구": 128.601,
    "인천": 126.705,
    "광주": 126.851,
    "대전": 127.385,
    "울산": 129.311,
    "세종": 127.289,
    "수원": 127.028,
    "춘천": 127.730,
    "청주": 127.489,
    "전주": 127.148,
    "목포": 126.392,
    "포항": 129.365,
    "제주": 126.532,
};
exports.KOREA_STANDARD_MERIDIAN = 135;
/**
 * 출생지 정보(도시명 또는 직접 경도)로부터 보정 분(minute)을 계산한다.
 * 적용 여부(applySolarTimeCorrection)가 false이거나 위치 정보가 전혀 없으면 보정하지 않는다.
 */
function resolveSolarTimeCorrection(params) {
    const { applySolarTimeCorrection, birthPlace, longitude } = params;
    if (!applySolarTimeCorrection) {
        return { applied: false, minutes: null };
    }
    let resolvedLongitude = longitude;
    if (resolvedLongitude === undefined && birthPlace) {
        resolvedLongitude = exports.CITY_LONGITUDE_TABLE[birthPlace];
    }
    if (resolvedLongitude === undefined) {
        // 보정을 요청했지만 좌표를 알 수 없는 경우: 보정 없이 진행하되 명시적으로 미적용 표시
        // (침묵 실패 대신 calculationMeta에 기록되도록 상위 레이어에서 처리)
        return { applied: false, minutes: null };
    }
    const minutes = Math.round((resolvedLongitude - exports.KOREA_STANDARD_MERIDIAN) * 4);
    return { applied: true, minutes };
}
