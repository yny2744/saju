import type { Focus } from "@/lib/focus";

/**
 * 12가지 운 (2026-10-08 유샘 확정) + 전부 보기 전용 2가지.
 * 맛보기(990냥)는 12가지를 짧게 한 번씩, 깊게 보기(4,900냥)·몰아보기(3개 9,900냥)·전부 보기(29,500냥)는
 * 손님이 주제를 누를 때 그 주제만 깊게 쓴다.
 */

export const TOPIC_KEYS = [
  "nature",
  "love",
  "marriage",
  "money",
  "job",
  "promotion",
  "business",
  "health",
  "relationship",
  "family",
  "year",
  "daeun",
] as const;
export type TopicKey = (typeof TOPIC_KEYS)[number];

/** 전부 보기에만 들어 있는 추가 풀이 */
export const EXTRA_KEYS = ["monthly", "gaeun"] as const;
export type ExtraKey = (typeof EXTRA_KEYS)[number];

export type AnyTopicKey = TopicKey | ExtraKey;

export interface TopicInfo {
  title: string;
  hanja: string;
  /** 대문·목록에 쓰는 짧은 설명 */
  blurb: string;
  /** 깊게 보기에서 다룰 내용 (AI 요청에 그대로 들어감) */
  deepPoints: string[];
}

export const TOPICS: Record<AnyTopicKey, TopicInfo> = {
  nature: {
    title: "타고난 성향",
    hanja: "性",
    blurb: "나는 어떤 그릇의 사람인가",
    deepPoints: ["일간과 격으로 본 타고난 기질", "강점과 약점이 드러나는 상황", "남들이 보는 나와 실제의 나", "성향을 살리는 생활 태도"],
  },
  love: {
    title: "연애",
    hanja: "戀",
    blurb: "끌리는 사람, 인연이 오는 때",
    deepPoints: ["연애할 때의 나", "잘 맞는 사람과 피해야 할 사람", "인연이 들어오는 시기", "관계를 오래 지키는 법"],
  },
  marriage: {
    title: "결혼·배우자",
    hanja: "婚",
    blurb: "배우자 자리와 결혼의 흐름",
    deepPoints: ["배우자 자리(일지)로 본 배우자 모습", "결혼 시기의 흐름", "부부 사이에서 조심할 점", "가정을 편안하게 하는 법"],
  },
  money: {
    title: "재물",
    hanja: "財",
    blurb: "재물 그릇과 돈이 모이는 때",
    deepPoints: ["타고난 재물 그릇", "돈을 버는 방식과 새는 곳", "재물이 크게 움직이는 시기", "모으고 지키는 법"],
  },
  job: {
    title: "취업·직업",
    hanja: "業",
    blurb: "나에게 맞는 일과 자리",
    deepPoints: ["잘 맞는 직업 분야", "조직형인지 독립형인지", "일이 풀리는 시기", "일에서 조심할 점"],
  },
  promotion: {
    title: "승진·명예",
    hanja: "官",
    blurb: "자리와 이름이 오르는 때",
    deepPoints: ["관(官)의 기운으로 본 명예운", "윗사람·조직과의 관계", "승진과 인정이 오는 시기", "평판을 지키는 법"],
  },
  business: {
    title: "사업·창업",
    hanja: "商",
    blurb: "내 사업을 해도 될까",
    deepPoints: ["사업가 기질이 있는지", "어울리는 업종과 방식", "동업과 투자에서 조심할 점", "시작하기 좋은 때"],
  },
  health: {
    title: "건강",
    hanja: "康",
    blurb: "약한 기운과 몸 돌보기",
    deepPoints: ["오행으로 본 약한 곳 (의학적 진단 아님)", "기운이 떨어지기 쉬운 시기", "생활 습관과 마음가짐", "부족한 기운을 채우는 생활"],
  },
  relationship: {
    title: "인간관계",
    hanja: "緣",
    blurb: "사람 복과 귀인",
    deepPoints: ["사람을 대하는 나의 방식", "도움 주는 사람과 조심할 사람", "구설과 다툼을 피하는 법", "귀인이 오는 때"],
  },
  family: {
    title: "자녀·가족",
    hanja: "家",
    blurb: "자녀와 가족의 인연",
    deepPoints: ["부모·형제와의 인연", "자녀 자리로 본 자녀와의 관계", "가족 안에서의 나의 역할", "집안을 화목하게 하는 법"],
  },
  year: {
    title: "올해의 운세",
    hanja: "歲",
    blurb: "올해 무엇이 들어오고 나가나",
    deepPoints: ["올해 세운과 내 사주의 만남", "상반기와 하반기 흐름", "올해 꼭 잡을 기회", "올해 조심할 일"],
  },
  daeun: {
    title: "평생 대운",
    hanja: "運",
    blurb: "10년마다 바뀌는 큰 흐름",
    deepPoints: ["대운 흐름 전체의 모양", "인생에서 힘이 실리는 시기", "조심스럽게 지나야 할 시기", "다음 대운을 준비하는 법"],
  },
  monthly: {
    title: "올해 월별 운세",
    hanja: "月",
    blurb: "열두 달 하나하나",
    deepPoints: ["달마다 들어오는 기운", "좋은 달과 조심할 달", "달별 한 줄 조언"],
  },
  gaeun: {
    title: "개운법",
    hanja: "開",
    blurb: "운을 여는 생활 처방",
    deepPoints: ["부족한 기운을 채우는 색·방향·숫자", "가까이하면 좋은 것", "피하면 좋은 습관", "마음가짐"],
  },
};

export function isTopicKey(v: unknown): v is TopicKey {
  return typeof v === "string" && (TOPIC_KEYS as readonly string[]).includes(v);
}

export function isAnyTopicKey(v: unknown): v is AnyTopicKey {
  return isTopicKey(v) || (typeof v === "string" && (EXTRA_KEYS as readonly string[]).includes(v));
}

/** ③ 가장 궁금한 것 → 맛보기에서 가장 자세히 쓸 주제 */
export const FOCUS_TOPICS: Record<Focus, TopicKey[]> = {
  love: ["love", "marriage"],
  work: ["job", "money"],
  health: ["health"],
  relationship: ["relationship"],
};

/** 3가지 몰아보기 추천 묶음 - 4묶음이 12가지 운을 빠짐없이 나눠 담는다 (2026-10-09 수정안 16) */
export const BUNDLE_SUGGESTIONS: Array<{ title: string; topics: [TopicKey, TopicKey, TopicKey] }> = [
  { title: "타고난 나", topics: ["nature", "relationship", "daeun"] },
  { title: "든든한 노후", topics: ["money", "health", "family"] },
  { title: "인연과 가정", topics: ["love", "marriage", "year"] },
  { title: "일과 성공", topics: ["job", "promotion", "business"] },
];
