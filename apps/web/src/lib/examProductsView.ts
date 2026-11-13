/** 수능 심층분석 상품 이름·부제 - 화면(클라이언트)에서도 쓰도록 엔진을 부르지 않는 파일 (2026-11-13) */
export const EXAM_EXTRA_KINDS = ["goal", "focus", "calm"] as const;
export type ExamExtraKind = (typeof EXAM_EXTRA_KINDS)[number];
export const EXAM_EXTRA_TITLE: Record<ExamExtraKind, string> = { goal: "목표 성취운", focus: "집중과 몰입운", calm: "시험 컨디션 안정운" };
/** 카드·결제 전 화면에 보이는 부제 (2026-11-12 유샘 확정) */
export const EXAM_EXTRA_SUB: Record<ExamExtraKind, string[]> = {
  goal: ["목표 달성을 위한 사주적 흐름", "노력에 따른 성과와 결실의 가능성", "바라는 목표와 타고난 기질의 조화"],
  focus: ["타고난 집중력과 학습 능력", "몰입을 높이는 환경과 학습 방식", "집중을 방해하는 요소와 극복 방향"],
  calm: ["긴장과 불안에 대처하는 심리적 성향", "시험 전후 체력과 컨디션 변화", "예상치 못한 상황에 대한 대처와 안정 방향"],
};
export const EXAM_DEEP_SUB = ["타고난 공부 체질과 학습 성향", "시기별 공부 리듬과 학습 흐름", "수능 당일 기운과 시간대별 변화", "나만의 행운 색상·숫자·방향·소품"];
export function isExamExtraKind(v: unknown): v is ExamExtraKind {
  return typeof v === "string" && (EXAM_EXTRA_KINDS as readonly string[]).includes(v);
}
