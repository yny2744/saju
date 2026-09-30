import type { FaceFeatureBuckets, FaceRuleResult, FeatureBucket } from "./types";

/**
 * 지시서 2-A조: "무료 서비스에서는 생성형 AI API를 호출하지 않는다."
 *
 * saju-engine의 fortuneRuleEngine.ts(오늘의 운세)와 동일한 설계 원칙을 따른다 -
 * 버킷(low/mid/high) → 고정 문구 매핑만 있을 뿐, 어떤 것도 실시간으로
 * 생성하거나 추측하지 않는다. 여기 쓰인 문구는 모두 전통 관상학에서 흔히
 * 통용되는 통속적 해석을 참고용으로 정리한 문화 콘텐츠이며, 과학적 사실이
 * 아니다 (disclaimer로 항상 함께 안내).
 *
 * saju-engine 안에 넣지 않고 apps/web에 둔 이유: 이 규칙의 입력(6개 비율)은
 * SajuJson에서 나오는 게 아니라 브라우저의 얼굴 랜드마크 계산 결과이므로,
 * "사주 계산 엔진" 패키지의 책임 범위 밖이라고 판단했다 (saju-engine을
 * 불필요하게 건드리지 않는다는 지시서 8조 원칙과도 일치).
 */

const FACE_SHAPE_TEXT: Record<FeatureBucket, string> = {
  low: "얼굴 길이보다 너비가 도드라져 둥글고 부드러운 인상을 주는 얼굴형으로 참고됩니다.",
  mid: "길이와 너비의 균형이 잡힌 표준형에 가까워, 무난하고 안정적인 인상으로 참고됩니다.",
  high: "너비보다 길이가 도드라져 갸름하고 세련된 인상을 주는 얼굴형으로 참고됩니다.",
};

const FOREHEAD_TEXT: Record<FeatureBucket, string> = {
  low: "이마가 아담한 편으로, 전통 관상학에서는 신중하고 내실을 다지는 기운으로 참고합니다.",
  mid: "이마 비율이 보통 수준으로, 전통 관상학에서는 균형 잡힌 초년운으로 참고합니다.",
  high: "이마가 넓은 편으로, 전통 관상학에서는 총명하고 일찍 트이는 기운으로 참고합니다.",
};

const EYE_SPACING_TEXT: Record<FeatureBucket, string> = {
  low: "눈 사이 간격이 가까운 편으로, 전통 관상학에서는 집중력 있고 세심한 성향으로 참고합니다.",
  mid: "눈 사이 간격이 보통 수준으로, 전통 관상학에서는 균형 잡힌 대인관계 성향으로 참고합니다.",
  high: "눈 사이 간격이 넓은 편으로, 전통 관상학에서는 여유롭고 포용력 있는 성향으로 참고합니다.",
};

const NOSE_TEXT: Record<FeatureBucket, string> = {
  low: "코가 아담하고 넓은 편으로, 전통 관상학에서는 온화하고 사교적인 기운으로 참고합니다.",
  mid: "코의 비율이 보통 수준으로, 전통 관상학에서는 균형 잡힌 재물운으로 참고합니다.",
  high: "콧대가 뚜렷하고 긴 편으로, 전통 관상학에서는 주관이 뚜렷한 기운으로 참고합니다.",
};

const MOUTH_TEXT: Record<FeatureBucket, string> = {
  low: "입매가 아담한 편으로, 전통 관상학에서는 신중하고 절제된 표현 성향으로 참고합니다.",
  mid: "입매 비율이 보통 수준으로, 전통 관상학에서는 균형 잡힌 표현력으로 참고합니다.",
  high: "입매가 시원시원한 편으로, 전통 관상학에서는 활달하고 표현력이 풍부한 성향으로 참고합니다.",
};

const JAW_TEXT: Record<FeatureBucket, string> = {
  low: "턱선이 부드러운 편으로, 전통 관상학에서는 유연하고 친화력 있는 기운으로 참고합니다.",
  mid: "턱선 비율이 보통 수준으로, 전통 관상학에서는 균형 잡힌 추진력으로 참고합니다.",
  high: "턱선이 또렷한 편으로, 전통 관상학에서는 결단력 있고 뚝심 있는 기운으로 참고합니다.",
};

const IDEAL_PARTNER_PREVIEW: Record<FeatureBucket, string> = {
  low: "전통 관상학에서는 이런 인상의 분과는 차분하고 든든하게 이끌어주는 상대가 조화롭다고 이야기합니다.",
  mid: "전통 관상학에서는 이런 인상의 분과는 서로 균형을 맞춰가는 안정적인 상대가 조화롭다고 이야기합니다.",
  high: "전통 관상학에서는 이런 인상의 분과는 활발하고 주도적인 상대가 조화롭다고 이야기합니다.",
};

const DISCLAIMER =
  "이 결과는 전통 관상학을 바탕으로 한 문화·오락 콘텐츠이며, 실제 성격·건강·재산·연애를 과학적으로 확정하지 않습니다.";

export function generateFaceRuleResult(buckets: FaceFeatureBuckets): FaceRuleResult {
  return {
    features: {
      faceShape: FACE_SHAPE_TEXT[buckets.faceShape],
      forehead: FOREHEAD_TEXT[buckets.forehead],
      eyes: EYE_SPACING_TEXT[buckets.eyeSpacing],
      nose: NOSE_TEXT[buckets.nose],
      mouth: MOUTH_TEXT[buckets.mouth],
      jaw: JAW_TEXT[buckets.jaw],
    },
    // 지시서 2-A조: "간략히 미리 보여준다" - 얼굴형 버킷 하나만 대표로 사용해 짧게 구성한다.
    idealPartnerPreview: `${IDEAL_PARTNER_PREVIEW[buckets.faceShape]} (전체 인연 관상 해석은 유료 상품에서 확인하실 수 있습니다.)`,
    disclaimer: DISCLAIMER,
  };
}
