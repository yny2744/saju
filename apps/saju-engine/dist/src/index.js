"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateSajuFreeInterpretation = exports.KST_TIME_ZONE = exports.assertValidDateString = exports.getCurrentKstYear = exports.getTodayKstDateString = exports.interpretFortune = exports.calculateFortuneRelations = exports.calculateDailyGanzhi = exports.calculateFortune = exports.PRODUCT_TEMPLATES = exports.buildSajuPrompt = exports.calculateSeun = exports.calculateDaeun = exports.calculateTwelveStages = exports.calculateRelations = exports.calculateTenGods = exports.calculateElements = exports.calculateFourPillars = void 0;
exports.calculateSaju = calculateSaju;
const pillars_1 = require("./pillars");
const elements_1 = require("./elements");
const tenGods_1 = require("./tenGods");
const relations_1 = require("./relations");
const twelveStages_1 = require("./twelveStages");
const daeun_1 = require("./daeun");
const seun_1 = require("./seun");
__exportStar(require("./types"), exports);
var pillars_2 = require("./pillars");
Object.defineProperty(exports, "calculateFourPillars", { enumerable: true, get: function () { return pillars_2.calculateFourPillars; } });
var elements_2 = require("./elements");
Object.defineProperty(exports, "calculateElements", { enumerable: true, get: function () { return elements_2.calculateElements; } });
var tenGods_2 = require("./tenGods");
Object.defineProperty(exports, "calculateTenGods", { enumerable: true, get: function () { return tenGods_2.calculateTenGods; } });
var relations_2 = require("./relations");
Object.defineProperty(exports, "calculateRelations", { enumerable: true, get: function () { return relations_2.calculateRelations; } });
var twelveStages_2 = require("./twelveStages");
Object.defineProperty(exports, "calculateTwelveStages", { enumerable: true, get: function () { return twelveStages_2.calculateTwelveStages; } });
var daeun_2 = require("./daeun");
Object.defineProperty(exports, "calculateDaeun", { enumerable: true, get: function () { return daeun_2.calculateDaeun; } });
var seun_2 = require("./seun");
Object.defineProperty(exports, "calculateSeun", { enumerable: true, get: function () { return seun_2.calculateSeun; } });
var promptBuilder_1 = require("./prompts/promptBuilder");
Object.defineProperty(exports, "buildSajuPrompt", { enumerable: true, get: function () { return promptBuilder_1.buildSajuPrompt; } });
var productTemplates_1 = require("./prompts/productTemplates");
Object.defineProperty(exports, "PRODUCT_TEMPLATES", { enumerable: true, get: function () { return productTemplates_1.PRODUCT_TEMPLATES; } });
// Phase 3: AI Interpretation Engine
__exportStar(require("./ai"), exports);
// Fortune Engine (오늘의 운세) - 기존 Saju Engine과 완전히 독립된 모듈
var fortune_1 = require("./fortune/fortune");
Object.defineProperty(exports, "calculateFortune", { enumerable: true, get: function () { return fortune_1.calculateFortune; } });
var dailyGanzhi_1 = require("./fortune/dailyGanzhi");
Object.defineProperty(exports, "calculateDailyGanzhi", { enumerable: true, get: function () { return dailyGanzhi_1.calculateDailyGanzhi; } });
var fortuneRelations_1 = require("./fortune/fortuneRelations");
Object.defineProperty(exports, "calculateFortuneRelations", { enumerable: true, get: function () { return fortuneRelations_1.calculateFortuneRelations; } });
var fortuneRuleEngine_1 = require("./fortune/rules/fortuneRuleEngine");
Object.defineProperty(exports, "interpretFortune", { enumerable: true, get: function () { return fortuneRuleEngine_1.interpretFortune; } });
var kstDate_1 = require("./kstDate");
Object.defineProperty(exports, "getTodayKstDateString", { enumerable: true, get: function () { return kstDate_1.getTodayKstDateString; } });
Object.defineProperty(exports, "getCurrentKstYear", { enumerable: true, get: function () { return kstDate_1.getCurrentKstYear; } });
Object.defineProperty(exports, "assertValidDateString", { enumerable: true, get: function () { return kstDate_1.assertValidDateString; } });
Object.defineProperty(exports, "KST_TIME_ZONE", { enumerable: true, get: function () { return kstDate_1.KST_TIME_ZONE; } });
// 무료 사주(FREE_BASIC) 규칙 기반 해석 - AI 미사용. fortuneRuleEngine과 같은 설계 원칙.
var sajuFreeRuleEngine_1 = require("./freeInterpretation/sajuFreeRuleEngine");
Object.defineProperty(exports, "generateSajuFreeInterpretation", { enumerable: true, get: function () { return sajuFreeRuleEngine_1.generateSajuFreeInterpretation; } });
/**
 * Phase 1+2-1~2-6 범위: 4기둥 + 오행 + 십신 + 합충형파해 + 12운성 + 대운 + 세운까지
 * 표준 Saju JSON으로 반환한다.
 *
 * 원칙(명세서 12조, Phase 2 원칙 1): 순수 결정론적 계산만 수행하며 LLM을 호출하지 않는다.
 *
 * @param input 사주 계산 입력값 (생년월일시, 성별 등)
 * @param year 세운을 조회할 연도 (필수). "올해 자동 계산" 같은 기본값 정책은
 *   이번 연동 작업 범위에 포함하지 않았다 - 호출부가 명시적으로 연도를 지정해야 한다.
 */
function calculateSaju(input, year) {
    const { pillars, meta } = (0, pillars_1.calculateFourPillars)(input);
    const elements = (0, elements_1.calculateElements)(pillars);
    const tenGods = (0, tenGods_1.calculateTenGods)(pillars);
    const relations = (0, relations_1.calculateRelations)(pillars);
    const twelveStages = (0, twelveStages_1.calculateTwelveStages)(pillars);
    const daeun = (0, daeun_1.calculateDaeun)(pillars, meta, input.gender);
    const seun = (0, seun_1.calculateSeun)(pillars, year);
    return {
        birth: {
            calendarType: input.calendarType,
            date: input.date,
            time: input.time,
            gender: input.gender,
            // birthPlace는 의도적으로 출력에서 제외한다 (개인정보 최소화 원칙, 명세서 5조/23조).
        },
        pillars,
        elements,
        tenGods,
        relations,
        twelveStages,
        daeun,
        seun,
        calculationMeta: meta,
    };
}
