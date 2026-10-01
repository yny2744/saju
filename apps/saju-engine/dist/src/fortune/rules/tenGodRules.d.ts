/**
 * 십신(十神) → 카테고리별 해석 문구 테이블.
 *
 * 지시서 8조: "Rule 조건 → 해석 의미 → 카테고리 → 우선순위 → 문장" 구조.
 * 계산 코드(fortuneRelations.ts)와 해석 문구(이 파일)를 분리해서, 향후 문구
 * 수정 시 계산 로직을 건드리지 않아도 되게 한다.
 *
 * 전통적 십신-영역 대응(재성=재물, 관성=직장/책임, 식상=표현/연애, 인성=안정,
 * 비겁=자기주장/대인관계)을 기반으로 하되, 유파에 따라 세부 해석은 갈릴 수
 * 있다는 점을 명시한다 — DECISION REQUIRED 성격의 영역이므로 문구는 보수적으로
 * 작성했다.
 */
import type { TenGodName } from "../../rules/tenGodTables";
import type { FortuneRule } from "./types";
export declare const TEN_GOD_RULES: Record<TenGodName, FortuneRule[]>;
