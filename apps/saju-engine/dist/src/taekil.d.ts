import { type Element } from "./rules/fiveElementTables";
/**
 * 택일 (2026-11-01 유샘 승인 기준) - 목적·달을 고르면 그 달에서 좋은 날을 고른다. AI 없음, 결정론적.
 * 날마다의 값(일진·음력 날짜·건제12신·황도/흑도·황력 宜忌)은 lunar-javascript(MIT)가 주는 값을 그대로 쓴다.
 *
 * 가) 빼는 날 (하나라도 걸리면 제외)
 *   1. 기준일(오늘)까지의 날   2. 그날 일지가 본인 띠(연지)와 충   3. 그날 일지가 본인 일지와 충
 *   4. 황력에서 그 목적을 꺼리는(忌) 날   5. 건제12신 破·閉   6. 이사는 손 없는 날(음력 끝자리 9·0)만
 * 나) 점수
 *   7. 황력에서 그 목적이 좋은(宜) 날 +3   8. 건제12신이 목적에 맞는 날 +2   9. 황도일 +1
 *   10. 그날 천간·지지 오행이 본인의 남은 작은 빈자리 오행 +1   11. 이사가 아닌 목적도 손 없는 날이면 +1
 *   12. 결혼은 주말(토·일) +1 (같은 날 유샘 승인, 지니 추천)
 * 다) 점수 높은 순 3~5개, 같은 점수면 이른 날. 이유 한 줄은 맞은 조건을 이어 붙인다.
 */
export type TaekilPurpose = "move" | "wedding" | "opening" | "contract";
export declare const TAEKIL_PURPOSES: Record<TaekilPurpose, {
    name: string;
    verb: string;
    yi: string[];
    good: string[];
}>;
/** 건제12신 간체 → [한글, 한자(번체)] */
export declare const ZHI_XING: Record<string, [string, string]>;
export interface TaekilInput {
    purpose: TaekilPurpose;
    year: number;
    /** 1~12 */
    month: number;
    /** 이 날짜(YYYY-MM-DD)까지는 고르지 않는다 - 보통 오늘 */
    after: string;
    /** 본인 연지(띠)·일지 (한글, 예: "오", "자") */
    yearBranch: string;
    dayBranch: string;
    /** 남은 작은 빈자리 오행 (없으면 가점 없음) */
    neededElements?: Element[];
}
export interface TaekilDay {
    date: string;
    weekday: string;
    lunar: string;
    ganzhi: string;
    zhiXing: string;
    score: number;
    reason: string;
}
export interface TaekilResult {
    purpose: TaekilPurpose;
    year: number;
    month: number;
    days: TaekilDay[];
    /** 빼는 날 기준을 통과한 날 수 */
    passed: number;
}
/** 하루 판정 - 빠지면 null */
export declare function judgeDay(input: TaekilInput, date: string): TaekilDay | null;
/** 그 달에서 좋은 날 3~5개 */
export declare function recommendDays(input: TaekilInput): TaekilResult;
