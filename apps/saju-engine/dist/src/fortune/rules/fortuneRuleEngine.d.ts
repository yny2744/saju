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
import type { FortuneCategory } from "./types";
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
export declare function interpretFortune(fortune: FortuneJson): FortuneResultJson;
