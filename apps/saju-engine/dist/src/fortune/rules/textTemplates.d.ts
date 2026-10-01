/**
 * 오늘의 키워드 / 오늘의 조언 생성 템플릿.
 * 계산된 규칙 결과(선택된 카테고리 규칙, 십신, 12운성)를 짧은 태그와 한 줄
 * 조언으로 압축한다. 순수 문자열 조합 로직만 담고, 판정 로직은 없다.
 */
import type { TenGodName } from "../../rules/tenGodTables";
import type { TwelveStageName } from "../../rules/twelveStageTables";
import type { FortuneRule } from "./types";
export declare function buildKeywords(tenGodOfDay: TenGodName, twelveStageOfDay: TwelveStageName, topRelationRules: FortuneRule[]): string[];
/**
 * 조언은 "가장 주의가 필요한 규칙"이 있으면 그것을 우선 채택하고, 없으면
 * 12운성 기반의 일반적인 조언으로 대체한다.
 */
export declare function buildAdvice(cautionRule: FortuneRule | null, twelveStageOfDay: TwelveStageName): string;
