import type { ElementKo } from "@/lib/pillarView";

/**
 * 띠별 운세 (2026-10-08 수정안 12번, 무료·AI 없음).
 *
 * 원리: 내 띠(태어난 해의 지지)와 그날 일진의 지지가 어떤 관계인지(합·충·형·파·해)로 하루의 흐름을 본다.
 *   우선순위: 충 > 육합 > 삼합 > 형 > 해 > 파 > 같은 띠 > 평
 * 문구는 관계별로 정해 둔 것 중 날짜에 따라 골라 쓴다(같은 관계라도 매일 같은 말이 반복되지 않게).
 * 일진 자체는 엔진(calculateDailyGanzhi)이 계산한다.
 *
 * 년생별 한 줄 (2026-10-09 수정안 15): 같은 띠라도 태어난 해의 간지(예: 62년 임인 · 74년 갑인 · 86년 병인)가 다르므로
 *   태어난 해의 천간과 그날 일진 천간의 관계(합·비화·인성·식상·재성·관성)로 년생마다 다른 한 줄을 붙인다.
 *   범위는 그해 기준 만 40~75세(36년 = 띠마다 3개 년생)로, 해가 바뀌면 자동으로 한 해씩 옮겨 간다.
 */

export const BRANCHES = ["자", "축", "인", "묘", "진", "사", "오", "미", "신", "유", "술", "해"] as const;
export type Branch = (typeof BRANCHES)[number];

export interface TtiInfo {
  branch: Branch;
  hanja: string;
  animal: string;
  element: ElementKo;
}

export const TTI: TtiInfo[] = [
  { branch: "자", hanja: "子", animal: "쥐", element: "수" },
  { branch: "축", hanja: "丑", animal: "소", element: "토" },
  { branch: "인", hanja: "寅", animal: "호랑이", element: "목" },
  { branch: "묘", hanja: "卯", animal: "토끼", element: "목" },
  { branch: "진", hanja: "辰", animal: "용", element: "토" },
  { branch: "사", hanja: "巳", animal: "뱀", element: "화" },
  { branch: "오", hanja: "午", animal: "말", element: "화" },
  { branch: "미", hanja: "未", animal: "양", element: "토" },
  { branch: "신", hanja: "申", animal: "원숭이", element: "금" },
  { branch: "유", hanja: "酉", animal: "닭", element: "금" },
  { branch: "술", hanja: "戌", animal: "개", element: "토" },
  { branch: "해", hanja: "亥", animal: "돼지", element: "수" },
];

export type Relation = "충" | "육합" | "삼합" | "형" | "해" | "파" | "같은 띠" | "평";

const pairKey = (a: string, b: string) => [a, b].sort().join("");
const CHUNG = new Set(["자오", "축미", "인신", "묘유", "진술", "사해"].map((p) => pairKey(p[0], p[1])));
const YUKHAP = new Set(["자축", "인해", "묘술", "진유", "사신", "오미"].map((p) => pairKey(p[0], p[1])));
const SAMHAP_GROUPS = ["신자진", "해묘미", "인오술", "사유축"];
const HYEONG = new Set(["인사", "사신", "축술", "술미", "자묘"].map((p) => pairKey(p[0], p[1])));
const SELF_HYEONG = new Set(["진", "오", "유", "해"]);
const HAE = new Set(["자미", "축오", "인사", "묘진", "신해", "유술"].map((p) => pairKey(p[0], p[1])));
const PA = new Set(["자유", "축진", "인해", "묘오", "사신", "미술"].map((p) => pairKey(p[0], p[1])));

export function relationOf(tti: Branch, day: Branch): Relation {
  const k = pairKey(tti, day);
  if (tti !== day) {
    if (CHUNG.has(k)) return "충";
    if (YUKHAP.has(k)) return "육합";
    if (SAMHAP_GROUPS.some((g) => g.includes(tti) && g.includes(day))) return "삼합";
    if (HYEONG.has(k)) return "형";
    if (HAE.has(k)) return "해";
    if (PA.has(k)) return "파";
    return "평";
  }
  return SELF_HYEONG.has(tti) ? "형" : "같은 띠";
}

/** 별점 (5점 만점) */
export const STARS: Record<Relation, number> = { 육합: 5, 삼합: 4, "같은 띠": 3, 평: 3, 해: 2, 파: 2, 형: 2, 충: 1 };

interface Lines {
  total: string[];
  money: string[];
  people: string[];
  health: string[];
  advice: string[];
}

const TEXT: Record<Relation, Lines> = {
  육합: {
    total: ["손발이 척척 맞는 날이에요. 미뤄 둔 일을 꺼내 들면 술술 풀립니다.", "귀인이 곁에 있는 날이에요. 도움을 청하면 생각보다 쉽게 손이 닿습니다.", "막혔던 일이 스르르 풀리는 날이에요. 반가운 소식을 기다려 보세요."],
    money: ["작은 이익이 들어오는 흐름이에요.", "약속한 돈이나 거래가 매끄럽게 마무리됩니다.", "함께하는 일에서 득이 생깁니다."],
    people: ["말이 잘 통하는 사람을 만납니다.", "오랜만의 연락이 반가운 인연으로 이어져요.", "가족과 웃을 일이 생깁니다."],
    health: ["몸이 가볍고 기운이 좋아요.", "잠을 푹 자면 더 좋습니다.", "산책이 기운을 북돋워 줍니다."],
    advice: ["먼저 손을 내미세요.", "고맙다는 말을 아끼지 마세요.", "좋은 일은 나누면 더 커집니다."],
  },
  삼합: {
    total: ["뜻이 맞는 사람들과 힘을 모으기 좋은 날이에요.", "흐름이 순하게 이어지는 날이에요. 차근차근 나아가면 됩니다.", "여럿이 함께하는 일에서 좋은 결과가 납니다."],
    money: ["모임이나 협력에서 이익이 납니다.", "꾸준히 해 온 일이 보답을 받습니다.", "새는 돈이 적은 날이에요."],
    people: ["단체 대화방에 좋은 소식이 올라옵니다.", "편안한 사람과의 약속이 기운을 줍니다.", "부탁을 들어주면 나중에 돌아옵니다."],
    health: ["기운이 고르게 도는 날이에요.", "가벼운 운동이 잘 맞습니다.", "물을 자주 드세요."],
    advice: ["혼자보다 함께 하세요.", "계획을 함께 나눠 보세요.", "작은 약속부터 지키세요."],
  },
  "같은 띠": {
    total: ["내 기운이 또렷해지는 날이에요. 다만 고집이 세지기 쉬우니 한 발 물러서는 여유를 두세요.", "자신감이 생기는 날이에요. 결정은 신중하게, 행동은 차분하게.", "내 뜻대로 하고 싶은 마음이 커지는 날이에요. 주변 의견도 한 번 들어 보세요."],
    money: ["지출은 계획대로만 하세요.", "충동구매만 피하면 무난합니다.", "큰돈은 하루 더 생각해 보세요."],
    people: ["의견이 부딪히면 먼저 들어 주세요.", "가까운 사람과 작은 말다툼을 조심하세요.", "말투를 부드럽게 하면 일이 쉬워집니다."],
    health: ["무리하지 않으면 괜찮습니다.", "어깨와 목을 자주 풀어 주세요.", "과식만 조심하세요."],
    advice: ["양보가 이기는 날이에요.", "한 박자 쉬어 가세요.", "웃으며 말하세요."],
  },
  평: {
    total: ["큰 굴곡 없이 무난하게 흘러가는 날이에요.", "평범한 하루 속에 작은 기쁨이 숨어 있어요.", "하던 일을 꾸준히 하면 되는 날이에요."],
    money: ["씀씀이는 평소대로면 충분합니다.", "작은 저축이 마음을 편하게 합니다.", "가계부를 한 번 정리해 보세요."],
    people: ["안부 전화 한 통이 좋은 날이에요.", "가까운 사람과 차 한잔 나눠 보세요.", "가족과 식사를 함께 하세요."],
    health: ["규칙적인 식사가 보약이에요.", "가벼운 스트레칭을 해 보세요.", "일찍 잠자리에 드세요."],
    advice: ["평범함에 감사하세요.", "미뤄 둔 정리를 해 보세요.", "작은 일부터 마무리하세요."],
  },
  해: {
    total: ["사소한 오해가 생기기 쉬운 날이에요. 말을 한 번 더 확인하세요.", "기대와 조금 어긋날 수 있는 날이에요. 마음을 느긋하게 가지세요.", "작은 섭섭함이 생길 수 있어요. 마음에 담아 두지 마세요."],
    money: ["보증이나 돈 빌려주는 일은 미루세요.", "작은 손해는 웃고 넘기세요.", "계약서는 꼼꼼히 읽어 보세요."],
    people: ["말꼬리를 잡지 마세요.", "문자보다는 직접 이야기하는 게 좋아요.", "서운한 마음은 내일 이야기하세요."],
    health: ["소화가 더딜 수 있으니 천천히 드세요.", "마음을 편히 가지는 게 먼저예요.", "따뜻한 차가 좋습니다."],
    advice: ["확인하고 또 확인하세요.", "먼저 오해를 풀어 보세요.", "서두르지 마세요."],
  },
  파: {
    total: ["계획이 살짝 어긋날 수 있는 날이에요. 다른 길을 하나 더 준비해 두세요.", "생각대로 안 되는 일이 있어도 너무 마음 쓰지 마세요. 금방 지나갑니다.", "약속이 바뀔 수 있는 날이에요. 일정은 넉넉하게 잡으세요."],
    money: ["큰 결정은 내일로 미루세요.", "물건이 깨지거나 고장 날 수 있어요. 조심히 다루세요.", "예상 못 한 지출에 대비하세요."],
    people: ["약속 시간을 다시 확인하세요.", "기대는 조금 낮추면 마음이 편해요.", "부탁은 정중하게 하세요."],
    health: ["넘어지거나 부딪히지 않게 조심하세요.", "무리한 일정은 줄이세요.", "충분히 쉬세요."],
    advice: ["플랜 B를 준비하세요.", "느긋한 마음이 약이에요.", "오늘은 정리하는 날로 삼으세요."],
  },
  형: {
    total: ["마찰이 생기기 쉬운 날이에요. 한 번 참으면 일이 쉬워집니다.", "예민해지기 쉬운 날이에요. 중요한 말은 하루 미뤄도 괜찮아요.", "부딪힘이 있을 수 있는 날이에요. 부드러운 말이 방패가 됩니다."],
    money: ["서류와 돈 계산은 두 번 확인하세요.", "다툼이 될 만한 거래는 피하세요.", "지갑과 카드를 잘 챙기세요."],
    people: ["윗사람과 부딪히지 않게 조심하세요.", "따지기보다 들어 주세요.", "농담도 가려서 하세요."],
    health: ["날카로운 물건과 칼을 조심하세요.", "운전은 천천히 하세요.", "스트레스를 풀 시간을 가지세요."],
    advice: ["참을 인(忍) 세 번이에요.", "웃으며 넘기세요.", "오늘은 듣는 사람이 되세요."],
  },
  충: {
    total: ["변화와 움직임이 많은 날이에요. 서두르지 않으면 오히려 기회가 됩니다.", "예상 못 한 일이 생길 수 있는 날이에요. 침착하게 하나씩 처리하세요.", "부딪히는 기운이 있는 날이에요. 큰 결정보다는 지키는 쪽이 좋습니다."],
    money: ["새로운 투자나 큰 지출은 미루세요.", "돈 문제는 오늘보다 내일 이야기하세요.", "충동적인 결정은 피하세요."],
    people: ["감정이 앞서지 않게 숨을 고르세요.", "다툼이 생기면 자리를 잠시 피하세요.", "가까운 사람의 말에 귀 기울이세요."],
    health: ["이동할 때 안전을 먼저 챙기세요.", "무리한 운동은 피하세요.", "충분히 자고 쉬세요."],
    advice: ["급할수록 돌아가세요.", "지키는 것도 이기는 것이에요.", "오늘은 조용히 힘을 모으는 날이에요."],
  },
};

/** 오행 상생: 이 오행을 낳아 주는 오행 */
const MOTHER: Record<ElementKo, ElementKo> = { 목: "수", 화: "목", 토: "화", 금: "토", 수: "금" };
const LUCKY_COLOR: Record<ElementKo, string> = { 목: "초록", 화: "빨강", 토: "노랑", 금: "흰색", 수: "검정·남색" };
const LUCKY_DIRECTION: Record<ElementKo, string> = { 목: "동쪽", 화: "남쪽", 토: "가운데", 금: "서쪽", 수: "북쪽" };
const LUCKY_NUMBER: Record<ElementKo, string> = { 목: "3·8", 화: "2·7", 토: "5·10", 금: "4·9", 수: "1·6" };

// ───────────────────────── 년생별 한 줄 ─────────────────────────

/** 년생별 운세 범위: 그해 기준 만 40~75세 (36년 = 12띠 × 3) */
export const AGE_MIN = 40;
export const AGE_MAX = 75;

export const STEMS = ["갑", "을", "병", "정", "무", "기", "경", "신", "임", "계"] as const;
export type Stem = (typeof STEMS)[number];
const STEM_ELEMENT: Record<Stem, ElementKo> = { 갑: "목", 을: "목", 병: "화", 정: "화", 무: "토", 기: "토", 경: "금", 신: "금", 임: "수", 계: "수" };
/** 이 오행이 이기는(극하는) 오행 */
const CONTROLS: Record<ElementKo, ElementKo> = { 목: "토", 화: "금", 토: "수", 금: "목", 수: "화" };
const STEM_HAP = new Set(["갑기", "을경", "병신", "정임", "무계"].map((p) => pairKey(p[0], p[1])));

/** 태어난 해의 간지 (입춘 기준이 아니라 그해 대표 간지 - 띠와 같은 기준) */
export function yearGanzhi(year: number): { stem: Stem; branch: Branch; ganzhi: string } {
  const stem = STEMS[(((year - 4) % 10) + 10) % 10];
  const branch = BRANCHES[(((year - 4) % 12) + 12) % 12];
  return { stem, branch, ganzhi: stem + branch };
}

export type StemRelation = "합" | "비화" | "인성" | "식상" | "재성" | "관성";

/** 태어난 해 천간(나) 기준으로 본 그날 일진 천간과의 관계 */
export function stemRelation(birth: Stem, day: Stem): StemRelation {
  if (birth !== day && STEM_HAP.has(pairKey(birth, day))) return "합";
  const me = STEM_ELEMENT[birth];
  const d = STEM_ELEMENT[day];
  if (me === d) return "비화";
  if (MOTHER[me] === d) return "인성"; // 일진이 나를 낳아 줌 - 도움
  if (MOTHER[d] === me) return "식상"; // 내가 일진을 낳아 줌 - 표현·베풂, 기운이 나감
  if (CONTROLS[me] === d) return "재성"; // 내가 이김 - 재물·실속
  return "관성"; // 일진이 나를 이김 - 책임·부담
}

type AgeBand = "40대" | "50대" | "60대" | "70대";
function ageBand(age: number): AgeBand {
  return age >= 70 ? "70대" : age >= 60 ? "60대" : age >= 50 ? "50대" : "40대";
}

/** 관계 × 나이대별 문구 (나이대에 맞는 관심사: 40대 일·자녀 / 50대 재물·자리 / 60대 건강·가족 / 70대 마음·평안) */
const YEAR_TEXT: Record<StemRelation, Record<AgeBand, string[]>> = {
  합: {
    "40대": ["뜻이 맞는 사람과 손잡기 좋은 날이에요. 미뤄 둔 협의나 약속을 오늘 꺼내 보세요.", "일도 집안일도 손발이 맞는 날이에요. 주변의 도움을 편하게 받으세요."],
    "50대": ["오래 알고 지낸 사람에게서 좋은 제안이 올 수 있어요. 귀를 열어 두세요.", "함께하는 일에 운이 붙는 날이에요. 혼자 하기보다 같이 하세요."],
    "60대": ["반가운 연락이나 만남이 있는 날이에요. 먼저 안부를 전해 보세요.", "가족과 마음이 잘 통하는 날이에요. 같이 식사하며 이야기를 나눠 보세요."],
    "70대": ["자녀나 손주에게서 기쁜 소식이 들릴 수 있어요.", "마음 맞는 벗과 차 한잔하기 좋은 날이에요. 웃을 일이 생깁니다."],
  },
  비화: {
    "40대": ["동료나 형제와 힘을 모으면 일이 수월해요. 다만 경쟁심은 내려놓으세요.", "내 뜻대로 밀고 나가고 싶은 날이에요. 한 번 더 상대 입장을 들어 보세요."],
    "50대": ["비슷한 처지의 사람과 정보를 나누면 득이 됩니다. 돈거래는 분명하게 하세요.", "자존심 대결은 피하는 게 좋아요. 한발 물러서면 오히려 얻는 게 있습니다."],
    "60대": ["친구나 형제와 어울리기 좋은 날이에요. 모임 자리에서 기운을 얻습니다.", "고집을 조금만 내려놓으면 집안이 한결 편안해집니다."],
    "70대": ["오랜 친구와의 만남이 활력이 되는 날이에요.", "형제나 친척 일로 마음 쓸 일이 생겨도 너무 걱정 마세요. 잘 풀립니다."],
  },
  인성: {
    "40대": ["윗사람이나 선배의 조언이 큰 도움이 되는 날이에요. 배우는 일에 운이 따릅니다.", "서류·계약·자격 관련 일이 순조로워요. 미뤄 둔 공부를 시작해 보세요."],
    "50대": ["든든한 도움이 들어오는 날이에요. 혼자 끙끙대지 말고 의논하세요.", "문서나 집 관련 일에 좋은 흐름이 있어요. 꼼꼼히 챙기면 득이 됩니다."],
    "60대": ["마음이 차분해지고 생각이 맑아지는 날이에요. 책을 읽거나 무언가 배우기에 좋습니다.", "자녀나 주변의 따뜻한 배려를 받는 날이에요. 고마운 마음을 표현해 보세요."],
    "70대": ["몸과 마음이 편안한 날이에요. 푹 쉬면 기운이 차오릅니다.", "주변의 보살핌이 따뜻하게 느껴지는 날이에요. 도움은 편히 받으세요."],
  },
  식상: {
    "40대": ["아이디어와 말솜씨가 빛나는 날이에요. 발표나 제안에 좋지만 말이 앞서지 않게 하세요.", "자녀 일로 바쁠 수 있어요. 기운을 너무 쏟지 말고 쉬는 시간을 챙기세요."],
    "50대": ["베푼 만큼 돌아오는 날이에요. 다만 지갑은 계획한 만큼만 여세요.", "하고 싶은 말이 많아지는 날이에요. 한 번 삼키면 관계가 더 좋아집니다."],
    "60대": ["취미나 손으로 하는 일이 즐거운 날이에요. 다만 무리하면 쉽게 지칩니다.", "자식·손주 챙기느라 기운이 빠질 수 있어요. 내 몸도 함께 챙기세요."],
    "70대": ["이야기 나눌 사람이 반가운 날이에요. 가벼운 산책길 대화가 좋습니다.", "기운이 밖으로 새기 쉬운 날이에요. 일찍 쉬고 따뜻하게 드세요."],
  },
  재성: {
    "40대": ["실속을 챙기기 좋은 날이에요. 받을 돈이나 미뤄 둔 정산을 정리해 보세요.", "일한 만큼 성과가 보이는 날이에요. 다만 욕심내서 일을 벌이지는 마세요."],
    "50대": ["재물 흐름이 살아나는 날이에요. 작은 이익이라도 차곡차곡 챙기세요.", "돈 되는 정보가 들어올 수 있어요. 큰 결정은 하루 더 살펴보고 하세요."],
    "60대": ["살림이 알뜰하게 돌아가는 날이에요. 장보기에도 운이 있습니다.", "뜻밖의 용돈이나 작은 이익이 생길 수 있어요."],
    "70대": ["필요한 것이 제때 손에 들어오는 날이에요.", "살림을 정리하면 잊고 있던 물건이나 돈을 찾을 수 있어요."],
  },
  관성: {
    "40대": ["책임질 일이 늘어나는 날이에요. 잘 해내면 평가가 올라갑니다.", "윗선의 요구가 까다로울 수 있어요. 원칙대로 차분히 처리하세요."],
    "50대": ["자리와 체면을 지켜야 하는 날이에요. 말 한마디를 신중하게 하세요.", "부담스러운 부탁이 들어올 수 있어요. 무리하게 떠안지 마세요."],
    "60대": ["몸이 무겁게 느껴질 수 있어요. 일정을 줄이고 쉬어 가세요.", "규칙과 약속을 잘 지키면 탈 없이 지나가는 날이에요."],
    "70대": ["무리한 외출은 피하고 집에서 편히 쉬세요.", "평소 불편한 곳을 살피는 날이에요. 천천히 움직이세요."],
  },
};

export interface TtiYearLine {
  /** 태어난 해 (예: 1962) */
  year: number;
  /** "62년생" */
  label: string;
  /** 그해 간지 (예: 임인) */
  ganzhi: string;
  relation: StemRelation;
  text: string;
}

/** 이 띠의 년생 목록 (그해 기준 만 40~75세, 띠마다 3개) */
export function ttiBirthYears(branch: Branch, refYear: number): number[] {
  const out: number[] = [];
  for (let y = refYear - AGE_MAX; y <= refYear - AGE_MIN; y++) if (yearGanzhi(y).branch === branch) out.push(y);
  return out;
}

export function ttiYearLines(branch: Branch, dayStem: Stem, date: string): TtiYearLine[] {
  const refYear = Number(date.slice(0, 4));
  return ttiBirthYears(branch, refYear).map((year) => {
    const g = yearGanzhi(year);
    const relation = stemRelation(g.stem, dayStem);
    const arr = YEAR_TEXT[relation][ageBand(refYear - year)];
    return { year, label: `${String(year).slice(2)}년생`, ganzhi: g.ganzhi, relation, text: arr[(dayIndex(date) + year) % arr.length] };
  });
}

export interface TtiFortune {
  branch: Branch;
  hanja: string;
  animal: string;
  relation: Relation;
  stars: number;
  total: string;
  money: string;
  people: string;
  health: string;
  advice: string;
  luckyColor: string;
  luckyDirection: string;
  luckyNumber: string;
  /** 년생별 한 줄 (만 40~75세, 3개) - 일진 천간을 모르면 빈 배열 */
  years: TtiYearLine[];
}

/** 날짜 문자열(YYYY-MM-DD)을 정수로 - 문구 고르기용 */
function dayIndex(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
}

export function ttiFortune(tti: TtiInfo, dayBranch: Branch, date: string, dayStem?: Stem): TtiFortune {
  const relation = relationOf(tti.branch, dayBranch);
  const t = TEXT[relation];
  const base = dayIndex(date) + BRANCHES.indexOf(tti.branch);
  const pick = (arr: string[], salt: number) => arr[(base + salt) % arr.length];
  const lucky = MOTHER[tti.element];
  return {
    branch: tti.branch,
    hanja: tti.hanja,
    animal: tti.animal,
    relation,
    stars: STARS[relation],
    total: pick(t.total, 0),
    money: pick(t.money, 1),
    people: pick(t.people, 2),
    health: pick(t.health, 0),
    advice: pick(t.advice, 1),
    luckyColor: LUCKY_COLOR[lucky],
    luckyDirection: LUCKY_DIRECTION[lucky],
    luckyNumber: LUCKY_NUMBER[lucky],
    years: dayStem ? ttiYearLines(tti.branch, dayStem, date) : [],
  };
}

export function allTtiFortunes(dayBranch: Branch, date: string, dayStem?: Stem): TtiFortune[] {
  return TTI.map((t) => ttiFortune(t, dayBranch, date, dayStem));
}

/** 태어난 해 → 띠 (양력 1~2월 초 생은 입춘·설 전이면 전해 띠일 수 있음 - 화면에서 안내) */
export function ttiOfYear(year: number): TtiInfo {
  return TTI[(((year - 4) % 12) + 12) % 12];
}

/** YYYY-MM-DD 에 하루 더하기 */
export function nextDate(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + 1));
  return dt.toISOString().slice(0, 10);
}
