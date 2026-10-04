import type { SajuJson } from "saju-engine";
import type { ElementKo } from "@/lib/pillarView";

/**
 * 무료 결과의 십신 막대그래프용 집계.
 *
 * **십신을 새로 판정하지 않는다** - 엔진(calculateTenGods)이 이미 판정해둔 십신에
 * 엔진의 오행 집계(calculateElements)와 **똑같은 점수 규칙**을 적용해 더하기만 한다:
 *   - 천간(년·월·시): 1글자 = 1점 → 그 천간의 십신
 *   - 지지 본기: 1글자 = 1점 → 그 지지의 대표 십신(정기 기준, 엔진의 primary)
 *   - 지장간: weight/30점 → 지장간 각각의 십신 (여기·중기·정기 전부)
 * 그래서 십신 점수를 오행별로 다시 묶으면 엔진의 오행 점수(elements.summary.counts)에서
 * 일간 1점을 뺀 값과 정확히 같다 (tests/tenGodDistribution.test.ts에서 검증).
 *
 * 일간(일주 천간)은 "나 자신"이라 십신 집계에서 뺀다 - 엔진도 일간에는 십신을 매기지 않는다.
 */

export type TenGodName = "비견" | "겁재" | "식신" | "상관" | "편재" | "정재" | "편관" | "정관" | "편인" | "정인";

/** 그래프 표시 순서: 비겁 → 식상 → 재성 → 관성 → 인성 */
export const TEN_GOD_ORDER: ReadonlyArray<{ group: string; gods: [TenGodName, TenGodName] }> = [
  { group: "비겁", gods: ["비견", "겁재"] },
  { group: "식상", gods: ["식신", "상관"] },
  { group: "재성", gods: ["편재", "정재"] },
  { group: "관성", gods: ["편관", "정관"] },
  { group: "인성", gods: ["편인", "정인"] },
];

const ALL_TEN_GODS: TenGodName[] = TEN_GOD_ORDER.flatMap((g) => g.gods);

/** 가장 높은 십신 아래에 붙는 한 줄 설명 (현상 수준의 짧은 성향 묘사, 규칙 기반 고정 문구) */
export const TEN_GOD_HINT: Record<TenGodName, string> = {
  비견: "내 힘으로 밀고 나가는 자립심과 주체성이 두드러져요.",
  겁재: "경쟁심과 승부욕, 사람을 끌어모으는 힘이 두드러져요.",
  식신: "표현력과 여유, 꾸준히 무언가를 만들어내는 힘이 두드러져요.",
  상관: "말솜씨와 재치, 틀을 깨는 창의력이 두드러져요.",
  편재: "활동적인 재물 감각과 사업·투자 기질이 두드러져요.",
  정재: "꼼꼼하고 성실하게 모으는 재물 감각이 두드러져요.",
  편관: "압박을 견디는 추진력과 카리스마가 두드러져요.",
  정관: "원칙과 책임감, 조직에서 인정받는 힘이 두드러져요.",
  편인: "직관과 독특한 아이디어, 깊이 파고드는 성향이 두드러져요.",
  정인: "배움과 이해력, 주변의 도움을 받는 힘이 두드러져요.",
};

export interface TenGodBar {
  name: TenGodName;
  /** 엔진 규칙으로 합산한 점수 */
  score: number;
  /** 전체 대비 비율(0~100, 정수 반올림) */
  percent: number;
  /** 막대 색으로 쓸 오행 (이 십신에 해당하는 글자의 실제 오행) */
  element: ElementKo;
}

export interface TenGodDistribution {
  bars: TenGodBar[];
  /** 가장 높은 십신 (동점이면 여러 개) */
  top: TenGodName[];
  total: number;
}

type PosKey = "year" | "month" | "day" | "hour";
const POSITIONS: PosKey[] = ["year", "month", "day", "hour"];

export function buildTenGodDistribution(saju: SajuJson): TenGodDistribution {
  const scores = Object.fromEntries(ALL_TEN_GODS.map((g) => [g, 0])) as Record<TenGodName, number>;
  const elementOf: Partial<Record<TenGodName, ElementKo>> = {};

  const stemTenGods = saju.tenGods.heavenlyStems as Partial<Record<PosKey, TenGodName>>;
  const branchTenGods = saju.tenGods.earthlyBranches as Partial<
    Record<PosKey, { primary: TenGodName; hiddenStemTenGods: Array<{ tenGod: TenGodName; weight: number }> }>
  >;
  const stemElements = saju.elements.heavenlyStems as Partial<Record<PosKey, ElementKo>>;
  const branchElements = saju.elements.earthlyBranches as Partial<Record<PosKey, ElementKo>>;
  const hiddenElements = saju.elements.hiddenStems as Partial<Record<PosKey, Array<{ element: ElementKo }>>>;

  const add = (god: TenGodName, points: number, element: ElementKo | undefined) => {
    scores[god] += points;
    if (element && !elementOf[god]) elementOf[god] = element;
  };

  for (const pos of POSITIONS) {
    // 천간 (일간 제외 - 엔진이 day를 넣지 않는다)
    const stemGod = stemTenGods[pos];
    if (pos !== "day" && stemGod) add(stemGod, 1, stemElements[pos]);

    const branch = branchTenGods[pos];
    if (!branch) continue; // 시간 모름
    add(branch.primary, 1, branchElements[pos]);
    const hiddenEls = hiddenElements[pos] ?? [];
    branch.hiddenStemTenGods.forEach((h, i) => add(h.tenGod, h.weight / 30, hiddenEls[i]?.element));
  }

  const total = ALL_TEN_GODS.reduce((s, g) => s + scores[g], 0);
  const max = Math.max(...ALL_TEN_GODS.map((g) => scores[g]));
  const top = ALL_TEN_GODS.filter((g) => max > 0 && Math.abs(scores[g] - max) < 1e-6);

  const bars: TenGodBar[] = ALL_TEN_GODS.map((name) => ({
    name,
    score: Math.round(scores[name] * 1e6) / 1e6,
    percent: total > 0 ? Math.round((scores[name] / total) * 100) : 0,
    element: elementOf[name] ?? fallbackElement(saju, name),
  }));

  return { bars, top, total };
}

/**
 * 원국에 한 번도 나오지 않은 십신(0점)의 막대 색. 0점이라 막대는 안 보이지만 범례 일관성을 위해
 * 일간 오행에서 생극 관계로 그 십신의 오행을 찾는다 (표시용 색 매핑일 뿐 점수에는 영향 없음).
 */
const GENERATES: Record<ElementKo, ElementKo> = { 목: "화", 화: "토", 토: "금", 금: "수", 수: "목" };
const CONTROLS: Record<ElementKo, ElementKo> = { 목: "토", 화: "금", 토: "수", 금: "목", 수: "화" };
function fallbackElement(saju: SajuJson, god: TenGodName): ElementKo {
  const me = saju.tenGods.dayMaster.element as ElementKo;
  const find = (rel: Record<ElementKo, ElementKo>) =>
    (Object.keys(rel) as ElementKo[]).find((k) => rel[k] === me) as ElementKo;
  switch (god) {
    case "비견":
    case "겁재":
      return me;
    case "식신":
    case "상관":
      return GENERATES[me];
    case "편재":
    case "정재":
      return CONTROLS[me];
    case "편관":
    case "정관":
      return find(CONTROLS);
    default:
      return find(GENERATES);
  }
}

/** "정재가 높아요" / "비견이 높아요" - 마지막 글자 받침으로 이/가 선택 */
export function topHeadline(top: TenGodName[]): string {
  if (top.length === 0) return "십신 분포";
  const label = top.join("·");
  const last = label.charCodeAt(label.length - 1);
  const hasBatchim = last >= 0xac00 && last <= 0xd7a3 && (last - 0xac00) % 28 !== 0;
  return `${label}${hasBatchim ? "이" : "가"} 높아요`;
}
