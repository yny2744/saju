import type { SajuInput, SajuJson } from "./types";
export * from "./types";
export { calculateFourPillars } from "./pillars";
export { calculateElements } from "./elements";
export type { ElementsResult, PillarPosition } from "./elements";
export { calculateTenGods } from "./tenGods";
export type { TenGodsResult, BranchTenGodResult, HiddenStemTenGod } from "./tenGods";
export { calculateRelations } from "./relations";
export type { RelationsResult, CombinationEntry, ClashEntry, PunishmentEntry, DestructionEntry, HarmEntry, } from "./relations";
export { calculateTwelveStages } from "./twelveStages";
export type { TwelveStagesResult } from "./twelveStages";
export { calculateDaeun } from "./daeun";
export type { DaeunResult, DaeunPeriod } from "./daeun";
export { calculateSeun } from "./seun";
export type { SeunResult } from "./seun";
export { buildSajuPrompt } from "./prompts/promptBuilder";
export { PRODUCT_TEMPLATES } from "./prompts/productTemplates";
export type { ProductType } from "./prompts/productTemplates";
export * from "./ai";
export { calculateFortune } from "./fortune/fortune";
export type { FortuneJson, FortuneCalculationMeta } from "./fortune/fortune";
export { calculateDailyGanzhi } from "./fortune/dailyGanzhi";
export { calculateFortuneRelations } from "./fortune/fortuneRelations";
export type { FortuneRelationsResult, FortunePillarRelation } from "./fortune/fortuneRelations";
export { interpretFortune } from "./fortune/rules/fortuneRuleEngine";
export type { FortuneResultJson } from "./fortune/rules/fortuneRuleEngine";
export type { FortuneCategory } from "./fortune/rules/types";
export { getTodayKstDateString, getCurrentKstYear, assertValidDateString, KST_TIME_ZONE } from "./kstDate";
export { generateSajuFreeInterpretation } from "./freeInterpretation/sajuFreeRuleEngine";
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
export declare function calculateSaju(input: SajuInput, year: number): SajuJson;
