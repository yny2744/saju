"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateElements = calculateElements;
const fiveElementTables_1 = require("./rules/fiveElementTables");
const ALL_ELEMENTS = ["목", "화", "토", "금", "수"];
function getStemElement(stemHangul) {
    const el = fiveElementTables_1.STEM_ELEMENT[stemHangul];
    if (!el)
        throw new Error(`알 수 없는 천간: ${stemHangul}`);
    return el;
}
function getBranchElement(branchHangul) {
    const el = fiveElementTables_1.BRANCH_ELEMENT[branchHangul];
    if (!el)
        throw new Error(`알 수 없는 지지: ${branchHangul}`);
    return el;
}
function getHiddenStems(branchHangul) {
    const entries = fiveElementTables_1.HIDDEN_STEMS_TABLE[branchHangul];
    if (!entries)
        throw new Error(`지장간 테이블에 없는 지지: ${branchHangul}`);
    return entries;
}
/**
 * Phase 1에서 계산된 4기둥(FourPillars)을 받아 오행 구조를 계산한다.
 * 결정론적 계산만 수행하며 LLM을 호출하지 않는다 (Phase 2 원칙 1).
 *
 * 출생시간 미입력(pillars.hour === null)인 경우, 시주 관련 필드는
 * heavenlyStems/earthlyBranches/hiddenStems에서 모두 생략한다 (summary 집계에서도 제외).
 */
function calculateElements(pillars) {
    const heavenlyStems = {};
    const earthlyBranches = {};
    const hiddenStems = {};
    const counts = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };
    const positions = [
        { pos: "year", pillar: pillars.year },
        { pos: "month", pillar: pillars.month },
        { pos: "day", pillar: pillars.day },
        { pos: "hour", pillar: pillars.hour },
    ];
    for (const { pos, pillar } of positions) {
        if (!pillar)
            continue; // 시주 미입력 케이스
        const stemEl = getStemElement(pillar.heavenlyStem);
        const branchEl = getBranchElement(pillar.earthlyBranch);
        const hidden = getHiddenStems(pillar.earthlyBranch);
        heavenlyStems[pos] = stemEl;
        earthlyBranches[pos] = branchEl;
        hiddenStems[pos] = hidden;
        // 천간: 1글자 = 1점
        counts[stemEl] += 1;
        // 지지 본기: 1글자 = 1점
        counts[branchEl] += 1;
        // 지장간: weight/30 만큼 가중 반영 (DECISION REQUIRED - 위 타입 주석 참고)
        for (const h of hidden) {
            counts[h.element] += h.weight / 30;
        }
    }
    let dominant = "목";
    let maxCount = -1;
    for (const el of ALL_ELEMENTS) {
        if (counts[el] > maxCount) {
            maxCount = counts[el];
            dominant = el;
        }
    }
    const lacking = ALL_ELEMENTS.filter((el) => counts[el] === 0);
    // 소수점 부동소수 오차 정리 (예: 0.30000000000000004 방지).
    // 주의: 반올림 정밀도를 너무 낮게 잡으면(예: 소수 3자리) 개별 원소 반올림 오차가
    // 누적되어 summary.counts 총합이 8글자 총점(정수)과 미세하게 어긋날 수 있다
    // (실제로 이 문제가 테스트에서 발견되어 정밀도를 6자리로 올려 수정함).
    for (const el of ALL_ELEMENTS) {
        counts[el] = Math.round(counts[el] * 1e6) / 1e6;
    }
    return {
        heavenlyStems,
        earthlyBranches,
        hiddenStems,
        summary: { counts, dominant, lacking },
    };
}
