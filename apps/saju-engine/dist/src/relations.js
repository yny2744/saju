"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateRelations = calculateRelations;
const relationTables_1 = require("./rules/relationTables");
/** 4기둥 중 실제 존재하는(hour가 null일 수 있는) 포지션+글자 목록을 만든다. */
function collectPositions(pillars) {
    const list = [];
    const entries = [
        ["year", pillars.year],
        ["month", pillars.month],
        ["day", pillars.day],
        ["hour", pillars.hour],
    ];
    for (const [pos, pillar] of entries) {
        if (pillar)
            list.push({ pos, stem: pillar.heavenlyStem, branch: pillar.earthlyBranch });
    }
    return list;
}
function pairs(arr) {
    const result = [];
    for (let i = 0; i < arr.length; i++) {
        for (let j = i + 1; j < arr.length; j++) {
            result.push([arr[i], arr[j]]);
        }
    }
    return result;
}
function triples(arr) {
    const result = [];
    for (let i = 0; i < arr.length; i++) {
        for (let j = i + 1; j < arr.length; j++) {
            for (let k = j + 1; k < arr.length; k++) {
                result.push([arr[i], arr[j], arr[k]]);
            }
        }
    }
    return result;
}
function matchesPair(a, b, table) {
    return table.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
}
function sameSet(a, b) {
    if (a.length !== b.length)
        return false;
    const sortedA = [...a].sort();
    const sortedB = [...b].sort();
    return sortedA.every((v, i) => v === sortedB[i]);
}
/**
 * Phase 1에서 계산된 4기둥을 받아 합·충·형·파·해를 계산한다.
 * 단순 문자열 검색이 아니라, 각 관계 유형별 규칙 테이블을 순회하며
 * 원국에 실제 존재하는 글자 조합과 대조하는 방식으로 구현했다.
 * LLM을 호출하지 않는다 (Phase 2 원칙 1).
 */
function calculateRelations(pillars) {
    const positioned = collectPositions(pillars);
    const combination = [];
    const clash = [];
    const punishment = [];
    const destruction = [];
    const harm = [];
    // --- 천간합 ---
    for (const [a, b] of pairs(positioned)) {
        const found = relationTables_1.STEM_COMBINATIONS.find((c) => (c.pair[0] === a.stem && c.pair[1] === b.stem) || (c.pair[0] === b.stem && c.pair[1] === a.stem));
        if (found) {
            combination.push({
                type: "천간합",
                positions: [a.pos, b.pos],
                characters: [a.stem, b.stem],
                resultElement: found.resultElement,
            });
        }
    }
    // --- 육합 / 충 / 파 / 해 / 자묘형 / 자형 (지지 2글자 조합) ---
    for (const [a, b] of pairs(positioned)) {
        const liuHe = relationTables_1.BRANCH_LIU_HE.find((c) => (c.pair[0] === a.branch && c.pair[1] === b.branch) || (c.pair[0] === b.branch && c.pair[1] === a.branch));
        if (liuHe) {
            combination.push({
                type: "육합",
                positions: [a.pos, b.pos],
                characters: [a.branch, b.branch],
                resultElement: liuHe.resultElement,
            });
        }
        if (matchesPair(a.branch, b.branch, relationTables_1.BRANCH_CHUNG)) {
            clash.push({ positions: [a.pos, b.pos], branches: [a.branch, b.branch] });
        }
        // 인해파는 육합(인해합)과 동시에 성립하는 것으로 채택했다 (테이블 주석 DECISION REQUIRED 참고).
        if (matchesPair(a.branch, b.branch, relationTables_1.BRANCH_PA)) {
            destruction.push({ positions: [a.pos, b.pos], branches: [a.branch, b.branch] });
        }
        if (matchesPair(a.branch, b.branch, relationTables_1.BRANCH_HAE)) {
            harm.push({ positions: [a.pos, b.pos], branches: [a.branch, b.branch] });
        }
        // 자묘형 (2글자로 성립하는 형)
        if (matchesPair(a.branch, b.branch, [relationTables_1.BRANCH_JA_MYO_HYEONG])) {
            punishment.push({ type: "무례지형", positions: [a.pos, b.pos], branches: [a.branch, b.branch] });
        }
        // 자형 (같은 지지가 서로 다른 두 기둥에 있을 때) - 진진/오오/유유/해해
        if (a.branch === b.branch && relationTables_1.BRANCH_JA_HYEONG_LIST.includes(a.branch)) {
            punishment.push({ type: "자형", positions: [a.pos, b.pos], branches: [a.branch, b.branch] });
        }
    }
    // --- 삼합 / 방합 / 3글자 완전 형 (지지 3글자 조합) ---
    for (const [a, b, c] of triples(positioned)) {
        const branchSet = [a.branch, b.branch, c.branch];
        for (const sam of relationTables_1.BRANCH_SAM_HAP) {
            if (sameSet(branchSet, sam.group)) {
                combination.push({
                    type: "삼합",
                    positions: [a.pos, b.pos, c.pos],
                    characters: branchSet,
                    resultElement: sam.resultElement,
                });
            }
        }
        for (const bang of relationTables_1.BRANCH_BANG_HAP) {
            if (sameSet(branchSet, bang.group)) {
                combination.push({
                    type: "방합",
                    positions: [a.pos, b.pos, c.pos],
                    characters: branchSet,
                    resultElement: bang.resultElement,
                });
            }
        }
        for (const hyeong of relationTables_1.BRANCH_SAM_HYEONG_GROUPS) {
            if (sameSet(branchSet, hyeong.group)) {
                punishment.push({
                    type: hyeong.name,
                    positions: [a.pos, b.pos, c.pos],
                    branches: branchSet,
                });
            }
        }
    }
    // --- 반합 (삼합의 왕지를 포함한 2글자만 있는 경우, 완전 삼합이 아닐 때만) ---
    for (const [a, b] of pairs(positioned)) {
        for (const sam of relationTables_1.BRANCH_SAM_HAP) {
            const branchPair = [a.branch, b.branch];
            const isSubsetOfGroup = branchPair.every((br) => sam.group.includes(br));
            const includesWangji = branchPair.includes(sam.wangji);
            // 이미 완전한 삼합으로 잡힌 조합(a,b가 같은 완전삼합 그룹에 함께 속함)은
            // 반합으로 중복 기록하지 않는다.
            const alreadyFullSamHap = combination.some((c) => c.type === "삼합" && c.positions.includes(a.pos) && c.positions.includes(b.pos));
            if (isSubsetOfGroup && includesWangji && a.branch !== b.branch && !alreadyFullSamHap) {
                combination.push({
                    type: "반합",
                    positions: [a.pos, b.pos],
                    characters: branchPair,
                    resultElement: sam.resultElement,
                });
            }
        }
    }
    // --- 반형 (형벌 3글자 그룹 중 2글자만 있는 경우, 완전 형이 아닐 때만) ---
    // DECISION REQUIRED (위 테이블 주석 참고): 반형 인정 여부 자체가 유파별로 갈림.
    for (const [a, b] of pairs(positioned)) {
        for (const hyeong of relationTables_1.BRANCH_SAM_HYEONG_GROUPS) {
            const branchPair = [a.branch, b.branch];
            const isSubsetOfGroup = branchPair.every((br) => hyeong.group.includes(br));
            const alreadyFullHyeong = punishment.some((p) => (p.type === "무은지형" || p.type === "지세지형") &&
                p.positions.includes(a.pos) &&
                p.positions.includes(b.pos));
            if (isSubsetOfGroup && a.branch !== b.branch && !alreadyFullHyeong) {
                punishment.push({ type: "반형", positions: [a.pos, b.pos], branches: branchPair });
            }
        }
    }
    return { combination, clash, punishment, destruction, harm };
}
