import { Polarity } from "./tenGodTables";

/**
 * 12운성(十二運星) 계산용 명리 규칙 테이블.
 * 순수 데이터만 담는다 (계산 로직은 ../twelveStages.ts).
 */

export const STAGE_NAMES = [
  "장생", "목욕", "관대", "임관", "제왕", "쇠",
  "병", "사", "묘", "절", "태", "양",
] as const;

export type TwelveStageName = (typeof STAGE_NAMES)[number];

/** 지지 순환 순서(자축인묘진사오미신유술해) - 순행/역행 방향 계산의 기준. */
export const BRANCH_ORDER = ["자", "축", "인", "묘", "진", "사", "오", "미", "신", "유", "술", "해"];
export const BRANCH_INDEX: Record<string, number> = Object.fromEntries(
  BRANCH_ORDER.map((b, i) => [b, i])
);

/**
 * 천간별 12운성 시작점(장생 위치).
 *
 * ⚠️ DECISION REQUIRED (무토/기토의 장생 위치 - 유파 간 이견이 큰 지점):
 *   전통적으로 "화토동법(火土同法)" 원칙에 따라 무토는 병화와, 기토는 정화와
 *   같은 시작점을 쓰는 것이 통설이다 (여기서 채택한 방식). 그러나 일부 유파
 *   ("포태법" 계통)는 토(土)에 별도의 독자적 순환을 적용해서 무토 장생=신(申),
 *   기토 장생=묘(卯)로 완전히 다른 표를 쓴다. 두 견해 모두 실제 사용되고 있어
 *   상용 서비스 적용 전 명리학 전문가 검수 후 확정이 필요하다.
 */
export const STEM_START_BRANCH: Record<string, string> = {
  갑: "해",
  을: "오",
  병: "인",
  정: "유",
  무: "인", // DECISION REQUIRED 위 참고 (화토동법 채택)
  기: "유", // DECISION REQUIRED 위 참고 (화토동법 채택)
  경: "사",
  신: "자",
  임: "신",
  계: "묘",
};

/**
 * 천간의 음양에 따른 순행/역행.
 * 이 엔진에서 채택한 원칙: "양간은 순행, 음간은 역행"이라는 정통 통설을 그대로 적용.
 */
export function isForward(polarity: Polarity): boolean {
  return polarity === "양";
}
