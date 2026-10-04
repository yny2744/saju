import type { SajuJson } from "saju-engine";

/**
 * 무료 결과 "상세 해석" 도표용 핵심 키워드.
 *
 * 무료 해석 문장은 엔진의 규칙 표(saju-engine/src/freeInterpretation/sajuFreeRuleEngine.ts)가
 * 일간·우세 오행·부족 오행·올해 세운 십신으로 고른다. 여기 키워드는 **같은 기준으로 같은 칸을 고르는
 * 표시용 요약**이며, 각 키워드는 그 문장 안에 이미 있는 말을 뽑은 것이다(새 해석을 만들지 않음).
 * 엔진 문장을 바꾸면 이 표도 같이 맞춰야 한다.
 */

type El = "목" | "화" | "토" | "금" | "수";

const TEMPERAMENT: Record<string, string[]> = {
  갑: ["정직함", "뚜렷한 주관", "앞장섬"],
  을: ["유연함", "적응력", "끈기"],
  병: ["밝음", "적극성", "리더십"],
  정: ["섬세함", "따뜻함", "꾸준함"],
  무: ["믿음직함", "중심", "흔들림 없음"],
  기: ["포용력", "실속", "돌봄"],
  경: ["결단력", "원칙", "맺고 끊음"],
  신: ["섬세함", "미적 감각", "자존심"],
  임: ["포용력", "지혜", "유연한 대응"],
  계: ["사려 깊음", "직관", "조용한 영향력"],
};

const CAREER: Record<El, string[]> = {
  목: ["교육", "신규 사업", "기획"],
  화: ["홍보", "영업", "창작"],
  토: ["관리", "행정", "부동산"],
  금: ["재무", "법률", "기술직"],
  수: ["연구", "기획", "전략"],
};

const WEALTH: Record<El, string[]> = {
  목: ["장기 투자", "자산 성장"],
  화: ["활발한 흐름", "지출 관리"],
  토: ["꾸준히 모으기", "지키는 재물"],
  금: ["계획적 관리", "안정적 성과"],
  수: ["여러 수입 경로", "유연한 운용"],
};

const LOVE: Record<El, string[]> = {
  목: ["함께 성장", "서로 북돋움"],
  화: ["적극적", "풍부한 표현"],
  토: ["안정감", "신뢰"],
  금: ["명확한 소통", "신의"],
  수: ["깊은 교감", "대화"],
};

const RELATIONSHIP: Record<El, string[]> = {
  목: ["함께 성장", "리더 역할"],
  화: ["분위기 메이커", "활력"],
  토: ["믿음", "중재자"],
  금: ["원칙", "의리"],
  수: ["깊은 소통", "조언자"],
};

const OPPORTUNITY: Record<El, string> = {
  목: "새로운 시작·확장",
  화: "주목받는 자리",
  토: "신뢰 기반 협력",
  금: "성과가 요구되는 자리",
  수: "분석·전략이 필요한 상황",
};

const YEAR: Record<string, string> = {
  비견: "독립적인 추진",
  겁재: "경쟁·지출 신중",
  식신: "재능을 펼치는 해",
  상관: "표현과 변화",
  편재: "여러 곳의 기회",
  정재: "안정적인 수입",
  편관: "책임과 도전",
  정관: "명예와 인정",
  편인: "배움과 탐구",
  정인: "도움과 내실",
};

const DOMAIN: Record<El, string> = { 목: "성장·확장", 화: "활력·표현", 토: "안정·신뢰", 금: "결단·원칙", 수: "지혜·유연함" };

export interface FreeAnalysisKeywords {
  traits: Record<"temperament" | "career" | "wealth" | "love" | "relationship", string[]>;
  yearLabel: string;
  yearKeyword: string;
  opportunity: string;
  caution: string;
}

export function buildFreeAnalysisKeywords(saju: SajuJson): FreeAnalysisKeywords {
  const dominant = saju.elements.summary.dominant as El;
  const lacking = saju.elements.summary.lacking as El[];
  const seun = saju.seun as { year: number; pillar: { ganzhi: string }; tenGod: string };

  return {
    traits: {
      temperament: TEMPERAMENT[saju.tenGods.dayMaster.stem] ?? TEMPERAMENT["갑"],
      career: CAREER[dominant],
      wealth: WEALTH[dominant],
      love: LOVE[dominant],
      relationship: RELATIONSHIP[dominant],
    },
    yearLabel: `${seun.year}년 ${seun.pillar.ganzhi}년`,
    yearKeyword: YEAR[seun.tenGod] ?? YEAR["비견"],
    opportunity: OPPORTUNITY[dominant],
    caution: lacking.length === 0 ? "한쪽으로 치우치지 않기" : `${lacking.map((el) => DOMAIN[el]).join(", ")} 보완`,
  };
}
