import type { SajuJson } from "saju-engine";
import type { ElementKo } from "@/lib/pillarView";
import { ELEMENTS, ELEMENT_HANJA, ELEMENT_NATURE } from "@/lib/manseView";
import { neededEnergy } from "@/lib/neededEnergy";
import { elementRelation } from "@/lib/nameReading";

/**
 * 연인 궁합 (2026-10-14 수정안 10, 19,900냥) - 엔진 계산 부분 (AI 없음).
 * 무료 미리보기(점수·도표·항목별 한 줄)와 유료 AI 풀이의 "근거 사실"을 함께 만든다.
 *   ① 일간(나 자신)끼리: 천간합 · 상생 · 상극
 *   ② 일지(배우자 자리)끼리: 육합 · 삼합 · 충 · 원진
 *   ③ 띠(년지)끼리: 같은 표
 *   ④ 오행 보완: 서로의 아쉬운 기운을 상대가 넉넉히 가졌는지
 * 말투 원칙: 칭찬 먼저, 아쉬운 점은 "이렇게 하면 좋아요"로. 겁주지 않는다.
 */

const STEM_EL: Record<string, ElementKo> = { 갑: "목", 을: "목", 병: "화", 정: "화", 무: "토", 기: "토", 경: "금", 신: "금", 임: "수", 계: "수" };
const STEM_HJ: Record<string, string> = { 갑: "甲", 을: "乙", 병: "丙", 정: "丁", 무: "戊", 기: "己", 경: "庚", 신: "辛", 임: "壬", 계: "癸" };
const BRANCH_HJ: Record<string, string> = { 자: "子", 축: "丑", 인: "寅", 묘: "卯", 진: "辰", 사: "巳", 오: "午", 미: "未", 신: "申", 유: "酉", 술: "戌", 해: "亥" };
const ANIMAL: Record<string, string> = { 자: "쥐", 축: "소", 인: "호랑이", 묘: "토끼", 진: "용", 사: "뱀", 오: "말", 미: "양", 신: "원숭이", 유: "닭", 술: "개", 해: "돼지" };

const STEM_HAP = ["갑기", "을경", "병신", "정임", "무계"];
const YUKHAP = ["자축", "인해", "묘술", "진유", "사신", "오미"];
const CHUNG = ["자오", "축미", "인신", "묘유", "진술", "사해"];
const WONJIN = ["자미", "축오", "인유", "묘신", "진해", "사술"];
const SAMHAP = [["신", "자", "진"], ["해", "묘", "미"], ["인", "오", "술"], ["사", "유", "축"]];

const pair = (list: string[], a: string, b: string) => list.includes(a + b) || list.includes(b + a);

export type BranchRel = "육합" | "삼합" | "같음" | "충" | "원진" | "무난";
export function branchRelation(a: string, b: string): BranchRel {
  if (a === b) return "같음";
  if (pair(YUKHAP, a, b)) return "육합";
  if (SAMHAP.some((g) => g.includes(a) && g.includes(b))) return "삼합";
  if (pair(CHUNG, a, b)) return "충";
  if (pair(WONJIN, a, b)) return "원진";
  return "무난";
}

export type StemRel = "합" | "생" | "받음" | "같음" | "극" | "눌림";
export function stemRelation(a: string, b: string): StemRel {
  if (pair(STEM_HAP, a, b)) return "합";
  return elementRelation(STEM_EL[a], STEM_EL[b]);
}

export interface CoupleSide {
  name: string;
  dayStem: string;
  dayBranch: string;
  yearBranch: string;
  dayLabel: string;
  animal: string;
  counts: Record<ElementKo, number>;
  percents: Record<ElementKo, number>;
  needed: ElementKo[];
  strongest: ElementKo;
}

export interface CoupleMatch {
  a: CoupleSide;
  b: CoupleSide;
  score: number;
  grade: "천생연분" | "좋은 인연" | "서로 맞춰 가는 인연" | "노력이 빛나는 인연";
  items: Array<{ key: string; title: string; mark: string; good: boolean; points: number; max: number; text: string }>;
  fills: { aFromB: ElementKo[]; bFromA: ElementKo[] };
  summary: string;
  /** AI에 넘길 근거 (이름 대신 {A}·{B}) */
  facts: string;
}

function side(name: string, saju: SajuJson): CoupleSide {
  const d = saju.pillars.day;
  const y = saju.pillars.year;
  const counts = saju.elements.summary.counts as Record<ElementKo, number>;
  const total = ELEMENTS.reduce((s, e) => s + counts[e], 0) || 1;
  const percents = Object.fromEntries(ELEMENTS.map((e) => [e, Math.round((counts[e] / total) * 100)])) as Record<ElementKo, number>;
  let strongest: ElementKo = ELEMENTS[0];
  for (const e of ELEMENTS) if (counts[e] > counts[strongest]) strongest = e;
  return {
    name,
    dayStem: d.heavenlyStem as string,
    dayBranch: d.earthlyBranch as string,
    yearBranch: y.earthlyBranch as string,
    dayLabel: `${d.heavenlyStem}${STEM_EL[d.heavenlyStem as string] ?? ""}(${STEM_HJ[d.heavenlyStem as string]}${ELEMENT_HANJA[STEM_EL[d.heavenlyStem as string]]})`,
    animal: ANIMAL[y.earthlyBranch as string] ?? "",
    counts,
    percents,
    needed: neededEnergy(saju).elements,
    strongest,
  };
}

const STEM_TEXT: Record<StemRel, { mark: string; good: boolean; pts: number; text: string }> = {
  합: { mark: "合", good: true, pts: 30, text: "두 사람의 본바탕이 천간합(天干合)을 이뤄요. 서로 끌리는 힘이 가장 강한 짝이라, 처음 만나도 오래 안 사람처럼 편안해요." },
  생: { mark: "→", good: true, pts: 24, text: "{A}님의 바탕이 {B}님을 살려 주는 짝이에요. {A}님이 아낌없이 챙기고, {B}님은 그 마음 안에서 쑥쑥 자라요." },
  받음: { mark: "←", good: true, pts: 24, text: "{B}님의 바탕이 {A}님을 살려 주는 짝이에요. {B}님 곁에 있으면 {A}님이 든든하게 힘을 얻어요." },
  같음: { mark: "=", good: true, pts: 20, text: "두 사람의 바탕이 같은 기운이에요. 말하지 않아도 통하는 친구 같은 연인이지만, 고집이 부딪힐 땐 한 사람이 먼저 웃어 주면 좋아요." },
  극: { mark: "⚡", good: false, pts: 12, text: "{A}님의 바탕이 {B}님을 다잡는 짝이에요. 서로를 단단하게 만들지만, {A}님이 말을 한 번 더 부드럽게 고르면 훨씬 좋아요." },
  눌림: { mark: "⚡", good: false, pts: 12, text: "{B}님의 바탕이 {A}님을 다잡는 짝이에요. 끌림이 강한 대신 기 싸움이 생기기 쉬우니, 서로의 방식을 존중해 주면 좋아요." },
};
const BRANCH_TEXT: Record<BranchRel, { good: boolean; pts: number; text: (who: string) => string }> = {
  육합: { good: true, pts: 25, text: (w) => `${w}가 육합(六合)이에요. 서로의 빈자리를 꼭 맞게 채워 주는, 가장 잘 맞는 짝이에요.` },
  삼합: { good: true, pts: 22, text: (w) => `${w}가 삼합(三合)의 짝이에요. 함께 같은 목표를 향해 갈 때 힘이 몇 배로 커져요.` },
  같음: { good: true, pts: 16, text: (w) => `${w}가 같아요. 생활 방식과 리듬이 닮아 편안하지만, 가끔은 서로 새로운 바람을 불어넣어 주면 좋아요.` },
  무난: { good: true, pts: 15, text: (w) => `${w}는 서로 크게 부딪히지 않는 무난한 사이예요.` },
  충: { good: false, pts: 8, text: (w) => `${w}가 충(沖)이에요. 서로 다른 점이 끌림이 되기도 하지만, 다툴 때는 하루 쉬었다가 이야기하는 습관이 큰 힘이 돼요.` },
  원진: { good: false, pts: 8, text: (w) => `${w}가 원진(怨嗔)이에요. 작은 서운함이 쌓이기 쉬우니, 고마운 마음은 그때그때 말로 전해 주면 좋아요.` },
};

export function coupleMatch(aName: string, aSaju: SajuJson, bName: string, bSaju: SajuJson): CoupleMatch {
  const a = side(aName, aSaju);
  const b = side(bName, bSaju);
  const fill = (x: CoupleSide, y: CoupleSide) => x.needed.filter((e) => y.percents[e] >= 20 || y.strongest === e);
  const aFromB = fill(a, b);
  const bFromA = fill(b, a);

  const sr = stemRelation(a.dayStem, b.dayStem);
  const st = STEM_TEXT[sr];
  const dr = branchRelation(a.dayBranch, b.dayBranch);
  const yr = branchRelation(a.yearBranch, b.yearBranch);
  const fillPts = Math.min(30, (aFromB.length + bFromA.length) * 10 + (aFromB.length && bFromA.length ? 10 : 0));

  const items: CoupleMatch["items"] = [
    {
      key: "stem",
      title: "본바탕 (일간)",
      mark: st.mark,
      good: st.good,
      points: st.pts,
      max: 30,
      text: st.text,
    },
    {
      key: "dayBranch",
      title: "배우자 자리 (일지)",
      mark: `${BRANCH_HJ[a.dayBranch]}·${BRANCH_HJ[b.dayBranch]}`,
      good: BRANCH_TEXT[dr].good,
      points: BRANCH_TEXT[dr].pts,
      max: 25,
      text: BRANCH_TEXT[dr].text("두 사람의 배우자 자리(일지)"),
    },
    {
      key: "yearBranch",
      title: "띠 궁합",
      mark: `${a.animal}·${b.animal}`,
      good: BRANCH_TEXT[yr].good,
      points: Math.round(BRANCH_TEXT[yr].pts * 0.6),
      max: 15,
      text: BRANCH_TEXT[yr].text(`${a.animal}띠와 ${b.animal}띠`),
    },
    {
      key: "fill",
      title: "서로 채워 주는 기운",
      mark: "⇄",
      good: fillPts >= 20,
      points: fillPts,
      max: 30,
      text:
        aFromB.length || bFromA.length
          ? [
              aFromB.length ? `{A}님에게 아쉬운 ${aFromB.map((e) => `${ELEMENT_NATURE[e]}(${ELEMENT_HANJA[e]})`).join("·")}의 기운을 {B}님이 넉넉히 가지고 있어요.` : "",
              bFromA.length ? `{B}님에게 아쉬운 ${bFromA.map((e) => `${ELEMENT_NATURE[e]}(${ELEMENT_HANJA[e]})`).join("·")}의 기운을 {A}님이 채워 줘요.` : "",
              aFromB.length && bFromA.length ? "서로가 서로의 빈자리가 되어 주는, 보기 드문 짝이에요." : "",
            ]
              .filter(Boolean)
              .join(" ")
          : "두 사람 모두 아쉬운 기운이 비슷해서, 함께 같은 색·같은 장소로 그 기운을 채우면 더 가까워져요.",
    },
  ];
  const got = items.reduce((s, i) => s + i.points, 0);
  const max = items.reduce((s, i) => s + i.max, 0);
  const score = Math.max(55, Math.min(98, Math.round((got / max) * 100) + 12));
  const grade: CoupleMatch["grade"] = score >= 88 ? "천생연분" : score >= 78 ? "좋은 인연" : score >= 68 ? "서로 맞춰 가는 인연" : "노력이 빛나는 인연";
  const goods = items.filter((i) => i.good).map((i) => i.title);
  const summary = `${goods.length ? `${goods.join(", ")}에서 특히 잘 맞아요. ` : ""}${items.some((i) => !i.good) ? "조금 부딪히는 자리도 있지만, 그 차이가 서로를 키워 주는 힘이 될 수 있어요." : "어느 한 곳 크게 부딪히는 데가 없는 짝이에요."}`;

  const facts = [
    `{A}: 일간 ${a.dayLabel}, 일지 ${a.dayBranch}(${BRANCH_HJ[a.dayBranch]}), ${a.animal}띠, 아쉬운 기운 ${a.needed.join("·")}, 가장 강한 기운 ${a.strongest}`,
    `{B}: 일간 ${b.dayLabel}, 일지 ${b.dayBranch}(${BRANCH_HJ[b.dayBranch]}), ${b.animal}띠, 아쉬운 기운 ${b.needed.join("·")}, 가장 강한 기운 ${b.strongest}`,
    `일간 관계: ${sr} / 일지 관계: ${dr} / 띠 관계: ${yr}`,
    `서로 채움: {A}←{B} ${aFromB.join("·") || "없음"}, {B}←{A} ${bFromA.join("·") || "없음"}`,
    `궁합 점수 ${score}점 (${grade})`,
  ].join("\n");

  return { a, b, score, grade, items, fills: { aFromB, bFromA }, summary, facts };
}

/** {A}·{B}를 실제 이름으로 */
export function nameFill(text: string, a: string, b: string): string {
  return text.replace(/\{A\}/g, a).replace(/\{B\}/g, b);
}
