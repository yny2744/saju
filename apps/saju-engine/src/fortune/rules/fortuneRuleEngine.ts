/**
 * Fortune Rule Engine.
 *
 * 지시서 3조: 이번 챕터는 AI를 호출하지 않는다. Fortune Engine이 계산한
 * 결정론적 데이터(십신/12운성/합충형파해)를 규칙 기반으로 사람이 읽는 문장으로
 * 변환하는 것이 이 모듈의 유일한 역할이다.
 *
 * 계산(fortune.ts, fortuneRelations.ts 등)과 해석 문구(rules/*.ts)를 분리해서,
 * 향후 AI Provider를 붙이더라도(다음 챕터) 이 Rule Engine은 "AI 미사용 무료
 * 버전"으로 그대로 남겨둘 수 있다.
 */
import type { FortuneJson } from "../fortune";
import { TEN_GOD_RULES } from "./tenGodRules";
import { TWELVE_STAGE_RULES } from "./twelveStageRules";
import { generateRelationRules } from "./relationRules";
import { selectCategoryTexts } from "./categoryRules";
import { buildKeywords, buildAdvice } from "./textTemplates";
import type { FortuneCategory, FortuneRule } from "./types";

export interface FortuneResultJson {
  date: string;
  summary: string;
  categories: Record<FortuneCategory, string>;
  keywords: string[];
  advice: string;
  /** 개발 검수용 메타데이터. 사용자 화면에는 노출하지 않는다 (지시서 10조). */
  ruleMeta: {
    appliedRules: string[];
  };
}

const CAUTION_SUFFIXES = ["clash", "punishment", "destruction", "harm"];

function isCautionRule(rule: FortuneRule): boolean {
  return CAUTION_SUFFIXES.some((suffix) => rule.ruleId.endsWith(`-${suffix}`));
}

export function interpretFortune(fortune: FortuneJson): FortuneResultJson {
  const { tenGodOfDay, twelveStageOfDay, perPillar } = fortune.relationToday;

  const relationRules: FortuneRule[] = Object.entries(perPillar).flatMap(([position, relation]) =>
    relation ? generateRelationRules(position as keyof typeof perPillar, relation) : []
  );

  const allRules: FortuneRule[] = [
    ...TEN_GOD_RULES[tenGodOfDay],
    TWELVE_STAGE_RULES[twelveStageOfDay],
    ...relationRules,
  ];

  const selected = selectCategoryTexts(allRules);

  const categories: Record<FortuneCategory, string> = {
    overall: selected.overall.text,
    money: selected.money.text,
    love: selected.love.text,
    relationship: selected.relationship.text,
    work: selected.work.text,
  };

  const cautionRule =
    [...relationRules].filter(isCautionRule).sort((a, b) => b.priority - a.priority)[0] ?? null;

  const topRelationRules = [...relationRules].sort((a, b) => b.priority - a.priority);

  const keywords = buildKeywords(tenGodOfDay, twelveStageOfDay, topRelationRules);
  const advice = buildAdvice(cautionRule, twelveStageOfDay);

  const appliedRules = Array.from(
    new Set(
      [
        selected.overall.ruleId,
        selected.money.ruleId,
        selected.love.ruleId,
        selected.relationship.ruleId,
        selected.work.ruleId,
        cautionRule?.ruleId ?? null,
      ].filter((id): id is string => id !== null)
    )
  );

  return {
    date: fortune.date,
    summary: categories.overall,
    categories,
    keywords,
    advice,
    ruleMeta: { appliedRules },
  };
}
