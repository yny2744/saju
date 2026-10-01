"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateTenGods = calculateTenGods;
const fiveElementTables_1 = require("./rules/fiveElementTables");
const tenGodTables_1 = require("./rules/tenGodTables");
/**
 * BRANCH_POLARITY는 위에서 이미 tenGodTables로부터 import했다 (branchElementBased 계산에 사용).
 */
function stemInfo(stemHangul) {
    const element = fiveElementTables_1.STEM_ELEMENT[stemHangul];
    const polarity = tenGodTables_1.STEM_POLARITY[stemHangul];
    if (!element || !polarity) {
        throw new Error(`알 수 없는 천간: ${stemHangul}`);
    }
    return { element, polarity };
}
function calculateBranchTenGod(branchHangul, dayElement, dayPolarity) {
    const hidden = fiveElementTables_1.HIDDEN_STEMS_TABLE[branchHangul];
    if (!hidden)
        throw new Error(`지장간 테이블에 없는 지지: ${branchHangul}`);
    const hiddenStemTenGods = hidden.map((h) => ({
        stem: h.stem,
        tenGod: (0, tenGodTables_1.determineTenGod)(dayElement, dayPolarity, h.element, tenGodTables_1.STEM_POLARITY[h.stem]),
        type: h.type,
        weight: h.weight,
    }));
    const primaryEntry = hidden.find((h) => h.type === "정기");
    if (!primaryEntry) {
        throw new Error(`지지 '${branchHangul}'에 정기(正氣) 지장간이 없음 - 데이터 오류`);
    }
    const primary = (0, tenGodTables_1.determineTenGod)(dayElement, dayPolarity, primaryEntry.element, tenGodTables_1.STEM_POLARITY[primaryEntry.stem]);
    const branchElement = fiveElementTables_1.BRANCH_ELEMENT[branchHangul];
    const branchPolarity = tenGodTables_1.BRANCH_POLARITY[branchHangul];
    const branchElementBased = (0, tenGodTables_1.determineTenGod)(dayElement, dayPolarity, branchElement, branchPolarity);
    return { primary, branchElementBased, hiddenStemTenGods };
}
/**
 * Phase 1에서 계산된 4기둥(FourPillars)을 받아 십신 구조를 계산한다.
 * 일간(일주 천간)을 기준으로 연간/월간/시간, 그리고 4개 지지(지장간 포함)의
 * 십신을 결정론적으로 판정한다. LLM을 호출하지 않는다 (Phase 2 원칙 1).
 */
function calculateTenGods(pillars) {
    const dayStemHangul = pillars.day.heavenlyStem;
    const { element: dayElement, polarity: dayPolarity } = stemInfo(dayStemHangul);
    const heavenlyStems = {};
    const earthlyBranches = {};
    const stemPositions = [
        { pos: "year", pillar: pillars.year },
        { pos: "month", pillar: pillars.month },
        { pos: "hour", pillar: pillars.hour },
    ];
    for (const { pos, pillar } of stemPositions) {
        if (!pillar)
            continue; // 시주 미입력 케이스
        const { element, polarity } = stemInfo(pillar.heavenlyStem);
        heavenlyStems[pos] = (0, tenGodTables_1.determineTenGod)(dayElement, dayPolarity, element, polarity);
    }
    const branchPositions = [
        { pos: "year", pillar: pillars.year },
        { pos: "month", pillar: pillars.month },
        { pos: "day", pillar: pillars.day },
        { pos: "hour", pillar: pillars.hour },
    ];
    for (const { pos, pillar } of branchPositions) {
        if (!pillar)
            continue;
        earthlyBranches[pos] = calculateBranchTenGod(pillar.earthlyBranch, dayElement, dayPolarity);
    }
    return {
        dayMaster: { stem: dayStemHangul, element: dayElement, polarity: dayPolarity },
        heavenlyStems,
        earthlyBranches,
    };
}
