/**
 * Fortune Relations - 사용자 사주(4기둥) ↔ 오늘의 일진 사이의 관계 계산.
 *
 * 지시서 7조 배경:
 *   기존 relations.ts의 calculateRelations()는 "하나의 사주 4기둥 내부" 관계
 *   전용으로 설계되어 있다 (PillarPosition이 year/month/day/hour 4개로 고정된
 *   폐쇄적 구조). "사용자 사주 ↔ 오늘 일진"처럼 서로 다른 두 간지 집합 사이의
 *   관계는 이 구조에 억지로 끼워 넣을 수 없으므로 그대로 재사용하지 않는다.
 *
 *   대신 실제 판정 기준(합/충/형/파/해 테이블, 십신 판정 함수, 12운성 판정
 *   로직)은 전부 기존 모듈에서 그대로 import해서 재사용하고, "오늘 vs 사주"라는
 *   새로운 적용 방식만 이 파일에서 구현한다. 판정 테이블을 복제하지 않는다.
 */
import type { FourPillars } from "../types";
import type { PillarPosition } from "../elements";
import type { Ganzhi } from "../rules/ganzhiCycle";
import { TenGodName } from "../rules/tenGodTables";
import { TwelveStageName } from "../rules/twelveStageTables";
export interface FortunePillarRelation {
    position: PillarPosition;
    /** 오늘 천간과 이 기둥 천간이 천간합 관계인지 */
    stemCombination: boolean;
    /** 오늘 지지와 이 기둥 지지가 육합 관계인지 */
    branchCombination: boolean;
    /** 충(沖) */
    branchClash: boolean;
    /** 파(破) */
    branchDestruction: boolean;
    /** 해(害) */
    branchHarm: boolean;
    /** 형(刑) - 자묘형 또는 자형만 판정한다 (삼형은 사주 3글자+오늘 1글자 조합이라
     *  "사주 내부 관계"와 "오늘과의 관계"가 섞이는 모호한 영역이라 DECISION REQUIRED로 남긴다) */
    branchPunishment: "무례지형" | "자형" | null;
}
export interface FortuneRelationsResult {
    /** 일간(사용자) 대비 오늘 천간의 십신 - "오늘 나에게 어떤 기운이 들어오는가"의 핵심 지표 */
    tenGodOfDay: TenGodName;
    /** 일간(사용자) 대비 오늘 지지의 12운성 */
    twelveStageOfDay: TwelveStageName;
    /** 오늘 간지와 사주 각 기둥(연/월/일/시) 사이의 관계. 시주 미입력 시 hour는 생략 */
    perPillar: Partial<Record<PillarPosition, FortunePillarRelation>>;
}
export declare function calculateFortuneRelations(pillars: FourPillars, todayGanzhi: Ganzhi): FortuneRelationsResult;
