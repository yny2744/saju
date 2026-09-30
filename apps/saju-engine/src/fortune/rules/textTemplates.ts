/**
 * 오늘의 키워드 / 오늘의 조언 생성 템플릿.
 * 계산된 규칙 결과(선택된 카테고리 규칙, 십신, 12운성)를 짧은 태그와 한 줄
 * 조언으로 압축한다. 순수 문자열 조합 로직만 담고, 판정 로직은 없다.
 */
import type { TenGodName } from "../../rules/tenGodTables";
import type { TwelveStageName } from "../../rules/twelveStageTables";
import type { FortuneRule } from "./types";

const TEN_GOD_KEYWORD: Record<TenGodName, string> = {
  비견: "주관",
  겁재: "속도조절",
  식신: "여유",
  상관: "표현",
  편재: "변동",
  정재: "결실",
  편관: "긴장",
  정관: "책임",
  편인: "전환",
  정인: "안정",
};

const STAGE_KEYWORD: Record<TwelveStageName, string> = {
  장생: "시작",
  목욕: "변화",
  관대: "자신감",
  임관: "실행력",
  제왕: "절정",
  쇠: "조절",
  병: "휴식",
  사: "마무리",
  묘: "정리",
  절: "전환점",
  태: "준비",
  양: "축적",
};

/** 관계 규칙 ruleId 접미사 → 짧은 키워드 (relationRules.ts의 ruleId 패턴과 짝을 맞춘다) */
const RELATION_KEYWORD: Record<string, string> = {
  clash: "변수",
  punishment: "예민함",
  destruction: "차질",
  harm: "신중함",
  combination: "화합",
  "stem-combination": "귀인",
};

export function buildKeywords(
  tenGodOfDay: TenGodName,
  twelveStageOfDay: TwelveStageName,
  topRelationRules: FortuneRule[]
): string[] {
  const keywords = new Set<string>();
  keywords.add(TEN_GOD_KEYWORD[tenGodOfDay]);
  keywords.add(STAGE_KEYWORD[twelveStageOfDay]);

  for (const rule of topRelationRules) {
    const suffix = rule.ruleId.split("-").slice(2).join("-"); // relation-{position}-{suffix}
    const keyword = RELATION_KEYWORD[suffix];
    if (keyword) keywords.add(keyword);
    if (keywords.size >= 4) break;
  }

  return Array.from(keywords).slice(0, 4);
}

/**
 * 조언은 "가장 주의가 필요한 규칙"이 있으면 그것을 우선 채택하고, 없으면
 * 12운성 기반의 일반적인 조언으로 대체한다.
 */
export function buildAdvice(cautionRule: FortuneRule | null, twelveStageOfDay: TwelveStageName): string {
  if (cautionRule) {
    return cautionRule.text;
  }
  const stageAdvice: Partial<Record<TwelveStageName, string>> = {
    제왕: "자신감은 좋지만 주변 의견에도 귀 기울이면 더 좋은 하루가 될 거예요.",
    목욕: "중요한 결정은 하루 정도 미루고 다시 생각해보는 게 좋아요.",
    쇠: "무리한 약속보다는 할 수 있는 만큼만 계획하세요.",
    병: "오늘은 몸을 챙기는 걸 우선순위에 두세요.",
  };
  return stageAdvice[twelveStageOfDay] ?? "평소의 페이스를 유지하면서 차분하게 하루를 보내세요.";
}
