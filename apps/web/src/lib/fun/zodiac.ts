import type { ElementKo } from "@/lib/pillarView";
import type { FunResult } from "./types";

/**
 * 별자리 (2026-10-26 무료 묶음, AI 없음).
 *
 * 날짜 경계는 국내에서 흔히 쓰는 표를 따른다. 실제 태양의 위치에 따라 경계일은 해마다 하루쯤 달라질 수 있어
 * 화면에 그 안내를 붙인다.
 * 오행 견주기: 서양 4원소 → 동양 오행. 불=화, 흙=토, 물=수, 바람=목(주역에서 바람 巽은 목의 괘).
 * 문장은 이 사이트에서 새로 쓴 것이다.
 */

type Air = "불" | "흙" | "바람" | "물";

interface Sign {
  key: string;
  name: string;
  symbol: string;
  /** [월, 일] 시작 (그날부터) */
  from: [number, number];
  to: [number, number];
  air: Air;
  body: string[];
  tags: string[];
}

const SIGNS: Sign[] = [
  {
    key: "aquarius", name: "물병자리", symbol: "♒", from: [1, 20], to: [2, 18], air: "바람",
    body: ["틀에 박힌 것을 싫어하고, 남들과 다른 생각에서 답을 찾는 별자리예요.", "사람을 차별 없이 대하고 넓게 사귀지만, 속마음은 쉽게 내보이지 않아요.", "혼자만의 시간이 충분할 때 가장 좋은 아이디어가 떠올라요."],
    tags: ["독창성", "자유", "우정"],
  },
  {
    key: "pisces", name: "물고기자리", symbol: "♓", from: [2, 19], to: [3, 20], air: "물",
    body: ["감수성이 깊고 상상력이 풍부한 별자리예요.", "남의 아픔을 내 일처럼 느끼는 따뜻함이 있어서, 곁에 있으면 위로가 돼요.", "현실이 버거울 땐 음악이나 그림, 물가 산책으로 마음을 채우면 좋아요."],
    tags: ["공감", "상상력", "따뜻함"],
  },
  {
    key: "aries", name: "양자리", symbol: "♈", from: [3, 21], to: [4, 19], air: "불",
    body: ["열두 별자리의 첫 자리답게, 무엇이든 먼저 시작하는 용기가 있어요.", "솔직하고 뒤끝이 없어서 함께 있으면 시원시원해요.", "급한 마음에 끝맺음이 약해질 수 있으니, 시작한 일 하나를 끝까지 가져가 보세요."],
    tags: ["용기", "열정", "솔직함"],
  },
  {
    key: "taurus", name: "황소자리", symbol: "♉", from: [4, 20], to: [5, 20], air: "흙",
    body: ["느리지만 단단하게, 오래가는 것을 쌓는 별자리예요.", "좋은 음식과 편안한 공간, 손에 잡히는 아름다움을 아끼는 감각이 있어요.", "한번 정한 것을 잘 바꾸지 않는 만큼, 새로운 길 앞에서는 한 번 더 열린 마음을 내 보세요."],
    tags: ["끈기", "안정", "감각"],
  },
  {
    key: "gemini", name: "쌍둥이자리", symbol: "♊", from: [5, 21], to: [6, 21], air: "바람",
    body: ["호기심이 많고 말재주가 좋은 별자리예요.", "여러 가지를 동시에 해내는 재주가 있어서, 정보와 사람을 잇는 일에서 빛나요.", "관심이 금세 옮겨 가기 쉬우니, 깊이 파고들 한 가지를 정해 두면 좋아요."],
    tags: ["호기심", "재치", "소통"],
  },
  {
    key: "cancer", name: "게자리", symbol: "♋", from: [6, 22], to: [7, 22], air: "물",
    body: ["가족과 내 사람을 무엇보다 소중히 여기는 별자리예요.", "겉은 단단해 보여도 속은 여리고 정이 많아요.", "지난 일에 마음이 오래 머물 수 있으니, 오늘 가까운 사람과 나누는 시간을 늘려 보세요."],
    tags: ["가족", "보살핌", "정"],
  },
  {
    key: "leo", name: "사자자리", symbol: "♌", from: [7, 23], to: [8, 22], air: "불",
    body: ["무대 한가운데가 잘 어울리는, 당당하고 너그러운 별자리예요.", "자기 사람을 끝까지 챙기는 의리가 있어서 따르는 이가 많아요.", "인정받고 싶은 마음이 클수록 스스로를 다그치기 쉬워요. 이미 충분히 빛나고 있어요."],
    tags: ["자신감", "의리", "너그러움"],
  },
  {
    key: "virgo", name: "처녀자리", symbol: "♍", from: [8, 23], to: [9, 23], air: "흙",
    body: ["작은 것까지 놓치지 않는 꼼꼼함과 분석력을 가진 별자리예요.", "남을 돕는 일에서 보람을 느끼고, 맡은 일은 깔끔하게 끝내요.", "완벽을 바라다 보면 걱정이 늘어요. '이만하면 잘했다'고 스스로에게 말해 주세요."],
    tags: ["꼼꼼함", "분석", "성실"],
  },
  {
    key: "libra", name: "천칭자리", symbol: "♎", from: [9, 24], to: [10, 22], air: "바람",
    body: ["균형과 아름다움을 아는 별자리예요.", "사람 사이의 공정함을 중요하게 여기고, 갈등을 부드럽게 푸는 재주가 있어요.", "모두를 만족시키려다 결정이 늦어지기 쉬워요. 내 마음이 기우는 쪽을 믿어 보세요."],
    tags: ["조화", "공정", "미적 감각"],
  },
  {
    key: "scorpio", name: "전갈자리", symbol: "♏", from: [10, 23], to: [11, 22], air: "물",
    body: ["깊고 강렬한 마음을 지닌 별자리예요.", "한번 마음을 주면 끝까지 가는 사람이고, 꿰뚫어 보는 눈이 날카로워요.", "상처를 오래 품어 두기 쉬우니, 털어놓을 수 있는 한 사람을 곁에 두세요."],
    tags: ["집중력", "통찰", "깊은 정"],
  },
  {
    key: "sagittarius", name: "사수자리", symbol: "♐", from: [11, 23], to: [12, 24], air: "불",
    body: ["멀리 보고 멀리 가는, 자유롭고 낙천적인 별자리예요.", "배움과 여행에서 기운을 얻고, 사람들에게 희망을 주는 말을 잘해요.", "약속을 넉넉히 잡다 보면 버거워질 수 있어요. 할 수 있는 만큼만 약속해 보세요."],
    tags: ["낙천", "모험", "배움"],
  },
  {
    key: "capricorn", name: "염소자리", symbol: "♑", from: [12, 25], to: [1, 19], air: "흙",
    body: ["높은 산을 한 걸음씩 오르는, 인내와 책임의 별자리예요.", "현실 감각이 뛰어나고, 시간이 갈수록 실력과 신뢰가 쌓여요.", "일에 몰두하다 쉼을 잊기 쉬우니, 쉬는 날도 계획표에 적어 두세요."],
    tags: ["인내", "책임감", "현실 감각"],
  },
];

const AIR_ELEMENT: Record<Air, ElementKo> = { 불: "화", 흙: "토", 물: "수", 바람: "목" };

function inRange(m: number, d: number, s: Sign): boolean {
  const v = m * 100 + d;
  const a = s.from[0] * 100 + s.from[1];
  const b = s.to[0] * 100 + s.to[1];
  return a <= b ? v >= a && v <= b : v >= a || v <= b;
}

export function zodiacSign(solarDate: string): Sign {
  const [, m, d] = solarDate.split("-").map(Number);
  return SIGNS.find((s) => inRange(m, d, s)) ?? SIGNS[0];
}

function fmt([m, d]: [number, number]): string {
  return `${m}.${d}`;
}

export function zodiacResult(solarDate: string): FunResult {
  const s = zodiacSign(solarDate);
  const el = AIR_ELEMENT[s.air];
  const [, m, d] = solarDate.split("-").map(Number);
  const nearEdge = SIGNS.some((x) => (x.from[0] === m && Math.abs(x.from[1] - d) <= 1) || (x.to[0] === m && Math.abs(x.to[1] - d) <= 1));
  return {
    key: s.key,
    badge: s.symbol,
    short: s.name,
    title: s.name,
    subtitle: `${fmt(s.from)} ~ ${fmt(s.to)} · ${s.air}의 별자리${nearEdge ? " · 경계일 생일은 해마다 하루쯤 달라질 수 있어요" : ""}`,
    body: s.body,
    tags: s.tags,
    element: el,
    elementNote: `${s.air}의 별자리를 동양의 오행에 견주면 ${el}의 기운이에요.`,
  };
}

/** 테스트용 */
export const ZODIAC_SIGNS = SIGNS;
