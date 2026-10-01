"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateTwelveStages = calculateTwelveStages;
const tenGodTables_1 = require("./rules/tenGodTables");
const twelveStageTables_1 = require("./rules/twelveStageTables");
function calcStage(startBranch, forward, targetBranch) {
    const startIdx = twelveStageTables_1.BRANCH_INDEX[startBranch];
    const targetIdx = twelveStageTables_1.BRANCH_INDEX[targetBranch];
    if (startIdx === undefined)
        throw new Error(`알 수 없는 시작 지지: ${startBranch}`);
    if (targetIdx === undefined)
        throw new Error(`알 수 없는 대상 지지: ${targetBranch}`);
    const dist = forward ? (targetIdx - startIdx + 12) % 12 : (startIdx - targetIdx + 12) % 12;
    return twelveStageTables_1.STAGE_NAMES[dist];
}
/**
 * Phase 1에서 계산된 4기둥을 받아, 일간을 기준으로 연지·월지·일지·시지 각각의
 * 12운성을 계산한다. LLM을 호출하지 않는다 (Phase 2 원칙 1).
 */
function calculateTwelveStages(pillars) {
    const dayStem = pillars.day.heavenlyStem;
    const polarity = tenGodTables_1.STEM_POLARITY[dayStem];
    if (!polarity)
        throw new Error(`알 수 없는 일간 천간: ${dayStem}`);
    const startBranch = twelveStageTables_1.STEM_START_BRANCH[dayStem];
    if (!startBranch)
        throw new Error(`12운성 시작점 테이블에 없는 천간: ${dayStem}`);
    const forward = (0, twelveStageTables_1.isForward)(polarity);
    const stages = {};
    const positions = [
        ["year", pillars.year.earthlyBranch],
        ["month", pillars.month.earthlyBranch],
        ["day", pillars.day.earthlyBranch],
        ["hour", pillars.hour ? pillars.hour.earthlyBranch : null],
    ];
    for (const [pos, branch] of positions) {
        if (!branch)
            continue; // 시주 미입력 케이스
        stages[pos] = calcStage(startBranch, forward, branch);
    }
    return {
        dayMaster: { stem: dayStem, polarity },
        stages,
    };
}
