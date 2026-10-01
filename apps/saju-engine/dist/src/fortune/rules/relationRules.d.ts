/**
 * 사주 각 기둥(연/월/일/시) ↔ 오늘 일진의 관계(합/충/파/해/형) → 해석 규칙.
 *
 * 전통적으로 일지(日支)는 배우자궁/자기 자신, 월지는 사회활동/직장, 연지는
 * 대외적 관계, 시지는 개인적 영역과 연결짓는 경우가 많다. 이 대응 역시
 * 유파별 이견이 있을 수 있는 영역이라 문구는 보수적으로 작성했다.
 *
 * 우선순위 원칙(지시서 9조): 일주(day) 관계를 가장 높은 priority로 두고,
 * 월주(month) > 연주(year) ≈ 시주(hour) 순으로 낮춘다. 충/형처럼 강한 관계는
 * 육합처럼 약한 관계보다 priority를 높게 준다.
 */
import type { PillarPosition } from "../../elements";
import type { FortunePillarRelation } from "../fortuneRelations";
import type { FortuneRule } from "./types";
export declare function generateRelationRules(position: PillarPosition, relation: FortunePillarRelation): FortuneRule[];
