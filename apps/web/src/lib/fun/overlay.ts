import type { SajuJson } from "saju-engine";
import type { ElementKo } from "@/lib/pillarView";
import { STEM_HANJA } from "@/lib/pillarView";
import { ELEMENT_HANJA, ELEMENT_NATURE } from "@/lib/manseView";
import { DAY_MASTER } from "@/lib/basic/common";
import { neededEnergy, type NeededEnergy } from "@/lib/neededEnergy";
import { TOPICS } from "@/lib/topics";
import { FILL_FLOWER } from "./flower";
import { FUN_META, type FunKind, type FunResult } from "./types";

/**
 * 사주와 겹쳐 보기 (2026-10-26 무료 묶음, AI 없음).
 * 엔진이 낸 일간(日干)과 부족한 기운(neededEnergy)만 쓴다 - 새로 계산하는 사주 값은 없다.
 * 무료 결과의 오행과 일간 오행의 관계(같음·상생·상극)로 "겉과 속" 한 문단을 고른다.
 * 원칙: 무료는 "무엇이 보이는지"까지, "그래서 어떻게"는 이어지는 운세 풀이로 (유샘 무료/유료 구분 원칙).
 */

const GENERATES: Record<ElementKo, ElementKo> = { 목: "화", 화: "토", 토: "금", 금: "수", 수: "목" };
const CONTROLS: Record<ElementKo, ElementKo> = { 목: "토", 토: "수", 수: "화", 화: "금", 금: "목" };

export type ElementRelation = "same" | "funFeedsDay" | "dayFeedsFun" | "funTamesDay" | "dayTamesFun";

export function relationOfElements(fun: ElementKo, day: ElementKo): ElementRelation {
  if (fun === day) return "same";
  if (GENERATES[fun] === day) return "funFeedsDay";
  if (GENERATES[day] === fun) return "dayFeedsFun";
  if (CONTROLS[fun] === day) return "funTamesDay";
  return "dayTamesFun";
}

const RELATION_TEXT: Record<ElementRelation, { head: string; body: string }> = {
  same: {
    head: "겉과 속이 같은 결",
    body: "드러나는 나와 타고난 내가 한 방향을 가리켜요. 마음먹은 일에 힘이 실리는 대신, 같은 기운이 겹쳐 한쪽으로 치우치기 쉬운 지점이 하나 있어요.",
  },
  funFeedsDay: {
    head: "겉이 속을 길러 주는 사이",
    body: "드러나는 기질이 타고난 나를 든든하게 받쳐 주는 관계예요. 이 힘을 잘 쓰면 크게 자라지만, 기대는 쪽이 하나로만 쏠리면 흔들리는 때가 있어요.",
  },
  dayFeedsFun: {
    head: "속이 겉으로 힘을 내어 주는 사이",
    body: "타고난 내가 겉으로 드러나는 모습에 힘을 나눠 주는 관계예요. 남에게 보이는 나를 위해 쓰는 기운이 많아서, 모르는 사이 지치는 지점이 있어요.",
  },
  funTamesDay: {
    head: "겉이 속을 다듬는 사이",
    body: "드러나는 기질이 타고난 나를 단단히 다듬어 주는 관계예요. 스스로에게 엄격해지는 만큼 성장도 빠르지만, 마음이 조여 드는 때가 있어요.",
  },
  dayTamesFun: {
    head: "속이 겉을 이끄는 사이",
    body: "타고난 내가 겉으로 드러나는 모습을 이끄는 관계예요. 주도권을 쥐고 가는 힘이 있지만, 그만큼 혼자 짊어지는 것이 생기기 쉬워요.",
  },
};

export interface OverlayView {
  dayStem: string;
  dayStemHanja: string;
  dayElement: ElementKo;
  /** "큰 나무" 같은 일간 그림 */
  dayImage: string;
  /** 일간 한 문단 ("당신은 갑목(甲木)…") */
  dayCore: string;
  /** 무료 결과에 오행이 있을 때만 */
  relation?: { kind: ElementRelation; head: string; body: string };
  need: NeededEnergy;
  /** 부족한 기운 한 줄 */
  needLine: string;
  /** 탄생화에서만: 나를 채우는 꽃 */
  fillFlowers?: Array<{ element: ElementKo; name: string; why: string; tip: string }>;
  next: { topic: string; title: string; href: string; line: string };
}

function elName(el: ElementKo): string {
  return `${ELEMENT_NATURE[el]}(${ELEMENT_HANJA[el]})`;
}

export function buildOverlay(kind: FunKind, saju: SajuJson, fun: FunResult): OverlayView {
  const stem = saju.pillars.day.heavenlyStem;
  const dayElement = (saju.elements.heavenlyStems as Record<string, ElementKo>).day;
  const dm = DAY_MASTER[stem];
  const dayCore = dm ? dm.core.replace(/\{이름\}님은/g, "당신은").replace(/\{이름\}님/g, "당신").replace(/\{이름\}/g, "당신") : "";
  const need = neededEnergy(saju);
  const needNames = need.elements.map(elName).join("·");
  const needLine =
    need.reason === "lacking"
      ? `그리고 당신의 사주에는 ${needNames}의 기운이 비어 있어요. 이 하나가 채워지면 흐름이 한결 고르게 돌아가요.`
      : `그리고 당신의 사주에서는 ${needNames}의 기운이 가장 옅어요. 이 하나를 곁에 두면 흐름이 한결 고르게 돌아가요.`;

  let relation: OverlayView["relation"];
  if (fun.element) {
    const r = relationOfElements(fun.element, dayElement);
    relation = {
      kind: r,
      head: `${fun.short}의 ${elName(fun.element)} × 일간 ${elName(dayElement)} — ${RELATION_TEXT[r].head}`,
      body: RELATION_TEXT[r].body,
    };
  }

  const topic = FUN_META[kind].topic;
  const t = TOPICS[topic];
  return {
    dayStem: stem,
    dayStemHanja: STEM_HANJA[stem] ?? "",
    dayElement,
    dayImage: dm?.image ?? "",
    dayCore,
    relation,
    need,
    needLine,
    fillFlowers: kind === "flower" ? need.elements.map((el) => ({ element: el, ...FILL_FLOWER[el] })) : undefined,
    next: {
      topic,
      title: t.title,
      href: `/go?topic=${topic}`,
      line: `${relation ? "이 지점을" : "타고난 뿌리를"} 어떻게 살리면 좋은지는 「${t.title}」 풀이에서 자세히 볼 수 있어요.`,
    },
  };
}
