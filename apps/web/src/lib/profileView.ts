/** 저장한 사람(수정안 3번) - 화면용 타입과 요약 문구. 서버의 SajuProfile과 같은 모양이다. */
export interface SavedProfile {
  id: string;
  name: string;
  hanjaName: string | null;
  gender: "male" | "female";
  calendarType: "solar" | "lunar";
  isLeapMonth: boolean;
  date: string;
  time: string | null;
  birthCity: string | null;
}

/** 예: "1967.4.3 04:50 양력", "1970.4.12 시간 모름 음력(윤달)" */
export function profileSummary(p: Pick<SavedProfile, "date" | "time" | "calendarType" | "isLeapMonth">): string {
  const [y, m, d] = p.date.split("-").map(Number);
  const cal = p.calendarType === "solar" ? "양력" : p.isLeapMonth ? "음력(윤달)" : "음력";
  return `${y}.${m}.${d} ${p.time ?? "시간 모름"} ${cal}`;
}
