/**
 * Phase 8 지시서 5-D조: "기술적인 내부 키가 사용자에게 그대로 노출되지 않도록 한다."
 *
 * InterpretationResult.analysis의 키는 상품 유형(FREE_BASIC/LOVE_3900/...)마다
 * 다르다 (saju-engine/src/prompts/productTemplates.ts 참고, 이 파일은 그쪽을
 * 절대 수정하지 않고 "존재하는 키를 화면에 어떻게 보여줄지"만 담당한다).
 *
 * 여기 없는 키를 만났을 때(향후 상품 템플릿이 추가되는 경우 등) 빈 화면이 되지
 * 않도록, humanize()가 camelCase를 사람이 읽을 수 있는 형태로 변환하는
 * 안전한 대체값을 제공한다.
 */
export const ANALYSIS_FIELD_LABELS: Record<string, string> = {
  // FREE_BASIC / PREMIUM_9900 공통 카테고리
  temperament: "성향",
  career: "직업·진로",
  wealth: "재물운",
  love: "연애운",
  relationship: "인간관계",
  yearlyFlow: "올해의 흐름",
  caution: "주의할 점",
  opportunity: "기회",

  // LOVE_3900
  loveStyle: "연애 스타일",
  idealPartnerType: "이상적인 상대",
  currentFlow: "현재 흐름",
  challenges: "주의할 점",
  actionGuide: "실천 가이드",

  // MONEY_3900
  wealthStructure: "재물의 구조",
  incomeStyle: "수입 스타일",
  riskAreas: "관리 시 주의점",

  // CAREER_3900
  careerAptitude: "커리어 적성",
  suitableFields: "어울리는 분야",

  // YEARLY_3900
  yearOverview: "올해 총운",
  quarterlyFlow: "분기별 흐름",
  keyMonths: "중요한 시기",

  // PREMIUM_9900
  sajuOverview: "사주 총평",
  monthlyFlow: "월별 흐름",
  importantPeriods: "중요 시기",
};

const QUARTER_LABELS: Record<string, string> = {
  q1: "1분기",
  q2: "2분기",
  q3: "3분기",
  q4: "4분기",
};

export function quarterLabel(key: string): string {
  return QUARTER_LABELS[key] ?? key;
}

/** camelCase 키 -> "Camel Case" 형태로 풀어주는 안전한 대체 표시 (사전에 없는 키용) */
function humanize(key: string): string {
  const spaced = key.replace(/([a-z0-9])([A-Z])/g, "$1 $2");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export function labelFor(key: string): string {
  return ANALYSIS_FIELD_LABELS[key] ?? humanize(key);
}

export function isQuarterlyFlow(value: unknown): value is Record<string, string> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    ["q1", "q2", "q3", "q4"].every((q) => typeof (value as Record<string, unknown>)[q] === "string")
  );
}

export function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((v) => typeof v === "string");
}

/**
 * saju-engine의 PRODUCT_TEMPLATES[type].displayName과 같은 문자열을 그대로
 * 복사해왔다 (엔진 쪽 정의는 절대 수정하지 않음 - 지시서 3조).
 *
 * saju-engine 패키지를 그대로 import하지 않는 이유: 이 라벨은 result/paid
 * 화면("use client")에서 쓰는데, "saju-engine"을 client 컴포넌트에서 import하면
 * lunar-javascript를 포함한 계산 엔진 전체가 브라우저 번들에 딸려 들어가
 * 페이지 하나의 First Load JS가 십수 배로 불어난다. 표시용 문자열 몇 개를 위해
 * 무거운 서버 전용 패키지를 클라이언트에 실을 이유가 없어서, 필요한 문자열만
 * 별도로 들고 있는다. saju-engine의 displayName이 바뀌면 이 맵도 같이 갱신해야
 * 한다는 점은 남아있는 위험 요소로 최종 보고서에 기재한다.
 */
const ENGINE_PRODUCT_LABELS: Record<string, string> = {
  FREE_BASIC: "무료 기본 사주 분석",
  LOVE_3900: "연애·결혼 심층 분석",
  MONEY_3900: "재물·사업 심층 분석",
  CAREER_3900: "직업·커리어 심층 분석",
  YEARLY_3900: "연간 운세 심층 분석",
  PREMIUM_9900: "종합 사주 프리미엄 리포트",
};

export function engineProductLabel(key: string): string {
  return ENGINE_PRODUCT_LABELS[key] ?? key;
}
