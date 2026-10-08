/**
 * 한 해의 월건(月建) - 절기 기준 열두 달의 간지 (2026-10-08, 월별 운세용).
 *
 * 규칙(명리학 표준, 계산이 정해져 있어 AI에게 맡기지 않는다):
 *  - 월지는 입춘(양력 2월 초) 무렵의 寅월부터 子·丑월(다음 해 1월)까지 고정 순서.
 *  - 寅월의 천간은 그해 연간으로 정해진다 (갑기년→丙寅, 을경년→戊寅, 병신년→庚寅, 정임년→壬寅, 무계년→甲寅).
 *  - 연간은 (연도 - 4) % 10 (甲=0). 입춘 전의 1월은 다음 해 표의 丑월이 아니라 그 전해의 丑월이다.
 */

const STEMS = ["갑", "을", "병", "정", "무", "기", "경", "신", "임", "계"];
const BRANCHES_FROM_IN = ["인", "묘", "진", "사", "오", "미", "신", "유", "술", "해", "자", "축"];
/** 寅월부터 순서대로, 그 월이 시작되는 절기와 대략의 양력 월 */
const MONTH_LABELS = [
  "2월 (입춘~)",
  "3월 (경칩~)",
  "4월 (청명~)",
  "5월 (입하~)",
  "6월 (망종~)",
  "7월 (소서~)",
  "8월 (입추~)",
  "9월 (백로~)",
  "10월 (한로~)",
  "11월 (입동~)",
  "12월 (대설~)",
  "다음 해 1월 (소한~)",
];

/** 연간 → 寅월 천간 시작 인덱스 */
const IN_MONTH_STEM_START = [2, 4, 6, 8, 0]; // 갑기→병(2), 을경→무(4), 병신→경(6), 정임→임(8), 무계→갑(0)

export interface MonthPillar {
  label: string;
  ganzhi: string;
}

export function monthPillarsOfYear(year: number): MonthPillar[] {
  const yearStem = (((year - 4) % 10) + 10) % 10;
  const start = IN_MONTH_STEM_START[yearStem % 5];
  return BRANCHES_FROM_IN.map((b, i) => ({
    label: MONTH_LABELS[i],
    ganzhi: `${STEMS[(start + i) % 10]}${b}`,
  }));
}
