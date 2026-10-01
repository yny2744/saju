import { Element } from "./fiveElementTables";
/**
 * 십신(十神) 계산용 명리 규칙 테이블.
 * 이 파일도 순수 데이터만 담는다 (계산 로직은 ../tenGods.ts).
 */
export type Polarity = "양" | "음";
/** 천간의 음양 - 모든 유파가 동일하게 쓰는 확립된 기준 (이견 없음) */
export declare const STEM_POLARITY: Record<string, Polarity>;
/**
 * 지지의 음양.
 * ⚠️ DECISION REQUIRED: 지지 음양은 두 가지 견해가 있다.
 *   (1) 통상적으로 널리 쓰이는 방식: 자인진오신술=양, 축묘사미유해=음
 *   (2) 일부 유파(특히 십이운성 계산에서)는 지지의 음양을 그 지지에 대응하는
 *       "정기 지장간의 음양"과 일치시켜야 한다고 봄 (예: 사(巳)의 정기는 병(丙,양)인데
 *       사 자체는 통상 음으로 분류되어 모순처럼 보이는 지점 - 이를 "음양 착종설"이라 부름)
 *   Phase 2-2(십신)에서는 (1) 통상 방식을 채택한다. 12운성(Phase 2-4)에서 이 문제를
 *   다시 다뤄야 할 수 있다.
 */
export declare const BRANCH_POLARITY: Record<string, Polarity>;
/** 오행 상생(相生) 관계: key가 value를 생(生)한다. 확립된 기준, 이견 없음. */
export declare const ELEMENT_GENERATES: Record<Element, Element>;
/** 오행 상극(相剋) 관계: key가 value를 극(剋)한다. 확립된 기준, 이견 없음. */
export declare const ELEMENT_OVERCOMES: Record<Element, Element>;
export type TenGodName = "비견" | "겁재" | "식신" | "상관" | "편재" | "정재" | "편관" | "정관" | "편인" | "정인";
/**
 * 일간 대비 다른 글자의 오행/음양을 받아 십신을 판정한다.
 * 오행 5개 간의 관계는 "같음/상생(정방향)/상생(역방향)/상극(정방향)/상극(역방향)"
 * 5가지로 완전히 분류되므로, 이 함수는 모든 입력 조합에 대해 반드시 하나의
 * 십신을 반환한다 (누락되는 경우가 없음).
 */
export declare function determineTenGod(dayElement: Element, dayPolarity: Polarity, otherElement: Element, otherPolarity: Polarity): TenGodName;
