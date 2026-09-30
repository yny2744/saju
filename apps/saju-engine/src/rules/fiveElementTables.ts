/**
 * 오행(五行) 계산용 명리 규칙 테이블
 *
 * 이 파일은 순수 데이터 테이블만 담는다 (계산 로직은 elements.ts).
 * 명리학파에 따라 기준이 갈리는 항목은 DECISION REQUIRED로 명시한다.
 */

export type Element = "목" | "화" | "토" | "금" | "수";

/** 천간(10개) → 오행. 이 매핑은 모든 명리학파가 동일하게 사용하는 확립된 기준이라 이견이 없다. */
export const STEM_ELEMENT: Record<string, Element> = {
  갑: "목",
  을: "목",
  병: "화",
  정: "화",
  무: "토",
  기: "토",
  경: "금",
  신: "금",
  임: "수",
  계: "수",
};

/**
 * 지지(12개)의 "본기(本氣)" 오행 - 지지 자체를 대표하는 오행.
 * 이것도 모든 유파가 동일하게 쓰는 확립된 기준이다 (인묘=목, 사오=화, 신유=금, 해자=수,
 * 진술축미=토). 아래 HIDDEN_STEMS_TABLE의 지장간별 세부 오행과는 별개 개념이다.
 */
export const BRANCH_ELEMENT: Record<string, Element> = {
  자: "수",
  축: "토",
  인: "목",
  묘: "목",
  진: "토",
  사: "화",
  오: "화",
  미: "토",
  신: "금",
  유: "금",
  술: "토",
  해: "수",
};

export type HiddenStemType = "여기" | "중기" | "정기";

export interface HiddenStemEntry {
  /** 한글 천간 */
  stem: string;
  element: Element;
  type: HiddenStemType;
  /** 30일 기준 배분 일수 (가중치). 지지별 합은 30. */
  weight: number;
}

/**
 * 지장간(支藏干) 조견표 - 30일 분배 기준.
 *
 * ⚠️ DECISION REQUIRED (명리학파별 이견이 실제로 존재하는 지점):
 *   지장간의 종류(어떤 천간이 숨어있는지) 자체는 대부분 유파가 동일하게 보지만,
 *   "여기/중기/정기"의 정확한 일수 배분(가중치)은 참고하는 문헌에 따라 조금씩 다르다.
 *   (예: 巳/申/亥의 중기 배분이 문헌마다 5일~9일 사이에서 갈리는 경우가 있음)
 *
 *   아래 표는 "30일 분배설" 계통 중 가장 널리 인용되는 조견표 하나를 채택한 것이며,
 *   실제 유료 상품(특히 신강신약 판정처럼 지장간 가중치가 결과에 큰 영향을 주는 기능)에
 *   사용하기 전에 반드시 명리학 전문가의 검수를 받을 것을 권장한다.
 *
 *   또한 "십신을 판단할 때 지장간까지 포함해서 볼지, 정기(正氣)만 대표로 볼지"도
 *   유파에 따라 다르다 - 이 결정은 Phase 2-2(십신 계산)에서 별도로 DECISION REQUIRED로 다룬다.
 */
export const HIDDEN_STEMS_TABLE: Record<string, HiddenStemEntry[]> = {
  자: [
    { stem: "임", element: "수", type: "여기", weight: 10 },
    { stem: "계", element: "수", type: "정기", weight: 20 },
  ],
  축: [
    { stem: "계", element: "수", type: "여기", weight: 9 },
    { stem: "신", element: "금", type: "중기", weight: 3 },
    { stem: "기", element: "토", type: "정기", weight: 18 },
  ],
  인: [
    { stem: "무", element: "토", type: "여기", weight: 7 },
    { stem: "병", element: "화", type: "중기", weight: 7 },
    { stem: "갑", element: "목", type: "정기", weight: 16 },
  ],
  묘: [
    { stem: "갑", element: "목", type: "여기", weight: 10 },
    { stem: "을", element: "목", type: "정기", weight: 20 },
  ],
  진: [
    { stem: "을", element: "목", type: "여기", weight: 9 },
    { stem: "계", element: "수", type: "중기", weight: 3 },
    { stem: "무", element: "토", type: "정기", weight: 18 },
  ],
  사: [
    { stem: "무", element: "토", type: "여기", weight: 7 },
    { stem: "경", element: "금", type: "중기", weight: 7 },
    { stem: "병", element: "화", type: "정기", weight: 16 },
  ],
  오: [
    { stem: "병", element: "화", type: "여기", weight: 10 },
    { stem: "기", element: "토", type: "중기", weight: 9 },
    { stem: "정", element: "화", type: "정기", weight: 11 },
  ],
  미: [
    { stem: "정", element: "화", type: "여기", weight: 9 },
    { stem: "을", element: "목", type: "중기", weight: 3 },
    { stem: "기", element: "토", type: "정기", weight: 18 },
  ],
  신: [
    { stem: "무", element: "토", type: "여기", weight: 7 },
    { stem: "임", element: "수", type: "중기", weight: 7 },
    { stem: "경", element: "금", type: "정기", weight: 16 },
  ],
  유: [
    { stem: "경", element: "금", type: "여기", weight: 10 },
    { stem: "신", element: "금", type: "정기", weight: 20 },
  ],
  술: [
    { stem: "신", element: "금", type: "여기", weight: 9 },
    { stem: "정", element: "화", type: "중기", weight: 3 },
    { stem: "무", element: "토", type: "정기", weight: 18 },
  ],
  해: [
    { stem: "무", element: "토", type: "여기", weight: 7 },
    { stem: "갑", element: "목", type: "중기", weight: 7 },
    { stem: "임", element: "수", type: "정기", weight: 16 },
  ],
};

// 무결성 자체 점검: 각 지지의 지장간 weight 합은 반드시 30이어야 한다 (30일 분배설 전제).
// 이 조건이 깨지면 데이터 입력 실수이므로 모듈 로드 시점에 즉시 에러를 던진다.
for (const [branch, entries] of Object.entries(HIDDEN_STEMS_TABLE)) {
  const sum = entries.reduce((acc, e) => acc + e.weight, 0);
  if (sum !== 30) {
    throw new Error(`지장간 테이블 무결성 오류: 지지 '${branch}'의 weight 합이 ${sum} (30이어야 함)`);
  }
}
