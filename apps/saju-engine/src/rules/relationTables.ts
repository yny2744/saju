import { Element } from "./fiveElementTables";

/**
 * 합·충·형·파·해 계산용 명리 규칙 테이블.
 * 이 파일은 순수 데이터만 담는다 (계산 로직은 ../relations.ts).
 */

// ============ 천간합 (天干合) ============
// 5쌍, 합쳐지면 새로운 오행 기운(화기)이 생긴다는 것이 정통 이론.
// 확립된 기준, 이견 거의 없음.
export const STEM_COMBINATIONS: Array<{ pair: [string, string]; resultElement: Element }> = [
  { pair: ["갑", "기"], resultElement: "토" },
  { pair: ["을", "경"], resultElement: "금" },
  { pair: ["병", "신"], resultElement: "수" },
  { pair: ["정", "임"], resultElement: "목" },
  { pair: ["무", "계"], resultElement: "화" },
];

// ============ 육합 (六合) ============
// ⚠️ DECISION REQUIRED: 오미합(午未合)은 문헌에 따라 "화(火)기로 화한다"는 설과
// "오=화, 미=토라 명확한 화기가 없어 단순 합으로만 본다"는 설이 갈린다.
// 여기서는 후자(resultElement: null)를 채택했다 - 임의로 화기를 만들어내지 않기 위함.
export const BRANCH_LIU_HE: Array<{ pair: [string, string]; resultElement: Element | null }> = [
  { pair: ["자", "축"], resultElement: "토" },
  { pair: ["인", "해"], resultElement: "목" },
  { pair: ["묘", "술"], resultElement: "화" },
  { pair: ["진", "유"], resultElement: "금" },
  { pair: ["사", "신"], resultElement: "수" },
  { pair: ["오", "미"], resultElement: null }, // DECISION REQUIRED 위 참고
];

// ============ 삼합 (三合) ============
// 4개 국(局), 각 국의 "왕지(旺支, 가운데 글자)"가 있어야 완전한 삼합으로 치고,
// 왕지를 포함한 2글자만 있으면 "반합(半合)"으로 별도 표시한다.
export const BRANCH_SAM_HAP: Array<{ group: [string, string, string]; wangji: string; resultElement: Element }> = [
  { group: ["인", "오", "술"], wangji: "오", resultElement: "화" },
  { group: ["신", "자", "진"], wangji: "자", resultElement: "수" },
  { group: ["사", "유", "축"], wangji: "유", resultElement: "금" },
  { group: ["해", "묘", "미"], wangji: "묘", resultElement: "목" },
];

// ============ 방합 (方合) ============
// 계절/방위 기준 3글자 조합. 왕지 개념 없이 3글자가 다 모여야 성립하는 것이 통설.
export const BRANCH_BANG_HAP: Array<{ group: [string, string, string]; resultElement: Element }> = [
  { group: ["인", "묘", "진"], resultElement: "목" }, // 동방
  { group: ["사", "오", "미"], resultElement: "화" }, // 남방
  { group: ["신", "유", "술"], resultElement: "금" }, // 서방
  { group: ["해", "자", "축"], resultElement: "수" }, // 북방
];

// ============ 충 (沖) ============
// 12지지 원반에서 정반대(180도) 위치. 확립된 기준, 이견 없음.
export const BRANCH_CHUNG: Array<[string, string]> = [
  ["자", "오"],
  ["축", "미"],
  ["인", "신"],
  ["묘", "유"],
  ["진", "술"],
  ["사", "해"],
];

// ============ 형 (刑) ============
// ⚠️ DECISION REQUIRED (형벌의 성립 조건 - 유파 간 이견이 큰 지점):
//   무은지형(인사신)과 지세지형(축술미)은 "3글자가 모두 모여야 성립한다"는 견해와
//   "2글자만 있어도 (약하게) 성립한다"는 견해가 갈린다. 삼합의 반합처럼 부분 형성을
//   인정할지가 유파별로 다르다. 이 엔진은 두 가지를 다 계산해서 별도로 표시한다:
//     - 3글자 완전 성립: type "무은지형"/"지세지형"
//     - 2글자만 있는 부분 성립: type "반형" (일부 유파에서만 인정, 영향력 논쟁 있음)
//   상용 서비스에서 "반형"을 노출할지 여부는 명리학 전문가 검수 후 결정할 것.
export const BRANCH_SAM_HYEONG_GROUPS: Array<{ group: [string, string, string]; name: string }> = [
  { group: ["인", "사", "신"], name: "무은지형" },
  { group: ["축", "술", "미"], name: "지세지형" },
];
// 자묘형(無禮之刑)은 애초에 2글자만으로 성립하는 것이 통설이라 반형 개념이 없다.
export const BRANCH_JA_MYO_HYEONG: [string, string] = ["자", "묘"];
// 자형(自刑) - 같은 지지가 원국에 2개 이상 있을 때 성립 (진진/오오/유유/해해).
// ⚠️ DECISION REQUIRED: 축술미 안에도 "술"이 지세지형과 겹치는 등, 자형과 삼형의
// 경계가 불분명하다는 이견이 있으나, 여기서는 통상적인 4개 지지(진오유해) 목록만 채택한다.
export const BRANCH_JA_HYEONG_LIST: string[] = ["진", "오", "유", "해"];

// ============ 파 (破) ============
// ⚠️ DECISION REQUIRED: 파(破)는 유파 간 이견이 특히 큰 항목이다. 아래 표는
// 통상 인용되는 육파(六破) 조합 중 하나를 채택한 것이며, 일부 유파는 파 자체를
// 영향력이 미미하다고 보아 아예 계산에서 제외하기도 한다.
// 특히 "인해파"는 위 BRANCH_LIU_HE(육합)의 "인해합"과 동일한 두 글자 조합인데,
// 이는 임의 실수가 아니라 고전 문헌에서도 언급되는 유명한 예외 케이스
// ("합이면서 동시에 파의 성질도 있다고 보는 견해")이다. 다만 이 예외 자체를
// 인정하지 않고 "합이 성립하면 파는 무시한다"고 보는 유파도 있다 - 이 엔진은
// 전자(둘 다 표시)를 기본값으로 채택했으니, 상용 적용 전 확정 필요.
export const BRANCH_PA: Array<[string, string]> = [
  ["자", "유"],
  ["축", "진"],
  ["인", "해"],
  ["묘", "오"],
  ["사", "신"],
  ["미", "술"],
];

// ============ 해 (害) ============
// 육해(六害). 확립된 기준이나, 해(害)도 파(破)와 마찬가지로 실전 영향력에
// 대해서는 유파별로 비중을 다르게 본다.
export const BRANCH_HAE: Array<[string, string]> = [
  ["자", "미"],
  ["축", "오"],
  ["인", "사"],
  ["묘", "진"],
  ["신", "해"],
  ["유", "술"],
];
