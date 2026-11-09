import type { SajuJson } from "saju-engine";
import { determineTenGod, STEM_POLARITY, type TenGodName } from "saju-engine/dist/src/rules/tenGodTables";
import { STEM_ELEMENT } from "saju-engine/dist/src/rules/fiveElementTables";
import type { ElementKo } from "@/lib/pillarView";
import { ELEMENT_HANJA, ELEMENT_NATURE } from "@/lib/manseView";
import { TEN_GOD_GROUP, sajuFacts } from "@/lib/sajuFacts";
import type { TenGodGroup } from "@/lib/journey";
import { monthPillarsOfYear } from "@/lib/monthPillars";
import { branchRelation, coupleMatch, nameFill, stemRelation, type BranchRel } from "@/lib/coupleMatch";

/**
 * 크리스마스 연애운 (2026-11-09 유샘 지시서) - 사주 엔진 값만으로 쓰는 풀이 (AI 없음).
 *   솔로 길 "내 인연은 어디서 오나": 인연이 오는 길 · 다가오는 사람의 모습 · 이번 겨울의 인연 기운 · 연말부터 내년까지의 흐름
 *   커플 길 "이 사람이 내 인연일까": 끌림 한 줄(비회원) · 서로 끌린 이유 · 이번 겨울 두 사람의 기운 (짧은 궁합 990원도 같은 수준)
 *   2027 연애 달력(9,900원): 달마다 월운과 배우자 자리(일지)·배우자 별(여자 관성, 남자 재성)의 관계를 엔진 값으로 계산 → 글은 AI (server/love)
 * 말투: 겁주지 않는다. 고비를 말할 때는 지나가는 방법을 함께 쓴다.
 * 이름 자리는 {이름} / {A}·{B} 로 두고 마지막에 채운다.
 */

const STEM_EL: Record<string, ElementKo> = { 갑: "목", 을: "목", 병: "화", 정: "화", 무: "토", 기: "토", 경: "금", 신: "금", 임: "수", 계: "수" };
const BRANCH_EL: Record<string, ElementKo> = { 자: "수", 축: "토", 인: "목", 묘: "목", 진: "토", 사: "화", 오: "화", 미: "토", 신: "금", 유: "금", 술: "토", 해: "수" };
const STEM_HJ: Record<string, string> = { 갑: "甲", 을: "乙", 병: "丙", 정: "丁", 무: "戊", 기: "己", 경: "庚", 신: "辛", 임: "壬", 계: "癸" };
const BRANCH_HJ: Record<string, string> = { 자: "子", 축: "丑", 인: "寅", 묘: "卯", 진: "辰", 사: "巳", 오: "午", 미: "未", 신: "申", 유: "酉", 술: "戌", 해: "亥" };
const ORDER: ElementKo[] = ["목", "화", "토", "금", "수"];
/** a 가 극하는 오행 */
const controls = (a: ElementKo): ElementKo => ORDER[(ORDER.indexOf(a) + 2) % 5];
/** a 를 극하는 오행 */
const controlledBy = (a: ElementKo): ElementKo => ORDER[(ORDER.indexOf(a) + 3) % 5];

/** 역마(驛馬): 신자진→인, 인오술→신, 사유축→해, 해묘미→사 (년지·일지 기준, 명리학 표준 신살) */
const YEOKMA: Record<string, string> = { 신: "인", 자: "인", 진: "인", 인: "신", 오: "신", 술: "신", 사: "해", 유: "해", 축: "해", 해: "사", 묘: "사", 미: "사" };

/** 2026년 12월 (대설~) 월주 = 경자 - monthPillarsOfYear(2026) 의 12월 칸 */
export const WINTER_MONTH = monthPillarsOfYear(2026)[10];

export interface LoveSection {
  key: string;
  heading: string;
  body: string;
}

function tenGodOf(dayStem: string, otherStem: string): TenGodName {
  return determineTenGod(STEM_ELEMENT[dayStem], STEM_POLARITY[dayStem], STEM_ELEMENT[otherStem], STEM_POLARITY[otherStem]);
}

/** 사주 한 사람의 연애 바탕 (엔진 값) */
export interface LoveBase {
  gender: "male" | "female";
  dayStem: string;
  dayBranch: string;
  dayBranchEl: ElementKo;
  dayBranchTenGod: TenGodName;
  dayBranchGroup: TenGodGroup;
  /** 배우자 별: 여자는 관성(나를 극하는 오행), 남자는 재성(내가 극하는 오행) */
  spouseEl: ElementKo;
  spouseGroup: "관성" | "재성";
  spousePct: number;
  groupPct: Record<TenGodGroup, number>;
  /** 원국에 있는 역마 글자 수 */
  yeokma: number;
  yeokmaBranches: string[];
}

export function loveBase(saju: SajuJson): LoveBase {
  const f = sajuFacts(saju);
  const p = saju.pillars;
  const dayStem = p.day.heavenlyStem as string;
  const dayBranch = p.day.earthlyBranch as string;
  const gender = saju.birth.gender === "female" ? "female" : "male";
  const dayEl = STEM_EL[dayStem];
  const spouseEl = gender === "female" ? controlledBy(dayEl) : controls(dayEl);
  const spouseGroup = gender === "female" ? "관성" : "재성";
  const groupPct = Object.fromEntries(f.groups.map((g) => [g.group, g.percent])) as Record<TenGodGroup, number>;
  const branches = [p.year, p.month, p.day, p.hour].filter(Boolean).map((x) => (x as { earthlyBranch: string }).earthlyBranch);
  const yeokmaBranches = [...new Set([YEOKMA[p.year.earthlyBranch as string], YEOKMA[dayBranch]])];
  const yeokma = branches.filter((b) => yeokmaBranches.includes(b)).length;
  const bt = (saju.tenGods.earthlyBranches as Record<string, { primary: TenGodName } | undefined>).day?.primary ?? "비견";
  return {
    gender,
    dayStem,
    dayBranch,
    dayBranchEl: BRANCH_EL[dayBranch],
    dayBranchTenGod: bt,
    dayBranchGroup: TEN_GOD_GROUP[bt],
    spouseEl,
    spouseGroup,
    spousePct: groupPct[spouseGroup] ?? 0,
    groupPct,
    yeokma,
    yeokmaBranches,
  };
}

// ───────────────────────── 솔로 길 ─────────────────────────

type PathKey = "travel" | "social" | "work";

function pathText(b: LoveBase, key: PathKey): string {
  if (key === "travel")
    return `{이름}님 사주에는 길 위의 기운인 역마(驛馬)가 ${b.yeokma}자리에 있어요. 익숙한 동네보다 여행지나 처음 가 보는 곳, 새로 시작한 일로 오가는 길에서 인연이 닿기 쉬워요. 이번 겨울에는 짧은 여행이나 처음 가 보는 모임에 한 번 나가 보세요.`;
  if (key === "social") {
    const sik = b.groupPct["식상"] ?? 0;
    const bi = b.groupPct["비겁"] ?? 0;
    return sik >= bi
      ? `{이름}님은 재능과 표현의 기운(식상)이 ${sik}%로 두드러져요. 내 매력이 자연스럽게 드러나는 모임·동호회·지인 소개 자리에서 인연이 이어지기 쉬워요. 좋아하는 일을 함께하는 자리에 꾸준히 얼굴을 비추면 좋아요.`
      : `{이름}님은 나와 같은 기운(비겁)이 ${bi}%로 두드러져요. 친구와 지인의 소개, 친구의 친구가 함께하는 자리에서 인연이 오기 쉬워요. 가까운 사람에게 "좋은 사람 있으면 소개해 줘" 하고 말해 두세요.`;
  }
  return b.spouseGroup === "관성"
    ? `{이름}님 사주에서 배우자를 뜻하는 관성(官星)이 ${b.spousePct}%로 뚜렷해요. 직장이나 일로 만나는 사람, 함께 책임을 나누는 자리에서 인연이 자라기 쉬워요. 일하는 모습을 보여 줄 때 {이름}님이 가장 빛나요.`
    : `{이름}님 사주에서 배우자를 뜻하는 재성(財星)이 ${b.spousePct}%로 뚜렷해요. 직장이나 거래처, 일로 만나는 자리에서 인연이 자라기 쉬워요. 일을 꼼꼼히 챙기는 모습이 상대의 마음을 열어요.`;
}

/** 인연이 오는 길 - 기준을 넘는 것을 강한 순서로 (하나도 없으면 가장 강한 하나) */
export function lovePaths(b: LoveBase): PathKey[] {
  const cand: Array<{ key: PathKey; score: number; ok: boolean }> = ([
    { key: "travel" as PathKey, score: b.yeokma > 0 ? 15 + 10 * b.yeokma : 0, ok: b.yeokma > 0 },
    { key: "social" as PathKey, score: Math.max(b.groupPct["식상"] ?? 0, b.groupPct["비겁"] ?? 0), ok: Math.max(b.groupPct["식상"] ?? 0, b.groupPct["비겁"] ?? 0) >= 25 },
    { key: "work" as PathKey, score: b.spousePct, ok: b.spousePct >= 20 },
  ]).sort((x, y) => y.score - x.score);
  const ok = cand.filter((c) => c.ok);
  return (ok.length ? ok : cand.slice(0, 1)).map((c) => c.key);
}

const EL_PERSON: Record<ElementKo, string> = {
  목: "곧고 따뜻한 사람, 함께 자라려는 마음이 큰 사람",
  화: "밝고 표현이 솔직한 사람, 함께 있으면 분위기가 살아나는 사람",
  토: "듬직하고 믿음직한 사람, 약속을 잘 지키는 사람",
  금: "분명하고 깔끔한 사람, 옳고 그름이 뚜렷한 사람",
  수: "생각이 깊고 다정한 사람, 이야기를 잘 들어 주는 사람",
};
const GROUP_PERSON: Record<TenGodGroup, string> = {
  비겁: "친구처럼 편하게 어울리는 사이로 시작해, 서로를 동등하게 대하는 사람이에요.",
  식상: "함께 웃고 즐기는 시간이 많은 사람, 내 재능을 아껴 주고 표현을 북돋아 주는 사람이에요.",
  재성: "현실 감각이 좋고 생활을 잘 꾸려 가는 사람, 함께 있으면 계획이 든든해지는 사람이에요.",
  관성: "책임감 있고 반듯한 사람, 나를 지켜 주고 바른 방향을 함께 보는 사람이에요.",
  인성: "나를 이해하고 품어 주는 사람, 배울 점이 많고 마음의 쉼터가 되어 주는 사람이에요.",
};

function winterGroupLine(b: LoveBase, group: TenGodGroup): string {
  if (group === "비겁") return "친구와 동료의 기운이 들어와요. 연말 모임과 송년회에서 소개가 이어지기 좋은 때예요.";
  if (group === "식상") return "나를 표현하는 기운이 들어와요. 평소보다 말과 표정이 살아나 호감을 사기 쉬운 때예요.";
  if (group === "재성")
    return b.gender === "male" ? "배우자 별인 재성(財星)이 들어와요. 마음에 둔 사람에게 먼저 다가가기 좋은 때예요." : "현실적인 기운이 들어와요. 약속과 계획이 잘 잡혀 만남이 구체적으로 이어지기 좋은 때예요.";
  if (group === "관성")
    return b.gender === "female" ? "배우자 별인 관성(官星)이 들어와요. 진지한 인연, 오래 갈 사람을 알아보기 좋은 때예요." : "책임과 자리의 기운이 들어와요. 반듯한 모습으로 믿음을 얻는 때라 진지한 만남에 잘 맞아요.";
  return "돌봄과 배움의 기운이 들어와요. 서두르기보다 마음을 열고 천천히 알아 가기 좋은 때예요.";
}

const WINTER_BRANCH: Record<BranchRel, string> = {
  육합: "그리고 12월의 자(子)가 {이름}님의 배우자 자리와 육합(六合)을 이뤄요. 인연의 문이 활짝 열리는 겨울이에요.",
  삼합: "그리고 12월의 자(子)가 {이름}님의 배우자 자리와 삼합(三合)의 짝이에요. 마음이 맞는 사람과 자연스럽게 가까워지는 겨울이에요.",
  같음: "12월의 자(子)가 배우자 자리와 같은 글자라, 마음이 한 사람에게 모이기 쉬운 때예요.",
  무난: "12월의 자(子)는 배우자 자리와 부딪힘 없이 지나가, 마음 편히 사람을 만나기 좋은 때예요.",
  충: "12월의 자(子)가 배우자 자리와 부딪히는(충) 달이라 마음이 들뜨거나 엇갈리기 쉬워요. 서두르지 말고 연락을 한 번 더 이어 가면 오히려 관계가 단단해져요.",
  원진: "12월의 자(子)와 배우자 자리가 원진(怨嗔)이라 작은 오해가 생기기 쉬워요. 마음은 말로 분명히 전하면 잘 지나가요.",
};

/** 달 하나의 인연 기운 점수 (솔로) */
function soloMonthScore(b: LoveBase, ganzhi: string): number {
  const [s, br] = [ganzhi[0], ganzhi[1]];
  let v = 0;
  if (STEM_EL[s] === b.spouseEl) v += 2;
  if (BRANCH_EL[br] === b.spouseEl) v += 1;
  const rel = branchRelation(br, b.dayBranch);
  v += rel === "육합" ? 3 : rel === "삼합" ? 2 : rel === "같음" ? 1 : rel === "충" ? -2 : rel === "원진" ? -1 : 0;
  if (b.yeokmaBranches.includes(br)) v += 1;
  return v;
}

/** 2026년 12월 ~ 2027년 12월 (열세 달) - 연말부터 내년까지의 흐름 */
function flowMonths(): Array<{ y: number; m: number; ganzhi: string }> {
  const m26 = monthPillarsOfYear(2026);
  const m27 = monthPillarsOfYear(2027);
  return [{ y: 2026, m: 12, ganzhi: m26[10].ganzhi }, { y: 2027, m: 1, ganzhi: m26[11].ganzhi }, ...m27.slice(0, 11).map((x, i) => ({ y: 2027, m: i + 2, ganzhi: x.ganzhi }))];
}

function seasonOf(y: number, m: number): string {
  if (y === 2026 || (y === 2027 && m <= 2)) return "이번 겨울";
  if (m >= 3 && m <= 5) return "내년 봄";
  if (m >= 6 && m <= 8) return "내년 여름";
  if (m >= 9 && m <= 11) return "내년 가을";
  return "내년 연말";
}

export interface SoloReading {
  sections: LoveSection[];
  /** 비회원 맛보기: 인연이 오는 길의 첫 부분 */
  preview: { heading: string; body: string };
  lockedHeadings: string[];
}

export function composeSolo(saju: SajuJson, name: string): SoloReading {
  const b = loveBase(saju);
  const fill = (t: string) => t.replace(/\{이름\}/g, name);
  const paths = lovePaths(b);
  const pathBodies = paths.map((k, i) => (i === 0 ? pathText(b, k) : `${i === 1 ? "그다음으로는" : "또"} ${pathText(b, k).replace(/^\{이름\}님 사주에는 |^\{이름\}님은 |^\{이름\}님 사주에서 /, "")}`));

  const person = `{이름}님의 배우자 자리(일지)에는 ${b.dayBranch}(${BRANCH_HJ[b.dayBranch]}), ${ELEMENT_NATURE[b.dayBranchEl]}(${ELEMENT_HANJA[b.dayBranchEl]})의 기운이 앉아 있어요. 그래서 곁에 올 사람은 ${EL_PERSON[b.dayBranchEl]}일 가능성이 커요. 이 자리의 십성은 ${b.dayBranchTenGod}(${b.dayBranchGroup})이라, ${GROUP_PERSON[b.dayBranchGroup]}`;

  const ws = WINTER_MONTH.ganzhi[0];
  const wb = WINTER_MONTH.ganzhi[1];
  const wGroup = TEN_GOD_GROUP[tenGodOf(b.dayStem, ws)];
  const winter = `2026년 12월은 ${WINTER_MONTH.ganzhi}(${STEM_HJ[ws]}${BRANCH_HJ[wb]})월이에요. {이름}님에게는 ${wGroup}의 달이라 ${winterGroupLine(b, wGroup)} ${WINTER_BRANCH[branchRelation(wb, b.dayBranch)]}`;

  const months = flowMonths().map((x) => ({ ...x, score: soloMonthScore(b, x.ganzhi) }));
  const max = Math.max(...months.map((x) => x.score));
  const peaks = [...new Set(months.filter((x) => x.score === max).map((x) => seasonOf(x.y, x.m)))];
  const second = max > 0 ? [...new Set(months.filter((x) => x.score === max - 1).map((x) => seasonOf(x.y, x.m)))].filter((s) => !peaks.includes(s)) : [];
  // 고른 계절은 시간 순서대로 (이번 겨울 → 내년 봄 → … → 내년 연말)
  const order = [...new Set(months.map((x) => seasonOf(x.y, x.m)))];
  const seasons = [...peaks, ...second].slice(0, 2).sort((p, q) => order.indexOf(p) - order.indexOf(q));
  const flow = `연말부터 내년 연말까지 열세 달을 살펴보면, {이름}님의 인연 기운은 ${seasons.join("과 ")} 무렵에 가장 강해져요. 배우자 별의 기운이 들어오거나 배우자 자리와 어울리는 달이 그때 모여 있어요. 그 사이의 달에도 마음을 열어 두면, 기운이 강해지는 때에 인연이 자연스럽게 다가와요.`;

  const sections: LoveSection[] = [
    { key: "path", heading: "인연이 오는 길", body: fill(pathBodies.join(" ")) },
    { key: "person", heading: "다가오는 사람의 모습", body: fill(person) },
    { key: "winter", heading: "이번 겨울의 인연 기운", body: fill(winter) },
    { key: "flow", heading: "연말부터 내년까지의 흐름", body: fill(flow) },
  ];
  return {
    sections,
    preview: { heading: "인연이 오는 길", body: fill(pathText(b, paths[0])) },
    lockedHeadings: ["인연이 오는 길 (이어서)", "다가오는 사람의 모습", "이번 겨울의 인연 기운", "연말부터 내년까지의 흐름"],
  };
}

// ───────────────────────── 커플 길 · 짧은 궁합 ─────────────────────────

const ATTRACTION: Record<ReturnType<typeof stemRelation>, string> = {
  합: "두 사람의 본바탕이 천간합(天干合)을 이뤄, 처음부터 서로 끌리는 힘이 아주 강한 짝이에요.",
  생: "{A}님의 바탕이 {B}님을 살려 주는 짝이라, {B}님이 {A}님 곁에서 편안함을 느껴요.",
  받음: "{B}님의 바탕이 {A}님을 살려 주는 짝이라, {A}님이 {B}님 곁에서 힘을 얻어요.",
  같음: "두 사람의 바탕이 같은 기운이라, 말하지 않아도 통하는 친구 같은 끌림이 있어요.",
  극: "서로를 단단하게 다잡는 짝이라, 처음부터 묘하게 마음이 쓰이는 강한 끌림이 있어요.",
  눌림: "서로를 단단하게 다잡는 짝이라, 처음부터 묘하게 마음이 쓰이는 강한 끌림이 있어요.",
};
const GROUP_SHORT: Record<TenGodGroup, string> = {
  비겁: "곁의 사람과 어울리는",
  식상: "마음을 표현하는",
  재성: "함께 계획을 세우는",
  관성: "책임감이 커지는",
  인성: "서로를 돌보는",
};
const isHap = (r: BranchRel) => r === "육합" || r === "삼합";

export interface CoupleReading {
  attraction: string;
  sections: LoveSection[];
}

export function composeCouple(aName: string, aSaju: SajuJson, bName: string, bSaju: SajuJson): CoupleReading {
  const m = coupleMatch(aName, aSaju, bName, bSaju);
  const A = loveBase(aSaju);
  const B = loveBase(bSaju);
  const fill = (t: string) => nameFill(t, aName, bName);
  const stemItem = m.items.find((i) => i.key === "stem")!;
  const branchItem = m.items.find((i) => i.key === "dayBranch")!;

  const why = `{A}님의 일간은 ${m.a.dayLabel}, {B}님의 일간은 ${m.b.dayLabel}이에요. ${stemItem.text} ${branchItem.text}`;

  const ws = WINTER_MONTH.ganzhi[0];
  const wb = WINTER_MONTH.ganzhi[1];
  const ga = TEN_GOD_GROUP[tenGodOf(A.dayStem, ws)];
  const gb = TEN_GOD_GROUP[tenGodOf(B.dayStem, ws)];
  const ra = branchRelation(wb, A.dayBranch);
  const rb = branchRelation(wb, B.dayBranch);
  const lines = [`2026년 12월 ${WINTER_MONTH.ganzhi}(${STEM_HJ[ws]}${BRANCH_HJ[wb]})월에는 {A}님에게 ${GROUP_SHORT[ga]} ${ga} 기운, {B}님에게 ${GROUP_SHORT[gb]} ${gb} 기운이 들어와요.`];
  if (isHap(ra) && isHap(rb)) lines.push("12월의 자(子)가 두 사람의 배우자 자리와 모두 잘 어울려, 함께 보내는 크리스마스가 두 사람을 한층 가깝게 해 줘요.");
  else if (isHap(ra) || isHap(rb)) {
    const x = isHap(ra) ? "{A}" : "{B}";
    const y = isHap(ra) ? "{B}" : "{A}";
    lines.push(`12월의 자(子)가 ${x}님의 배우자 자리와 합을 이뤄, ${x}님 쪽에서 마음이 먼저 열리는 겨울이에요. ${y}님이 그 마음을 반갑게 받아 주면 더 가까워져요.`);
  }
  if (ra === "충" || rb === "충") {
    const x = ra === "충" && rb === "충" ? "두 사람" : ra === "충" ? "{A}님" : "{B}님";
    lines.push(`12월의 자(子)가 ${x}의 배우자 자리와 부딪히는(충) 달이라, 바쁜 연말에 서운함이 생기기 쉬워요. 크리스마스 약속을 미리 정해 두고, 서운한 말은 하루 쉬었다가 꺼내면 잘 지나가요.`);
  } else if (!isHap(ra) && !isHap(rb)) lines.push("12월의 기운은 두 사람의 배우자 자리와 부딪힘 없이 지나가요. 편안하게 함께하는 시간을 늘리기 좋은 겨울이에요.");

  return {
    attraction: fill(ATTRACTION[stemRelation(A.dayStem, B.dayStem)]),
    sections: [
      { key: "why", heading: "서로 끌린 이유", body: fill(why) },
      { key: "winter", heading: "이번 겨울 두 사람의 기운", body: fill(lines.join(" ")) },
    ],
  };
}

// ───────────────────────── 2027 연애 달력 (계산) ─────────────────────────

/** 2027년 1~12월 월주: 1월은 2026년 표의 축월(소한~), 2~12월은 2027년 표 */
export function months2027(): Array<{ month: number; ganzhi: string }> {
  const m26 = monthPillarsOfYear(2026);
  const m27 = monthPillarsOfYear(2027);
  return [{ month: 1, ganzhi: m26[11].ganzhi }, ...m27.slice(0, 11).map((x, i) => ({ month: i + 2, ganzhi: x.ganzhi }))];
}

/** 그 달 천간의 십성으로 본 "어디서 만날 가능성" */
function placeOf(b: LoveBase, ganzhi: string): string {
  if (b.yeokmaBranches.includes(ganzhi[1])) return "여행지·낯선 곳";
  const g = TEN_GOD_GROUP[tenGodOf(b.dayStem, ganzhi[0])];
  if (g === "비겁") return "친구·지인 모임";
  if (g === "식상") return "취미 모임·동호회";
  if (g === "재성") return b.gender === "male" ? "직장·일로 만나는 자리" : "생활 속 약속 자리";
  if (g === "관성") return b.gender === "female" ? "직장·일로 만나는 자리" : "공식 행사·업무 자리";
  return "배움의 자리·어른의 소개";
}

export interface SoloCalRow {
  month: number;
  ganzhi: string;
  score: number;
  strong: boolean;
  place: string;
  why: string;
}

export function soloCalendar(saju: SajuJson): SoloCalRow[] {
  const b = loveBase(saju);
  const rows = months2027().map((x) => {
    const rel = branchRelation(x.ganzhi[1], b.dayBranch);
    const why = [
      STEM_EL[x.ganzhi[0]] === b.spouseEl ? `배우자 별(${b.spouseGroup})이 천간에 들어옴` : "",
      BRANCH_EL[x.ganzhi[1]] === b.spouseEl ? `배우자 별 오행(${b.spouseEl})이 지지에 들어옴` : "",
      rel !== "무난" ? `월지 ${x.ganzhi[1]}·일지 ${b.dayBranch} ${rel}` : "",
      b.yeokmaBranches.includes(x.ganzhi[1]) ? "역마의 달" : "",
    ]
      .filter(Boolean)
      .join(", ");
    return { month: x.month, ganzhi: x.ganzhi, score: soloMonthScore(b, x.ganzhi), place: placeOf(b, x.ganzhi), why: why || "특별한 부딪힘 없이 고른 달" };
  });
  const top = [...rows].sort((p, q) => q.score - p.score || p.month - q.month).filter((r) => r.score >= 2).slice(0, 4);
  const pick = top.length ? top : [...rows].sort((p, q) => q.score - p.score || p.month - q.month).slice(0, 2);
  return rows.map((r) => ({ ...r, strong: pick.some((p) => p.month === r.month) }));
}

export interface CoupleCalRow {
  month: number;
  ganzhi: string;
  good: boolean;
  care: boolean;
  why: string;
}

export function coupleCalendar(aSaju: SajuJson, bSaju: SajuJson): CoupleCalRow[] {
  const A = loveBase(aSaju);
  const B = loveBase(bSaju);
  return months2027().map((x) => {
    const ra = branchRelation(x.ganzhi[1], A.dayBranch);
    const rb = branchRelation(x.ganzhi[1], B.dayBranch);
    const care = ra === "충" || rb === "충" || ra === "원진" || rb === "원진";
    const spouseIn = STEM_EL[x.ganzhi[0]] === A.spouseEl || STEM_EL[x.ganzhi[0]] === B.spouseEl;
    const good = !care && (isHap(ra) || isHap(rb) || spouseIn);
    const why = [`월지 ${x.ganzhi[1]}·{A}님 일지 ${A.dayBranch} ${ra}`, `월지 ${x.ganzhi[1]}·{B}님 일지 ${B.dayBranch} ${rb}`, spouseIn ? "배우자 별의 기운이 들어옴" : ""].filter(Boolean).join(", ");
    return { month: x.month, ganzhi: x.ganzhi, good, care, why };
  });
}
