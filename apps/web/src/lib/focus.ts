/**
 * 입력 화면 ③ "가장 궁금한 것" (2026-10-05, 유샘 확정: 무료 결과 강조 + 990원 AI 풀이 둘 다).
 * 결과(resultStore)에 함께 저장해서, 무료 결과는 그 분야를 먼저 보여주고 유료 풀이에서도 꺼내 쓸 수 있게 한다.
 */
export type Focus = "love" | "work" | "health" | "relationship";

export const FOCUS_OPTIONS: Array<{ value: Focus; label: string; hanja: string }> = [
  { value: "love", label: "연애 · 결혼", hanja: "戀愛·結婚" },
  { value: "work", label: "직업 · 재물", hanja: "職業·財物" },
  { value: "health", label: "건강", hanja: "健康" },
  { value: "relationship", label: "인간관계", hanja: "人間關係" },
];

export function isFocus(v: unknown): v is Focus {
  return v === "love" || v === "work" || v === "health" || v === "relationship";
}

export function focusLabel(f: Focus): string {
  return FOCUS_OPTIONS.find((o) => o.value === f)?.label ?? "";
}

/** 무료 결과 "나의 기본 성향" 표에서 먼저 보여줄 줄 */
export const FOCUS_TRAIT_KEYS: Record<Focus, string[]> = {
  love: ["love"],
  work: ["career", "wealth"],
  health: [],
  relationship: ["relationship"],
};
