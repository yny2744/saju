import type { SajuJson } from "../types";
import type { Element } from "../rules/fiveElementTables";
import type { InterpretationResult } from "../ai/types";

/**
 * 무료 사주 "맛보기"를 AI 호출 없이 생성한다.
 *
 * 배경: 기존에는 FREE_BASIC도 유료 상품과 동일하게 AIInterpretationEngine을
 * 호출했다. 이는 src/fortune(오늘의 운세)과 apps/web/server/face(관상 무료)가
 * 이미 지켜온 "무료는 AI 비용 없이, 유료만 AI 사용"이라는 원칙과 불일치했고,
 * 실제로 Gemini 무료 티어 일일 한도(테스트 중 20회)에 바로 걸리는 것을 확인했다.
 * 트래픽이 느는 상황(예: 일 1,000명)에서는 AI 비용이 무료 체험에 그대로
 * 노출되어 감당할 수 없으므로, 여기서도 같은 원칙으로 전환한다.
 *
 * 설계 원칙 (fortuneRuleEngine.ts와 동일):
 *   - 버킷/카테고리 → 고정 문구 매핑만 있을 뿐, 어떤 것도 실시간으로 생성하거나
 *     추측하지 않는다. 입력은 전부 Saju Engine이 이미 계산해둔 실제 값이다
 *     (일간, 우세/부족 오행, 이번 연도 세운의 십신) - 새로 계산하지 않는다.
 *   - 반환 타입은 AI 경로(AIInterpretationEngine.interpret)와 완전히 동일한
 *     InterpretationResult다. 그래서 analyzeSaju.ts 이후의 모든 코드
 *     (resultStore, 결과 화면, orders.ts 등)는 이 결과가 AI가 만든 것인지
 *     규칙 엔진이 만든 것인지 구분할 필요가 없다 - meta.provider로만 구분된다.
 *   - 유료(BASIC/PREMIUM) 경로는 전혀 건드리지 않는다. 이 파일은 FREE_BASIC
 *     전용이며, 기존 AI Interpretation Engine(검증 파이프라인 포함)도
 *     그대로 둔다.
 */

const STEM_TEMPERAMENT: Record<string, string> = {
  갑: "갑(甲) 일간은 곧게 뻗어나가는 큰 나무와 같아서, 정직하고 주관이 뚜렷하며 앞장서기를 좋아하는 성향으로 참고됩니다.",
  을: "을(乙) 일간은 유연한 덩굴풀과 같아서, 상황에 맞춰 적응하면서도 끈기 있게 뻗어나가는 성향으로 참고됩니다.",
  병: "병(丙) 일간은 하늘의 태양과 같아서, 밝고 적극적이며 주변을 환하게 비추는 리더십을 가진 성향으로 참고됩니다.",
  정: "정(丁) 일간은 은은한 촛불과 같아서, 섬세하고 따뜻하며 꾸준히 주변을 밝히는 성향으로 참고됩니다.",
  무: "무(戊) 일간은 넓은 산과 같아서, 믿음직하고 중심을 잘 잡으며 쉽게 흔들리지 않는 성향으로 참고됩니다.",
  기: "기(己) 일간은 기름진 논밭과 같아서, 포용력 있고 실속을 챙기며 주변을 돌보는 성향으로 참고됩니다.",
  경: "경(庚) 일간은 단단한 무쇠와 같아서, 결단력 있고 원칙을 중시하며 맺고 끊음이 분명한 성향으로 참고됩니다.",
  신: "신(辛) 일간은 정교하게 다듬어진 보석과 같아서, 섬세하고 미적 감각이 뛰어나며 자존심이 강한 성향으로 참고됩니다.",
  임: "임(壬) 일간은 흐르는 큰 강물과 같아서, 포용력 있고 지혜로우며 변화에 유연하게 대응하는 성향으로 참고됩니다.",
  계: "계(癸) 일간은 맑은 샘물과 같아서, 사려 깊고 직관이 뛰어나며 조용히 스며드는 영향력을 가진 성향으로 참고됩니다.",
};

const ELEMENT_STRONG: Record<Element, string> = {
  목: "목(木) 기운이 두드러져, 성장하고 뻗어나가려는 힘이 강하게 나타납니다.",
  화: "화(火) 기운이 두드러져, 열정적이고 활동적인 에너지가 강하게 나타납니다.",
  토: "토(土) 기운이 두드러져, 안정적이고 신뢰를 주는 중심 역할이 강하게 나타납니다.",
  금: "금(金) 기운이 두드러져, 결단력 있고 원칙을 지키는 힘이 강하게 나타납니다.",
  수: "수(水) 기운이 두드러져, 유연하고 지혜로운 사고력이 강하게 나타납니다.",
};
const ELEMENT_MODERATE: Record<Element, string> = {
  목: "목(木) 기운이 적당히 균형을 이루고 있어, 성장과 안정을 함께 추구하는 모습으로 참고됩니다.",
  화: "화(火) 기운이 적당히 균형을 이루고 있어, 열정과 차분함을 함께 가진 모습으로 참고됩니다.",
  토: "토(土) 기운이 적당히 균형을 이루고 있어, 안정감과 융통성을 함께 가진 모습으로 참고됩니다.",
  금: "금(金) 기운이 적당히 균형을 이루고 있어, 결단력과 유연함을 함께 가진 모습으로 참고됩니다.",
  수: "수(水) 기운이 적당히 균형을 이루고 있어, 지혜와 실행력을 함께 가진 모습으로 참고됩니다.",
};
const ELEMENT_WEAK: Record<Element, string> = {
  목: "목(木) 기운이 적은 편으로, 외부의 성장 기회를 적극적으로 끌어오는 노력이 도움이 될 수 있습니다.",
  화: "화(火) 기운이 적은 편으로, 의식적으로 활력과 열정을 북돋는 노력이 도움이 될 수 있습니다.",
  토: "토(土) 기운이 적은 편으로, 중심을 잡아주는 루틴이나 안정적인 환경이 도움이 될 수 있습니다.",
  금: "금(金) 기운이 적은 편으로, 결단을 내리는 연습이나 원칙을 세우는 노력이 도움이 될 수 있습니다.",
  수: "수(水) 기운이 적은 편으로, 충분한 휴식과 생각을 정리하는 시간이 도움이 될 수 있습니다.",
};

const DOMINANT_CAREER: Record<Element, string> = {
  목: "성장과 기획이 필요한 분야, 교육이나 신규 사업처럼 새로운 것을 키워나가는 일에서 역량을 발휘할 가능성이 있습니다.",
  화: "사람들 앞에 나서거나 주목받는 분야, 홍보·영업·창작처럼 활력을 쏟는 일에서 역량을 발휘할 가능성이 있습니다.",
  토: "신뢰와 안정이 중요한 분야, 관리·행정·부동산처럼 중심을 잡는 역할에서 역량을 발휘할 가능성이 있습니다.",
  금: "원칙과 정확성이 필요한 분야, 재무·법률·기술직처럼 명확한 기준을 다루는 일에서 역량을 발휘할 가능성이 있습니다.",
  수: "분석과 유연한 사고가 필요한 분야, 연구·기획·전략처럼 깊이 있게 생각하는 일에서 역량을 발휘할 가능성이 있습니다.",
};
const DOMINANT_WEALTH: Record<Element, string> = {
  목: "재물을 꾸준히 키워나가는 성향이 있어, 장기적인 투자나 자산 성장에 관심을 두면 좋은 흐름을 만들 수 있습니다.",
  화: "재물의 흐름이 활발한 편으로, 들어오고 나가는 속도가 빠를 수 있어 지출 관리에 신경 쓰면 좋습니다.",
  토: "재물을 안정적으로 지키는 성향이 있어, 꾸준히 모으고 지키는 방식이 잘 맞는 편입니다.",
  금: "재물에 대한 감각이 뚜렷한 편으로, 계획적으로 관리하면 안정적인 성과를 기대할 수 있습니다.",
  수: "재물의 흐름을 유연하게 다루는 성향이 있어, 여러 경로의 수입을 운용하는 데 강점이 있을 수 있습니다.",
};
const DOMINANT_LOVE: Record<Element, string> = {
  목: "연애에서 성장과 발전을 함께 나눌 수 있는 상대와 잘 맞으며, 서로를 북돋아주는 관계를 선호하는 편입니다.",
  화: "연애에서 적극적이고 표현이 풍부한 편으로, 열정적인 교감을 중요하게 여기는 편입니다.",
  토: "연애에서 안정감과 신뢰를 중요하게 여기며, 꾸준하고 편안한 관계를 선호하는 편입니다.",
  금: "연애에서 명확한 소통과 원칙을 중요하게 여기며, 신의를 지키는 관계를 선호하는 편입니다.",
  수: "연애에서 깊은 정서적 교감을 중요하게 여기며, 서로를 이해하는 대화를 선호하는 편입니다.",
};
const DOMINANT_RELATIONSHIP: Record<Element, string> = {
  목: "주변 사람들과 함께 성장하는 관계를 만들어가며, 리더십을 발휘하는 경우가 많습니다.",
  화: "주변에 활력을 불어넣는 역할을 하며, 모임에서 분위기를 이끄는 경우가 많습니다.",
  토: "주변 사람들에게 믿음을 주는 역할을 하며, 중재자 역할을 맡는 경우가 많습니다.",
  금: "원칙과 의리를 중요하게 여기는 관계를 맺으며, 신뢰받는 역할을 맡는 경우가 많습니다.",
  수: "깊이 있는 소통을 나누는 소수의 관계를 선호하며, 조언자 역할을 맡는 경우가 많습니다.",
};
const DOMINANT_OPPORTUNITY: Record<Element, string> = {
  목: "새로운 시작이나 확장의 기회가 찾아올 때 적극적으로 움직이면 좋은 결과로 이어질 수 있습니다.",
  화: "주목받을 수 있는 자리나 무대가 주어질 때 자신감 있게 나서면 좋은 결과로 이어질 수 있습니다.",
  토: "신뢰를 바탕으로 한 제안이나 협력이 들어올 때 안정적으로 받아들이면 좋은 결과로 이어질 수 있습니다.",
  금: "명확한 기준과 성과가 요구되는 자리에서 원칙대로 임하면 좋은 결과로 이어질 수 있습니다.",
  수: "깊이 있는 분석이나 전략이 필요한 상황에서 차분히 접근하면 좋은 결과로 이어질 수 있습니다.",
};

const SEUN_TENGOD_YEARLY_FLOW: Record<string, string> = {
  비견: "올해는 스스로의 힘으로 주도권을 쥐는 흐름이 참고됩니다. 협업보다는 독립적인 추진이 유리할 수 있습니다.",
  겁재: "올해는 경쟁이나 예상치 못한 지출이 늘어날 수 있는 흐름이 참고됩니다. 공동 투자나 보증은 신중히 결정하는 것이 좋습니다.",
  식신: "올해는 꾸준한 노력이 결실로 이어지는 흐름이 참고됩니다. 자신의 재능을 펼치기 좋은 시기입니다.",
  상관: "올해는 표현력과 변화의 기운이 강한 흐름이 참고됩니다. 다만 즉흥적인 결정은 한 번 더 점검하는 것이 좋습니다.",
  편재: "올해는 활동적인 재물의 흐름이 참고됩니다. 기회가 여러 곳에서 생길 수 있으나 분산된 관리가 필요합니다.",
  정재: "올해는 안정적인 수입과 관리의 흐름이 참고됩니다. 꾸준한 노력이 결실로 이어지는 시기입니다.",
  편관: "올해는 책임과 압박이 함께 따르는 흐름이 참고됩니다. 도전은 있지만 극복하면 성장으로 이어질 수 있습니다.",
  정관: "올해는 명예와 인정이 따르는 흐름이 참고됩니다. 맡은 역할에 충실하면 좋은 평가로 이어질 수 있습니다.",
  편인: "올해는 배움과 통찰이 깊어지는 흐름이 참고됩니다. 새로운 분야를 탐구하기 좋은 시기입니다.",
  정인: "올해는 주변의 도움과 지지를 받는 흐름이 참고됩니다. 안정적으로 내실을 다지기 좋은 시기입니다.",
};

const BALANCED_CAUTION =
  "오행이 비교적 고르게 분포되어 있어 특정 영역에 치우친 주의점은 크지 않지만, 중요한 결정을 내릴 때는 한쪽으로 치우치지 않도록 균형 잡힌 시각을 유지하는 것이 좋습니다.";

function lackingCaution(lacking: Element[]): string {
  if (lacking.length === 0) return BALANCED_CAUTION;
  const names = lacking.join(", ");
  return `사주 원국에 ${names} 기운이 비어 있어, 해당 기운이 상징하는 영역(${ELEMENT_DOMAIN_HINT(
    lacking
  )})에서는 의식적으로 보완하려는 노력이 도움이 될 수 있습니다.`;
}

function ELEMENT_DOMAIN_HINT(elements: Element[]): string {
  const hints: Record<Element, string> = {
    목: "성장·확장",
    화: "활력·표현",
    토: "안정·신뢰",
    금: "결단·원칙",
    수: "지혜·유연함",
  };
  return elements.map((el) => hints[el]).join(", ");
}

/**
 * FREE_BASIC 전용 규칙 기반 해석 생성. AI를 전혀 호출하지 않는다.
 * 반환 타입은 AIInterpretationEngine.interpret()과 동일한 InterpretationResult라서,
 * 호출부(analyzeSaju.ts) 이후 코드는 수정할 필요가 없다.
 */
export function generateSajuFreeInterpretation(saju: SajuJson): InterpretationResult {
  const { dayMaster } = saju.tenGods;
  const { summary } = saju.elements;
  const lackingSet = new Set(summary.lacking);

  const elementText = (el: Element): string => {
    if (el === summary.dominant) return ELEMENT_STRONG[el];
    if (lackingSet.has(el)) return ELEMENT_WEAK[el];
    return ELEMENT_MODERATE[el];
  };

  return {
    elements: {
      wood: elementText("목"),
      fire: elementText("화"),
      earth: elementText("토"),
      metal: elementText("금"),
      water: elementText("수"),
      dominant: summary.dominant,
      lacking: summary.lacking[0] ?? null,
    },
    tenGods: {
      dayMaster: dayMaster.stem,
      summary: `일간 ${dayMaster.stem}(${dayMaster.element}, ${dayMaster.polarity})을 기준으로 사주 원국의 십신이 다양하게 분포되어 있습니다.`,
    },
    analysis: {
      temperament: STEM_TEMPERAMENT[dayMaster.stem] ?? STEM_TEMPERAMENT["갑"],
      career: DOMINANT_CAREER[summary.dominant],
      wealth: DOMINANT_WEALTH[summary.dominant],
      love: DOMINANT_LOVE[summary.dominant],
      relationship: DOMINANT_RELATIONSHIP[summary.dominant],
      yearlyFlow: SEUN_TENGOD_YEARLY_FLOW[saju.seun.tenGod] ?? SEUN_TENGOD_YEARLY_FLOW["비견"],
      caution: lackingCaution(summary.lacking),
      opportunity: DOMINANT_OPPORTUNITY[summary.dominant],
    },
    disclaimer: "이 결과는 전통 명리학을 바탕으로 한 문화·오락 콘텐츠이며, 실제 성격·재물·연애·미래를 과학적으로 확정하지 않습니다.",
    meta: {
      productType: "FREE_BASIC",
      provider: "rule-engine",
      model: "rule-based-no-ai",
      generatedAt: new Date().toISOString(),
      attempts: 1,
    },
  };
}
