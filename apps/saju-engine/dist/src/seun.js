"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateSeun = calculateSeun;
const lunar_javascript_1 = require("lunar-javascript");
const hanjaMap_1 = require("./hanjaMap");
const tenGodTables_1 = require("./rules/tenGodTables");
const fiveElementTables_1 = require("./rules/fiveElementTables");
/**
 * ⚠️ DECISION REQUIRED (세운 연도 경계 기준):
 *   "2024년 세운" 같은 표현은 일반적으로 "그 해 전체를 갑진년으로 부르는 통상 라벨"을
 *   가리키지만, 정통 사주 이론에서 연주(年柱)는 입춘(양력 2월 4일경)을 기준으로
 *   바뀐다. 즉 2024년 1월 1일~2월 3일경은 엄밀히는 여전히 전년도(계묘년) 연주에
 *   속한다. 이 함수는 명세서 검증 예시(2024→갑진 등)와 일치시키기 위해
 *   "통상 연도 라벨" 방식을 채택했다 - 안전한 연중 날짜(7월 1일)를 기준으로
 *   그 해의 간지를 계산한다. 절기 정밀 기준(입춘 전은 전년도 취급)이 필요한
 *   서비스라면 별도 옵션으로 분리해야 하며, 이는 상용 적용 전 확정이 필요하다.
 */
function getYearGanzhi(year) {
    const eightChar = lunar_javascript_1.Solar.fromYmdHms(year, 7, 1, 12, 0, 0).getLunar().getEightChar();
    const stem = (0, hanjaMap_1.hanjaStemToHangul)(eightChar.getYearGan());
    const branch = (0, hanjaMap_1.hanjaBranchToHangul)(eightChar.getYearZhi());
    return { stem, branch, ganzhi: `${stem}${branch}` };
}
/**
 * 세운 조회 가능 연도 범위.
 * 서비스 대상 사용자의 출생연도(과거) ~ 장기 세운 조회(미래)를 넉넉히 커버하는
 * 범위로 잠정 설정했다. 정확한 하한/상한 자체는 사업적 판단이 필요한 영역이지만,
 * "입력 검증이 아예 없던" 상태를 없애는 것이 이번 수정의 목적이므로 우선
 * 상식적인 범위를 넣어둔다. 필요 시 이 상수만 조정하면 된다.
 */
const MIN_SUPPORTED_YEAR = 1900;
const MAX_SUPPORTED_YEAR = 2200;
/**
 * year 입력값을 lunar-javascript에 넘기기 전에 검증한다.
 * 검증 없이 그대로 넘기면, 정수가 아닌 값(예: 2024.5)이 라이브러리 내부에서
 * 조용히 잘못 처리되어 "알 수 없는 천간 한자: undefined"처럼 원인을 알 수 없는
 * 엉뚱한 에러로 이어지는 문제가 실제로 있었다 (검수 과정에서 발견).
 */
function assertValidYear(year) {
    if (typeof year !== "number" || Number.isNaN(year)) {
        throw new Error(`세운 조회 오류: year는 숫자여야 합니다 (입력값: ${year})`);
    }
    if (!Number.isInteger(year)) {
        throw new Error(`세운 조회 오류: year는 정수여야 합니다 (입력값: ${year})`);
    }
    if (year < MIN_SUPPORTED_YEAR || year > MAX_SUPPORTED_YEAR) {
        throw new Error(`세운 조회 오류: year는 ${MIN_SUPPORTED_YEAR}~${MAX_SUPPORTED_YEAR} 범위여야 합니다 (입력값: ${year})`);
    }
}
/**
 * 특정 연도의 세운(연간지)을 계산하고, 그 사주 원국의 일간을 기준으로 한
 * 십신까지 함께 제공한다. LLM을 호출하지 않는다 (Phase 2 원칙 1).
 *
 * @param pillars 사주 원국 (일간을 기준으로 세운의 십신을 계산하기 위해 필요)
 * @param year 조회할 연도 (양력). 생략 시 호출부(index.ts)에서 현재 연도를 넘겨준다.
 */
function calculateSeun(pillars, year) {
    assertValidYear(year);
    const pillar = getYearGanzhi(year);
    const dayStem = pillars.day.heavenlyStem;
    const dayElement = fiveElementTables_1.STEM_ELEMENT[dayStem];
    const dayPolarity = tenGodTables_1.STEM_POLARITY[dayStem];
    if (!dayElement || !dayPolarity) {
        throw new Error(`알 수 없는 일간 천간: ${dayStem}`);
    }
    const yearElement = fiveElementTables_1.STEM_ELEMENT[pillar.stem];
    const yearPolarity = tenGodTables_1.STEM_POLARITY[pillar.stem];
    const tenGod = (0, tenGodTables_1.determineTenGod)(dayElement, dayPolarity, yearElement, yearPolarity);
    return { year, pillar, tenGod };
}
