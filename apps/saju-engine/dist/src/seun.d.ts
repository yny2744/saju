import { TenGodName } from "./rules/tenGodTables";
import type { FourPillars } from "./types";
import type { Ganzhi } from "./rules/ganzhiCycle";
export interface SeunResult {
    /** 조회 대상 연도 (양력 기준) */
    year: number;
    /** 해당 연도의 간지 */
    pillar: Ganzhi;
    /** 일간 대비 이 연도 천간의 십신 (AI 해석에 바로 쓸 수 있도록 미리 계산해서 제공) */
    tenGod: TenGodName;
}
/**
 * 특정 연도의 세운(연간지)을 계산하고, 그 사주 원국의 일간을 기준으로 한
 * 십신까지 함께 제공한다. LLM을 호출하지 않는다 (Phase 2 원칙 1).
 *
 * @param pillars 사주 원국 (일간을 기준으로 세운의 십신을 계산하기 위해 필요)
 * @param year 조회할 연도 (양력). 생략 시 호출부(index.ts)에서 현재 연도를 넘겨준다.
 */
export declare function calculateSeun(pillars: FourPillars, year: number): SeunResult;
