"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FALLBACK_TEXTS = void 0;
exports.selectCategoryTexts = selectCategoryTexts;
exports.FALLBACK_TEXTS = {
    overall: "특별한 굴곡 없이 평온하게 흘러가는 하루예요. 평소 하던 대로 차분하게 보내면 좋아요.",
    money: "재물 관련해서는 큰 변화 없이 평소 흐름이 유지되는 날이에요.",
    love: "연애·감정 면에서는 무난하게 흘러가는 날이에요.",
    relationship: "대인관계는 평소와 비슷한 흐름으로 무난해요.",
    work: "업무·활동 면에서는 특별한 변수 없이 순조로운 날이에요.",
};
/**
 * 같은 카테고리에 후보가 여럿이면 priority가 가장 높은 것을, priority가 같으면
 * ruleId 사전순으로 골라 항상 같은 입력에 같은 결과가 나오도록 한다(결정론성).
 */
function selectCategoryTexts(rules) {
    const categories = ["overall", "money", "love", "relationship", "work"];
    const result = {};
    for (const category of categories) {
        const candidates = rules.filter((r) => r.category === category);
        if (candidates.length === 0) {
            result[category] = { text: exports.FALLBACK_TEXTS[category], ruleId: null };
            continue;
        }
        const best = [...candidates].sort((a, b) => b.priority - a.priority || a.ruleId.localeCompare(b.ruleId))[0];
        result[category] = { text: best.text, ruleId: best.ruleId };
    }
    return result;
}
