import { josa } from "@/tenants";
import type { ElementKo } from "@/lib/pillarView";
import { ELEMENT_HANJA, ELEMENT_NATURE } from "@/lib/manseView";
import type { FunResult } from "./types";

/**
 * MBTI관 (2026-11-01 유샘 지시서, AI 없음, 지금은 무료).
 *   검사는 하지 않는다 - 손님이 16가지 중 자기 유형을 고른다. 생년월일은 다른 재미관과 같은 입력을 쓴다.
 *   풀이: ① 유형 한 줄 요약 ② 일간(10개) 기질 한 줄 ③ 둘을 겹쳐 본 풀이 4문장
 *   ③은 160개 조합을 따로 쓰지 않고, 네 축을 규칙으로 엮는다 (같은 날 지니 제안, 유샘 승인):
 *     E/I ↔ 일간 음양 (양간 갑·병·무·경·임은 밖으로, 음간 을·정·기·신·계는 안으로)
 *     S/N · T/F · J/P ↔ 일간 오행 - 축마다 "같은 결 / 다른 결(서로 채움) / 힘을 실어 줌(중간)" 세 가지 문장 틀
 *       S: 토·금과 같은 결, N: 목·수 / 화는 중간      T: 금·수, F: 화·목 / 토는 중간      J: 토·금, P: 목·수 / 화는 중간
 * MBTI는 재미로 보는 성격 유형이라 화면에 그렇게 밝힌다. 문장은 이 사이트에서 새로 쓴 것이다.
 */

export const MBTI_TYPES = [
  "ISTJ", "ISFJ", "INFJ", "INTJ",
  "ISTP", "ISFP", "INFP", "INTP",
  "ESTP", "ESFP", "ENFP", "ENTP",
  "ESTJ", "ESFJ", "ENFJ", "ENTJ",
] as const;
export type MbtiType = (typeof MBTI_TYPES)[number];

export function isMbtiType(v: unknown): v is MbtiType {
  return typeof v === "string" && (MBTI_TYPES as readonly string[]).includes(v);
}

/** ① 유형 한 줄 요약 */
const TYPE_TEXT: Record<MbtiType, { name: string; line: string }> = {
  ISTJ: { name: "묵묵한 원칙가", line: "맡은 일은 끝까지 해내는, 믿음직한 원칙의 사람이에요." },
  ISFJ: { name: "다정한 수호자", line: "조용히 곁을 지키며 사람을 살뜰히 챙기는 따뜻한 사람이에요." },
  INFJ: { name: "깊은 통찰가", line: "사람과 세상의 속뜻을 읽고 의미 있는 길을 찾는 사람이에요." },
  INTJ: { name: "큰 그림의 설계자", line: "멀리 내다보고 치밀하게 계획을 세우는 사람이에요." },
  ISTP: { name: "침착한 해결사", line: "말보다 손이 먼저, 문제를 차분하게 풀어내는 사람이에요." },
  ISFP: { name: "섬세한 예술가", line: "자기만의 감각으로 일상을 아름답게 만드는 사람이에요." },
  INFP: { name: "맑은 이상가", line: "마음속 가치를 소중히 여기고 진심으로 사는 사람이에요." },
  INTP: { name: "호기심 많은 사색가", line: "왜 그런지 끝까지 파고드는 생각의 탐험가예요." },
  ESTP: { name: "거침없는 행동가", line: "지금 이 순간에 강하고, 부딪히며 길을 여는 사람이에요." },
  ESFP: { name: "밝은 분위기 메이커", line: "어디서든 웃음을 만들고 순간을 즐길 줄 아는 사람이에요." },
  ENFP: { name: "열정의 불꽃", line: "새로운 가능성에 설레고 사람들에게 힘을 주는 사람이에요." },
  ENTP: { name: "기발한 발명가", line: "틀을 깨는 생각으로 판을 새롭게 짜는 사람이에요." },
  ESTJ: { name: "든든한 관리자", line: "질서를 세우고 일을 확실하게 굴러가게 하는 사람이에요." },
  ESFJ: { name: "살뜰한 살림꾼", line: "사람들을 챙기고 모두가 편안한 자리를 만드는 사람이에요." },
  ENFJ: { name: "따뜻한 이끔이", line: "사람의 가능성을 믿고 함께 자라도록 이끄는 사람이에요." },
  ENTJ: { name: "결단력 있는 지휘관", line: "목표를 세우면 사람과 일을 이끌어 끝내 이뤄 내는 사람이에요." },
};

const LETTER_TAG: Record<string, string> = { E: "사교적", I: "신중함", S: "현실 감각", N: "상상력", T: "논리", F: "공감", J: "계획", P: "유연함" };

/** ② 일간 기질 한 줄 (일간 10개) */
export const DAY_LINE: Record<string, string> = {
  갑: "곧게 위로 뻗는 큰 나무처럼, 한번 정한 길을 밀고 나가는 기질이에요.",
  을: "바람에 휘어도 꺾이지 않는 풀꽃처럼, 부드럽게 살아남는 끈기가 있어요.",
  병: "온 세상을 비추는 해처럼, 밝고 숨김없이 드러내는 기질이에요.",
  정: "어둠을 밝히는 촛불처럼, 가까운 이를 따뜻하게 비추는 섬세함이 있어요.",
  무: "넓고 듬직한 산처럼, 흔들리지 않고 중심을 지키는 기질이에요.",
  기: "곡식을 길러 내는 밭처럼, 사람을 품고 키워 내는 너그러움이 있어요.",
  경: "단단한 바위와 쇠처럼, 옳다고 믿는 것을 지켜 내는 결단력이 있어요.",
  신: "잘 다듬은 보석처럼, 섬세하고 깔끔하게 완성하는 기질이에요.",
  임: "넓게 흐르는 큰 물처럼, 크게 품고 멀리 내다보는 기질이에요.",
  계: "땅을 적시는 이슬비처럼, 조용히 스며들어 마음을 헤아리는 기질이에요.",
};

const YANG_STEMS = new Set(["갑", "병", "무", "경", "임"]);

const NATURE: Record<ElementKo, string> = { 목: "뻗어 나가는", 화: "드러내고 밝히는", 토: "받쳐 주고 버티는", 금: "다듬고 결단하는", 수: "스며들고 헤아리는" };

const LETTER: Record<string, { label: string; trait: string; same: string; differ: string; mid: string }> = {
  S: { label: "S(감각)", trait: "현실 감각", same: "눈앞의 일을 차근차근 쌓아 올리는 데 강해요", differ: "생각을 현실로 옮기는 발판이 되어 줘요", mid: "손에 잡히는 결과를 빠르게 만들어 내요" },
  N: { label: "N(직관)", trait: "넓은 상상", same: "남들이 못 본 가능성을 먼저 알아봐요", differ: "익숙한 틀 너머를 내다보는 눈을 더해 줘요", mid: "떠오른 생각을 밝게 펼쳐 보여요" },
  T: { label: "T(사고)", trait: "논리와 판단", same: "흔들림 없이 옳고 그름을 가려내요", differ: "마음이 앞설 때 한 번 더 따져 보게 해 줘요", mid: "복잡한 일도 이치에 맞게 정리해요" },
  F: { label: "F(감정)", trait: "공감과 마음", same: "사람의 마음을 살피며 함께 자라는 길을 찾아요", differ: "단단한 판단에 따뜻한 온기를 더해 줘요", mid: "주변을 편안하게 감싸는 힘이 있어요" },
  J: { label: "J(판단)", trait: "계획과 마무리", same: "세운 계획을 끝까지 지켜 내는 힘이 있어요", differ: "벌여 놓은 일을 끝까지 맺어 주는 힘이 돼요", mid: "흐름을 잡고 차근차근 마무리해요" },
  P: { label: "P(인식)", trait: "유연한 흐름", same: "흐름을 타고 상황에 맞춰 길을 바꾸는 데 능해요", differ: "굳어지기 쉬운 순간에 숨 쉴 틈을 만들어 줘요", mid: "새로운 기회에 가볍게 올라타요" },
};

/** 축마다 같은 결로 보는 오행 (나머지 중 mid 는 중간, 그 밖은 다른 결) */
const AXIS: Array<{ letters: [string, string]; first: ElementKo[]; second: ElementKo[]; mid: ElementKo }> = [
  { letters: ["S", "N"], first: ["토", "금"], second: ["목", "수"], mid: "화" },
  { letters: ["T", "F"], first: ["금", "수"], second: ["화", "목"], mid: "토" },
  { letters: ["J", "P"], first: ["토", "금"], second: ["목", "수"], mid: "화" },
];

export type AxisFit = "same" | "differ" | "mid";

export function axisFit(letter: string, el: ElementKo): AxisFit {
  const a = AXIS.find((x) => x.letters.includes(letter));
  if (!a) return "mid";
  if (el === a.mid) return "mid";
  const mine = a.letters[0] === letter ? a.first : a.second;
  return mine.includes(el) ? "same" : "differ";
}

function axisLine(letter: string, el: ElementKo): string {
  const L = LETTER[letter];
  const elName = `${ELEMENT_NATURE[el]}(${ELEMENT_HANJA[el]})`;
  const fit = axisFit(letter, el);
  if (fit === "mid") return `${elName}의 ${NATURE[el]} 기운이 ${L.label}의 ${L.trait}에 힘을 실어, ${L.mid}.`;
  return `${L.label}의 ${josa(L.trait, "은/는")} ${elName}의 ${NATURE[el]} 기운과 ${fit === "same" ? "같은" : "다른"} 결이라, ${fit === "same" ? L.same : L.differ}.`;
}

function eiLine(ei: string, stem: string, el: ElementKo): string {
  const name = `${stem}${el}`;
  const yang = YANG_STEMS.has(stem);
  if (ei === "E")
    return yang
      ? `밖으로 기운을 펼치는 E(외향)과 앞으로 뻗어 나가는 ${name}의 양(陽) 기운이 같은 방향이라, 사람들 사이에서 힘을 얻고 먼저 움직일 때 일이 풀려요.`
      : `사람들과 밝게 어울리는 E(외향)이지만 ${name}의 음(陰) 기운은 안으로 다지는 힘이라, 어울린 뒤에는 혼자 정리하는 시간이 있어야 다시 힘이 차요.`;
  return yang
    ? `조용히 안을 다지는 I(내향)과 밖으로 뻗는 ${name}의 양(陽) 기운이 만나, 겉은 고요해도 속에 큰 추진력을 품었어요.`
    : `안으로 깊어지는 I(내향)과 ${name}의 음(陰) 기운이 같은 결이라, 섬세하게 살피고 오래 품는 힘이 있어요.`;
}

/** ③ 겹쳐 본 풀이 4문장 */
export function mbtiBlend(type: MbtiType, stem: string, el: ElementKo): string[] {
  return [eiLine(type[0], stem, el), axisLine(type[1], el), axisLine(type[2], el), axisLine(type[3], el)];
}

/** ① 무료 결과 카드 */
export function mbtiResult(type: MbtiType): FunResult {
  const t = TYPE_TEXT[type];
  return {
    key: type,
    badge: type,
    short: type,
    title: `${type} · ${t.name}`,
    subtitle: "MBTI는 재미로 보는 성격 유형이에요. 검사 없이 알고 계신 유형을 골라 주세요",
    body: [t.line],
    tags: type.split("").map((c) => LETTER_TAG[c]),
  };
}
