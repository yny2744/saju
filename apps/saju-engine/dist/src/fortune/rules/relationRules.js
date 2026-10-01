"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateRelationRules = generateRelationRules;
const POSITION_BASE_PRIORITY = {
    day: 9,
    month: 7,
    year: 5,
    hour: 5,
};
const POSITION_CATEGORY = {
    day: "love",
    month: "work",
    year: "relationship",
    hour: "relationship",
};
function generateRelationRules(position, relation) {
    const base = POSITION_BASE_PRIORITY[position];
    const category = POSITION_CATEGORY[position];
    const rules = [];
    if (relation.branchClash) {
        rules.push({
            ruleId: `relation-${position}-clash`,
            category,
            priority: base + 3,
            text: position === "day"
                ? "오늘은 가까운 사람과 의견이 부딪히거나 예정에 없던 변수가 생기기 쉬운 날이에요. 한 박자 쉬고 대응하세요."
                : "예상치 못한 변수나 마찰이 생길 수 있는 날이에요. 여유를 두고 대응하세요.",
        });
    }
    if (relation.branchPunishment) {
        rules.push({
            ruleId: `relation-${position}-punishment`,
            category,
            priority: base + 2,
            text: "괜히 예민해지거나 사소한 일로 스트레스를 받기 쉬운 날이에요. 감정적으로 대응하지 않도록 주의하세요.",
        });
    }
    if (relation.branchDestruction) {
        rules.push({
            ruleId: `relation-${position}-destruction`,
            category,
            priority: base + 1,
            text: "계획했던 일정이 틀어지거나 진행이 더뎌질 수 있어요. 여유 있게 일정을 잡으세요.",
        });
    }
    if (relation.branchHarm) {
        rules.push({
            ruleId: `relation-${position}-harm`,
            category,
            priority: base + 1,
            text: "말이나 문자 한 마디가 오해를 살 수 있는 날이에요. 중요한 이야기는 신중하게 전달하세요.",
        });
    }
    if (relation.branchCombination) {
        rules.push({
            ruleId: `relation-${position}-combination`,
            category,
            priority: base,
            text: position === "day"
                ? "가까운 사람과 마음이 잘 맞는, 화합의 기운이 좋은 날이에요."
                : "주변과 손발이 잘 맞아 협력이 순조로운 날이에요.",
        });
    }
    if (relation.stemCombination) {
        rules.push({
            ruleId: `relation-${position}-stem-combination`,
            category,
            priority: base - 1,
            text: "생각지 못한 곳에서 도움이나 좋은 제안이 들어올 수 있어요.",
        });
    }
    return rules;
}
