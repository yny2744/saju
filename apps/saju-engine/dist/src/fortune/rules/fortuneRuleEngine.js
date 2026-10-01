"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.interpretFortune = interpretFortune;
const tenGodRules_1 = require("./tenGodRules");
const twelveStageRules_1 = require("./twelveStageRules");
const relationRules_1 = require("./relationRules");
const categoryRules_1 = require("./categoryRules");
const textTemplates_1 = require("./textTemplates");
const CAUTION_SUFFIXES = ["clash", "punishment", "destruction", "harm"];
function isCautionRule(rule) {
    return CAUTION_SUFFIXES.some((suffix) => rule.ruleId.endsWith(`-${suffix}`));
}
function interpretFortune(fortune) {
    const { tenGodOfDay, twelveStageOfDay, perPillar } = fortune.relationToday;
    const relationRules = Object.entries(perPillar).flatMap(([position, relation]) => relation ? (0, relationRules_1.generateRelationRules)(position, relation) : []);
    const allRules = [
        ...tenGodRules_1.TEN_GOD_RULES[tenGodOfDay],
        twelveStageRules_1.TWELVE_STAGE_RULES[twelveStageOfDay],
        ...relationRules,
    ];
    const selected = (0, categoryRules_1.selectCategoryTexts)(allRules);
    const categories = {
        overall: selected.overall.text,
        money: selected.money.text,
        love: selected.love.text,
        relationship: selected.relationship.text,
        work: selected.work.text,
    };
    const cautionRule = [...relationRules].filter(isCautionRule).sort((a, b) => b.priority - a.priority)[0] ?? null;
    const topRelationRules = [...relationRules].sort((a, b) => b.priority - a.priority);
    const keywords = (0, textTemplates_1.buildKeywords)(tenGodOfDay, twelveStageOfDay, topRelationRules);
    const advice = (0, textTemplates_1.buildAdvice)(cautionRule, twelveStageOfDay);
    const appliedRules = Array.from(new Set([
        selected.overall.ruleId,
        selected.money.ruleId,
        selected.love.ruleId,
        selected.relationship.ruleId,
        selected.work.ruleId,
        cautionRule?.ruleId ?? null,
    ].filter((id) => id !== null)));
    return {
        date: fortune.date,
        summary: categories.overall,
        categories,
        keywords,
        advice,
        ruleMeta: { appliedRules },
    };
}
