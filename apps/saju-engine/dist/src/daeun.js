"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateDaeun = calculateDaeun;
const lunar_javascript_1 = require("lunar-javascript");
const tenGodTables_1 = require("./rules/tenGodTables");
const ganzhiCycle_1 = require("./rules/ganzhiCycle");
const hanjaMap_1 = require("./hanjaMap");
const DAYS_PER_YEAR = 3; // "3일=1년" 환산 규칙 (가장 널리 쓰이는 통설이나, 아래 DECISION REQUIRED 참고)
/** 소수 첫째자리 반올림 - 화면 표시용 값에만 사용. 정밀값(Precise)에는 절대 적용하지 않는다. */
function roundToOneDecimal(value) {
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
function calculateDaeun(pillars, meta, gender, periodCount = 9) {
    const yearStemPolarity = tenGodTables_1.STEM_POLARITY[pillars.year.heavenlyStem];
    if (!yearStemPolarity) {
        throw new Error(`알 수 없는 연간 천간: ${pillars.year.heavenlyStem}`);
    }
    // 순행/역행 판정: 양남음녀 순행, 음남양녀 역행 (정설 채택) - 이 로직은 이번 수정에서 변경하지 않음.
    const isYangYear = yearStemPolarity === "양";
    const isMale = gender === "male";
    const forward = (isYangYear && isMale) || (!isYangYear && !isMale);
    const direction = forward ? "forward" : "backward";
    // resolvedSolarDateTime을 그대로 재사용해서 사주 원국 계산과 동일한 기준 시각 확보
    const dt = meta.resolvedSolarDateTime;
    const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})$/.exec(dt);
    if (!match) {
        throw new Error(`resolvedSolarDateTime 형식 오류: ${dt}`);
    }
    const [, y, m, d, h, mi, s] = match.map(Number);
    const solar = lunar_javascript_1.Solar.fromYmdHms(y, m, d, h, mi, s);
    const lunar = solar.getLunar();
    // 절(節) 기준으로만 거리 계산 (기(氣)는 제외 - 대운수는 전통적으로 절 기준) - 변경 없음.
    const boundaryJie = forward ? lunar.getNextJie() : lunar.getPrevJie();
    const boundarySolar = boundaryJie.getSolar();
    const birthMs = Date.UTC(y, m - 1, d, h, mi, s);
    const [bh, bmi, bs] = parseHms(boundarySolar.toYmdHms());
    const boundaryMs = Date.UTC(boundarySolar.getYear(), boundarySolar.getMonth() - 1, boundarySolar.getDay(), bh, bmi, bs);
    const daysToBoundaryJie = Math.abs(boundaryMs - birthMs) / (1000 * 60 * 60 * 24);
    const startAgePrecise = daysToBoundaryJie / DAYS_PER_YEAR; // 반올림하지 않은 정밀값
    const startAgeDisplay = roundToOneDecimal(startAgePrecise); // 화면 표시용 (DECISION REQUIRED)
    // 월주를 기준으로 방향에 따라 60갑자를 이동시키며 대운 목록 생성.
    // 각 period의 startAgePrecise를 먼저 전부 계산한 뒤, endAgePrecise는
    // "다음 period의 startAgePrecise"로 채운다 (임의의 -0.1 보정 제거).
    const step = forward ? 1 : -1;
    const rawPeriods = [];
    for (let i = 1; i <= periodCount; i++) {
        const pillar = (0, ganzhiCycle_1.shiftGanzhi)(pillars.month.heavenlyStem, pillars.month.earthlyBranch, step * i);
        rawPeriods.push({ pillar, startAgePrecise: startAgePrecise + (i - 1) * 10 });
    }
    const periods = rawPeriods.map((rp, idx) => {
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
        boundaryJie: { name: (0, hanjaMap_1.hanjaJieToHangul)(boundaryJie.getName()), dateTime: boundarySolar.toYmdHms() },
        periods,
        timeUnknownWarning: meta.hourPillarSkipped,
    };
}
/** "2024-02-04 10:26:18" 형식 문자열에서 시/분/초만 추출 */
function parseHms(ymdHms) {
    const timePart = ymdHms.split(" ")[1] ?? "00:00:00";
    const [h, mi, s] = timePart.split(":").map(Number);
    return [h, mi, s];
}
