"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateFortuneRelations = calculateFortuneRelations;
const relationTables_1 = require("../rules/relationTables");
const fiveElementTables_1 = require("../rules/fiveElementTables");
const tenGodTables_1 = require("../rules/tenGodTables");
const twelveStageTables_1 = require("../rules/twelveStageTables");
function matchesPair(a, b, table) {
    return table.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
}
/** 기존 twelveStages.ts의 calcStage와 동일한 로직 - 12운성 판정 테이블만 재사용하고
 *  FourPillars 전체를 순회하는 calculateTwelveStages()는 쓰지 않는다 (오늘 지지 1개만 필요하므로). */
function stageOf(dayStem, targetBranch) {
    const polarity = tenGodTables_1.STEM_POLARITY[dayStem];
    const startBranch = twelveStageTables_1.STEM_START_BRANCH[dayStem];
    if (!polarity)
        throw new Error(`알 수 없는 일간 천간: ${dayStem}`);
    if (!startBranch)
        throw new Error(`12운성 시작점 테이블에 없는 천간: ${dayStem}`);
    const forward = (0, twelveStageTables_1.isForward)(polarity);
    const startIdx = twelveStageTables_1.BRANCH_INDEX[startBranch];
    const targetIdx = twelveStageTables_1.BRANCH_INDEX[targetBranch];
    if (startIdx === undefined)
        throw new Error(`알 수 없는 시작 지지: ${startBranch}`);
    if (targetIdx === undefined)
        throw new Error(`알 수 없는 지지: ${targetBranch}`);
    const dist = forward ? (targetIdx - startIdx + 12) % 12 : (startIdx - targetIdx + 12) % 12;
    return twelveStageTables_1.STAGE_NAMES[dist];
}
function calculateFortuneRelations(pillars, todayGanzhi) {
    const dayStem = pillars.day.heavenlyStem;
    const dayPolarity = tenGodTables_1.STEM_POLARITY[dayStem];
    const dayElement = fiveElementTables_1.STEM_ELEMENT[dayStem];
    if (!dayPolarity || !dayElement)
        throw new Error(`알 수 없는 일간 천간: ${dayStem}`);
    const todayElement = fiveElementTables_1.STEM_ELEMENT[todayGanzhi.stem];
    const todayPolarity = tenGodTables_1.STEM_POLARITY[todayGanzhi.stem];
    if (!todayElement || !todayPolarity)
        throw new Error(`알 수 없는 오늘 천간: ${todayGanzhi.stem}`);
    const tenGodOfDay = (0, tenGodTables_1.determineTenGod)(dayElement, dayPolarity, todayElement, todayPolarity);
    const twelveStageOfDay = stageOf(dayStem, todayGanzhi.branch);
    const stemPairs = relationTables_1.STEM_COMBINATIONS.map((c) => c.pair);
    const liuHePairs = relationTables_1.BRANCH_LIU_HE.map((c) => c.pair);
    const entries = [
        ["year", pillars.year],
        ["month", pillars.month],
        ["day", pillars.day],
        ["hour", pillars.hour],
    ];
    const perPillar = {};
    for (const [pos, pillar] of entries) {
        if (!pillar)
            continue; // 시주 미입력 케이스 - 기존 twelveStages.ts와 동일한 원칙으로 생략
        const branchPunishment = matchesPair(pillar.earthlyBranch, todayGanzhi.branch, [relationTables_1.BRANCH_JA_MYO_HYEONG])
            ? "무례지형"
            : pillar.earthlyBranch === todayGanzhi.branch && relationTables_1.BRANCH_JA_HYEONG_LIST.includes(todayGanzhi.branch)
                ? "자형"
                : null;
        perPillar[pos] = {
            position: pos,
            stemCombination: matchesPair(pillar.heavenlyStem, todayGanzhi.stem, stemPairs),
            branchCombination: matchesPair(pillar.earthlyBranch, todayGanzhi.branch, liuHePairs),
            branchClash: matchesPair(pillar.earthlyBranch, todayGanzhi.branch, relationTables_1.BRANCH_CHUNG),
            branchDestruction: matchesPair(pillar.earthlyBranch, todayGanzhi.branch, relationTables_1.BRANCH_PA),
            branchHarm: matchesPair(pillar.earthlyBranch, todayGanzhi.branch, relationTables_1.BRANCH_HAE),
            branchPunishment,
        };
    }
    return { tenGodOfDay, twelveStageOfDay, perPillar };
}
