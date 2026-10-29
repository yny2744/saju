/**
 * 수능운 깊게 보기 전에 고르는 수험생 과목 (2026-10-30 유샘).
 *   계열 → 수학 선택 → 탐구 두 과목 (예체능은 실기 여부 하나 더). 버튼으로만 고르고, 건너뛰어도 된다.
 *   AI 깊게 보기의 "남은 날 과목별 공부 리듬"·"시험날 교시마다 기운의 흐름"에 반영한다.
 *   이름·생년월일과 무관한 값이라 그대로 AI에 보내도 된다.
 */
export type ExamTrack = "문과" | "이과" | "예체능";

export const EXAM_TRACKS: ExamTrack[] = ["문과", "이과", "예체능"];
export const EXAM_MATH = ["확률과 통계", "미적분", "기하"] as const;
export const SOCIAL = ["생활과 윤리", "윤리와 사상", "한국지리", "세계지리", "동아시아사", "세계사", "경제", "정치와 법", "사회·문화"] as const;
export const SCIENCE = ["물리학Ⅰ", "화학Ⅰ", "생명과학Ⅰ", "지구과학Ⅰ", "물리학Ⅱ", "화학Ⅱ", "생명과학Ⅱ", "지구과학Ⅱ"] as const;

export interface ExamProfile {
  track: ExamTrack;
  math: (typeof EXAM_MATH)[number] | null;
  inquiry: string[];
  practical: boolean;
}

/** 계열마다 먼저 보여 줄 탐구 과목 (문과는 사회, 이과는 과학, 예체능은 둘 다) */
export function inquiryOptions(track: ExamTrack): string[] {
  if (track === "문과") return [...SOCIAL, ...SCIENCE];
  if (track === "이과") return [...SCIENCE, ...SOCIAL];
  return [...SOCIAL, ...SCIENCE];
}

const ALL_INQUIRY = new Set<string>([...SOCIAL, ...SCIENCE]);

/** 브라우저·요청에서 받은 값을 믿을 수 있는 모양으로 (모르는 값은 버린다) */
export function sanitizeExamProfile(v: unknown): ExamProfile | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  if (!EXAM_TRACKS.includes(o.track as ExamTrack)) return null;
  const math = (EXAM_MATH as readonly string[]).includes(o.math as string) ? (o.math as ExamProfile["math"]) : null;
  const inquiry = Array.isArray(o.inquiry) ? [...new Set(o.inquiry.filter((x): x is string => typeof x === "string" && ALL_INQUIRY.has(x)))].slice(0, 2) : [];
  return { track: o.track as ExamTrack, math, inquiry, practical: o.track === "예체능" && o.practical === true };
}

/** AI에 넘길 줄 */
export function examProfileLines(p: ExamProfile | null): string {
  if (!p) return "";
  return [
    `- 계열: ${p.track}`,
    p.math ? `- 수학 선택: ${p.math}` : "",
    p.inquiry.length ? `- 탐구: ${p.inquiry.join(", ")}` : "",
    p.track === "예체능" ? `- 실기: ${p.practical ? "수능 뒤 실기 시험도 봄" : "실기 없음 또는 모름"}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

/** 기기에 잠깐 기억 (깊게 보기 결제 → 풀이 쓰기 사이) */
export const examProfileKey = (personId: string) => `ryugyeol_exam_profile_${personId}`;
