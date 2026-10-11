import type { SajuJson } from "saju-engine";
import { BRANCH_HANJA, STEM_HANJA, buildPillarColumns, type ElementKo } from "@/lib/pillarView";
import { ELEMENT_HANJA, ELEMENT_NATURE } from "@/lib/manseView";
import { sajuFacts, TEN_GOD_GROUP, type SajuFacts } from "@/lib/sajuFacts";
import { STEM_ELEMENT } from "saju-engine/dist/src/rules/fiveElementTables";
import { TOPICS, isTopicKey, type AnyTopicKey, type TopicKey } from "@/lib/topics";
import { monthPillarsOfYear } from "@/lib/monthPillars";
import type { TenGodGroup } from "@/lib/journey";
import { DAY_MASTER, FILL, GROUP_LABEL, LACK_CORE, PERSON_FILL, POS_MEANING, SEUN_LINE } from "./common";
import { SECOND_GROUP_LINE, STAGE_LINE, TOPIC_POWER_GROUP, TOPIC_WORD, headings } from "./extra";
import { TOPICS_A } from "./topicsA";
import { TOPICS_B } from "./topicsB";
import { TOPICS_C } from "./topicsC";
import type { TopicLib } from "./types";

/**
 * 990냥 "운세 보기" - AI 없이 엔진 값으로 문장 창고에서 골라 엮는다 (2026-10-10 수정안 33·34).
 *
 *   ① 타고난 바탕 (일간 + 이 운세의 결 + 일지 12운성)
 *   ② 이 운세를 움직이는 기운 (가장 두드러진 십신 + 두 번째 기운)
 *   ③ 지금의 흐름 (지금 대운 + 올해 세운 + 이 운세에 힘이 실리는 대운)
 *   ④ 눈여겨볼 점 (원국의 합·충)
 *   ⑤ 꼭 채워야 할 하나 (부족한 오행 → 채우는 색·방위·숫자·동물·식물·사물 + 곁에 두면 좋은 사람) ← 결론, 가장 길게
 *
 * 같은 사주·같은 운세면 언제나 같은 글이 나온다 (근거가 엔진 값뿐이라 틀릴 수가 없다).
 */

export const TOPIC_LIB: Record<TopicKey, TopicLib> = { ...TOPICS_A, ...TOPICS_B, ...TOPICS_C };

export interface FillCard {
  element: ElementKo;
  hanja: string;
  colors: string;
  direction: string;
  numbers: string;
  animal: string;
  plant: string;
  object: string;
  habit: string;
}

export interface BasicReadingV2 {
  v: 2;
  topic: TopicKey;
  title: string;
  model: "engine";
  /** 맨 위 한 줄 요약 */
  summary: string;
  keywords: string[];
  sections: Array<{ heading: string; body: string }>;
  /** 결론: 꼭 채워야 할 하나 */
  lack: { heading: string; body: string; fill: FillCard; person: string };
  /** 화면 그림용 (모두 엔진 값) */
  chart: {
    pillars: Array<{ label: string; stem: string; branch: string; stemEl: ElementKo | null; branchEl: ElementKo | null; highlight: boolean; empty: boolean }>;
    highlightNote: string | null;
    daeun: Array<{ age: number; hanja: string; group: TenGodGroup; current: boolean; power: boolean }>;
    elements: Array<{ element: ElementKo; percent: number; needed: boolean }>;
  };
  /** 깊게 보기에서 다룰 내용 (흐리게 미리 보여 줌) */
  deeper: string[];
  /** 글자 전체 (예전 화면·검색·글자 수 확인용) */
  body: string;
}

const fill = (s: string, name: string) => s.replace(/\{이름\}/g, name);

function firstSentence(t: string): string {
  const m = t.match(/^.*?[요다]\./);
  return m ? m[0] : t;
}


/** 이 운세에서 원국의 어느 자리를 짚어 줄지 */
function highlightFor(topic: TopicKey, cols: ReturnType<typeof buildPillarColumns>): { keys: Set<string>; note: string | null } {
  const keys = new Set<string>();
  const byGroup = (g: TenGodGroup, note: string) => {
    for (const c of cols) {
      if (c.empty) continue;
      if (c.stem && c.stem.tenGod in TEN_GOD_GROUP && TEN_GOD_GROUP[c.stem.tenGod as keyof typeof TEN_GOD_GROUP] === g) keys.add(`${c.key}:stem`);
      if (c.branch && c.branch.tenGod in TEN_GOD_GROUP && TEN_GOD_GROUP[c.branch.tenGod as keyof typeof TEN_GOD_GROUP] === g) keys.add(`${c.key}:branch`);
    }
    return { keys, note: keys.size ? note : null };
  };
  switch (topic) {
    case "love":
    case "marriage":
      keys.add("day:branch");
      return { keys, note: "금색 칸이 배우자 자리(일지)예요" };
    case "family":
      keys.add("hour:branch");
      keys.add("hour:stem");
      return { keys, note: "금색 칸이 자녀 자리(시주)예요" };
    case "money":
    case "business":
      return byGroup("재성", "금색 칸이 재물의 글자(재성)예요");
    case "job":
      return byGroup("식상", "금색 칸이 재능의 글자(식상)예요");
    case "promotion":
      return byGroup("관성", "금색 칸이 명예의 글자(관성)예요");
    case "relationship":
      return byGroup("비겁", "금색 칸이 사람의 글자(비겁)예요");
    case "health":
      return { keys, note: null };
    default:
      keys.add("day:stem");
      return { keys, note: "금색 칸이 {이름}님 자신(일간)이에요" };
  }
}

function relationsParagraph(f: SajuFacts, topic: TopicKey): string {
  const parts: string[] = [];
  const POS: Record<string, string> = { 년: "year", 월: "month", 일: "day", 시: "hour" };
  const meanings = (where: string) =>
    where
      .replace("주", "")
      .split("·")
      .map((w) => POS_MEANING[POS[w]] ?? w);
  const seen = new Set<string>();
  const combos = f.relations.filter((r) => r.kind === "합" && !seen.has(r.label + r.chars) && seen.add(r.label + r.chars)).slice(0, 2);
  const clashes = f.relations.filter((r) => r.kind === "충").slice(0, 1);
  const others = f.relations.filter((r) => r.kind === "형" || r.kind === "파" || r.kind === "해").slice(0, 1);
  combos.forEach((c, i) => {
    const where = f.relations.filter((r) => r.label === c.label && r.chars === c.chars).flatMap((r) => meanings(r.where));
    parts.push(
      i === 0
        ? `원국에서 ${c.chars} 두 글자가 ${c.label}으로 묶여 있어요(${[...new Set(where)].join(" · ")}). 서로 끌어당기고 돕는 인연이라, ${TOPIC_WORD[topic]}에서도 사람과 일이 엮여 힘이 되는 경우가 많아요.`
        : `${c.chars}도 ${c.label}으로 손을 잡고 있어요(${[...new Set(where)].join(" · ")}). 안팎으로 도와주는 힘이 겹겹이 있는 사주예요.`
    );
  });
  for (const c of clashes) {
    const [a, b] = meanings(c.where);
    parts.push(`또 ${c.chars} 두 글자가 서로 부딪치는 충(沖)이 있어요(${[a, b].filter(Boolean).join(" · ")}). 충은 나쁜 것이 아니라 '움직임'이에요. 변화가 잦은 대신, 멈춰 있지 않고 길을 바꿔 새 기회를 여는 힘이 돼요. 다만 마음이 급할 때 말과 결정을 한 번 더 고르면 좋아요.`);
  }
  for (const c of others) {
    parts.push(`${c.chars} 사이에 ${c.label}의 기운도 보여요. 가까운 사이일수록 작은 서운함이 쌓이지 않게 그때그때 풀어 두면 좋아요.`);
  }
  if (parts.length === 0) {
    parts.push("원국에 서로 부딪치거나 묶이는 글자가 두드러지지 않아요. 큰 굴곡보다 제 속도로 꾸준히 가는 사주예요. 그만큼 스스로 움직이지 않으면 변화도 더디게 오니, 필요할 때는 먼저 계기를 만들어 보세요.");
  }
  return parts.join(" ");
}

/** 부족한 기운이 올해·지금 대운에 들어오는지 - 채우기 좋은 때를 짚어 준다 */
function timingForNeed(f: SajuFacts, need: ElementKo): string {
  const seunEl = STEM_ELEMENT[f.seun.ganzhi.charAt(0)] as ElementKo | undefined;
  const daeunEl = f.currentDaeun ? (STEM_ELEMENT[f.currentDaeun.ganzhi.charAt(0)] as ElementKo | undefined) : undefined;
  if (seunEl === need) return `마침 ${f.seun.year}년은 ${need}의 기운이 들어오는 해라, 이 빈자리를 채우기 좋은 때예요.`;
  if (daeunEl === need) return `마침 지금 대운에 ${need}의 기운이 들어와 있어, 이 빈자리를 채우기 좋은 10년이에요.`;
  return `올해와 지금 대운에서는 ${need}의 기운이 저절로 들어오지 않아요. 그래서 더더욱 스스로 곁에 두고 채워 주는 것이 중요해요.`;
}

export function composeBasic(saju: SajuJson, nickname: string, topic: TopicKey, today?: string): BasicReadingV2 {
  const f = sajuFacts(saju, today);
  const lib = TOPIC_LIB[topic];
  const dm = DAY_MASTER[f.dayStem];
  const [h1, h2, h3, h4, h5] = headings(topic);
  const second = f.groups[1]?.group;
  const strongPct = f.groups[0].percent;

  // ① 타고난 바탕
  const s1 = [dm.core, lib.lens[f.dayElement], f.dayBranchStage && STAGE_LINE[f.dayBranchStage] ? STAGE_LINE[f.dayBranchStage] : ""].filter(Boolean).join(" ");

  // ② 이 운세를 움직이는 기운
  const s2 = [
    `{이름}님 사주에서 가장 두드러진 기운은 ${GROUP_LABEL[f.strongest].name}(${GROUP_LABEL[f.strongest].hanja})이에요. 십신 전체의 ${strongPct}%를 차지해요.`,
    lib.strong[f.strongest],
    second && second !== f.strongest ? `${SECOND_GROUP_LINE[second]} ${firstSentence(lib.strong[second])}` : "",
  ]
    .filter(Boolean)
    .join(" ");

  // ③ 지금의 흐름
  const flowParts: string[] = [];
  if (f.currentDaeun) {
    const c = f.currentDaeun;
    flowParts.push(`지금 {이름}님은 ${c.startAge}세부터 이어지는 ${c.ganzhi}(${c.hanja}) 대운을 지나고 있어요. ${GROUP_LABEL[c.group].name}이 들어오는 10년이에요. ${lib.flow[c.group]}`);
  }
  flowParts.push(`그리고 ${f.seun.year}년은 ${f.seun.ganzhi}(${f.seun.hanja})년이에요. ${SEUN_LINE[f.seun.group]}`);
  const power = TOPIC_POWER_GROUP[topic];
  const daeunFromNow = f.currentDaeun ? f.daeunList.filter((d) => d.startAge >= f.currentDaeun!.startAge) : f.daeunList;
  const powerDaeun = power ? daeunFromNow.find((d) => d.group === power) : undefined;
  if (power && powerDaeun) {
    flowParts.push(
      powerDaeun === f.currentDaeun
        ? `특히 ${TOPIC_WORD[topic]}에 힘을 실어 주는 ${GROUP_LABEL[power].name}이 바로 지금 대운에 들어와 있어요. 지금이 움직이기 좋은 때예요.`
        : `${TOPIC_WORD[topic]}에 힘을 실어 주는 ${GROUP_LABEL[power].name}은 ${powerDaeun.startAge}세부터 시작되는 ${powerDaeun.ganzhi} 대운에 크게 들어와요. 그때를 향해 지금부터 준비해 두면 좋아요.`
    );
  }
  if (f.timeUnknown) flowParts.push("(태어난 시간을 몰라 대운이 시작되는 나이는 몇 해 어긋날 수 있어요.)");
  const s3 = flowParts.join(" ");

  // ④ 눈여겨볼 점
  const s4 = relationsParagraph(f, topic);

  // ⑤ 꼭 채워야 할 하나 (결론)
  const needEl = f.needed.elements[0];
  const needHanja = f.needed.elements.map((e) => ELEMENT_HANJA[e]).join("·");
  const needNames = f.needed.elements.map((e) => `${e}(${ELEMENT_HANJA[e]})`).join("·");
  const F = FILL[needEl];
  const lackBody = [
    `{이름}님은 참 좋은 바탕을 가졌어요. 그런데 딱 하나, ${needNames} 기운이 ${f.needed.reason === "lacking" ? "사주에 비어 있어요" : "가장 약해요"}.`,
    LACK_CORE[needEl],
    lib.lack[needEl],
    `이 하나만 채우면 ${TOPIC_WORD[topic]}의 흐름이 한결 부드러워져요. 가까이 두면 좋은 색은 ${F.colors}, 방위는 ${F.direction}, 숫자는 ${F.numbers} — 모두 ${ELEMENT_NATURE[needEl]}의 기운을 담고 있어요. 동물로는 ${F.animal}, 식물로는 ${F.plant}, 곁에 두는 물건으로는 ${F.object}에 이 기운이 담겨 있어요. 생활에서는 ${F.habit} 같은 작은 습관이 빈자리를 채워 줘요.`,
    timingForNeed(f, needEl),
    `그리고 {이름}님 사주에서 가장 약한 십신은 ${GROUP_LABEL[f.weakestGroup].name}이에요. ${PERSON_FILL[f.weakestGroup]}을 곁에 두면 이 빈자리를 사람이 채워 줘요.${
      f.currentDaeun?.group === f.weakestGroup ? " 마침 지금 대운이 그 기운을 실어 주고 있어, 그런 사람을 만나기 좋은 때예요." : ""
    }`,
  ].join(" ");

  const sections = [
    { heading: h1, body: s1 },
    { heading: h2, body: s2 },
    { heading: h3, body: s3 },
    { heading: h4, body: s4 },
  ].map((s) => ({ heading: s.heading, body: fill(s.body, nickname) }));

  const summary = fill(`${dm.image} 같은 {이름}님, ${TOPIC_WORD[topic]}의 열쇠는 ${GROUP_LABEL[f.strongest].keyword} — 다만 ${needNames} 기운 하나가 아쉬워요`, nickname);
  const keywords = [GROUP_LABEL[f.strongest].keyword, f.currentDaeun ? `${f.currentDaeun.ganzhi} 대운` : `${f.seun.ganzhi}년`, `${needHanja} 기운 채우기`];

  const cols = buildPillarColumns(saju);
  const hl = highlightFor(topic, cols);
  const chart: BasicReadingV2["chart"] = {
    pillars: cols.map((c) => ({
      label: c.label,
      stem: c.stem?.hanja ?? "",
      branch: c.branch?.hanja ?? "",
      stemEl: c.stem?.element ?? null,
      branchEl: c.branch?.element ?? null,
      highlight: hl.keys.has(`${c.key}:stem`) || hl.keys.has(`${c.key}:branch`),
      empty: c.empty,
    })),
    highlightNote: hl.note ? fill(hl.note, nickname) : null,
    daeun: f.daeunList.map((d) => ({ age: d.startAge, hanja: d.hanja, group: d.group, current: d === f.currentDaeun, power: power !== undefined && d.group === power })),
    elements: f.elementPercents.map((e) => ({ ...e, needed: f.needed.elements.includes(e.element) })),
  };
  // 강조 칸은 천간·지지 따로 표시할 수 있게 키를 남겨 둔다
  (chart as unknown as { hlKeys: string[] }).hlKeys = [...hl.keys];

  const lack = {
    heading: h5,
    body: fill(lackBody, nickname),
    fill: { element: needEl, hanja: ELEMENT_HANJA[needEl], ...F },
    person: PERSON_FILL[f.weakestGroup],
  };
  const body = [summary, ...sections.map((s) => `${s.heading}\n${s.body}`), `${lack.heading}\n${lack.body}`].join("\n\n");

  return {
    v: 2,
    topic,
    title: topic === "year" ? `${TOPICS[topic].title} (${f.seun.year}년)` : TOPICS[topic].title,
    model: "engine",
    summary,
    keywords,
    sections,
    lack,
    chart,
    deeper: TOPICS[topic].deepPoints,
    body,
  };
}

/**
 * 깊게 보기 화면 그림 (2026-10-11 수정안 37) - 990냥과 같은 그림(원국 자리·대운 막대·오행 막대·행운 카드)을
 * 깊게 보기에도 붙인다. 엔진 값만 쓰고 저장하지 않는다(열 때마다 계산 - 예전에 쓴 깊은 풀이에도 붙는다).
 * 월별 운세는 올해 열두 달의 월건과 "부족한 기운이 들어오는 달"을 함께 보여 준다.
 */
export interface DeepVisual {
  chart: BasicReadingV2["chart"];
  fill: FillCard;
  person: string;
  needReason: "lacking" | "weakest";
  months: Array<{ label: string; hanja: string; element: ElementKo; fills: boolean }> | null;
}

export function topicVisual(saju: SajuJson, nickname: string, topic: AnyTopicKey, year: number, today?: string): DeepVisual {
  const f = sajuFacts(saju, today);
  const key = (isTopicKey(topic) ? topic : "nature") as TopicKey;
  const cols = buildPillarColumns(saju);
  const hl = highlightFor(key, cols);
  const power = isTopicKey(topic) ? TOPIC_POWER_GROUP[topic] : undefined;
  const needEl = f.needed.elements[0];
  const chart: BasicReadingV2["chart"] = {
    pillars: cols.map((c) => ({
      label: c.label,
      stem: c.stem?.hanja ?? "",
      branch: c.branch?.hanja ?? "",
      stemEl: c.stem?.element ?? null,
      branchEl: c.branch?.element ?? null,
      highlight: hl.keys.has(`${c.key}:stem`) || hl.keys.has(`${c.key}:branch`),
      empty: c.empty,
    })),
    highlightNote: hl.note ? fill(hl.note, nickname) : null,
    daeun: f.daeunList.map((d) => ({ age: d.startAge, hanja: d.hanja, group: d.group, current: d === f.currentDaeun, power: power !== undefined && d.group === power })),
    elements: f.elementPercents.map((e) => ({ ...e, needed: f.needed.elements.includes(e.element) })),
  };
  (chart as unknown as { hlKeys: string[] }).hlKeys = [...hl.keys];
  const months =
    topic === "monthly"
      ? monthPillarsOfYear(year).map((m) => {
          const stem = m.ganzhi.charAt(0);
          const branch = m.ganzhi.charAt(1);
          const element = STEM_ELEMENT[stem] as ElementKo;
          return { label: m.label, hanja: `${STEM_HANJA[stem] ?? stem}${BRANCH_HANJA[branch] ?? branch}`, element, fills: f.needed.elements.includes(element) };
        })
      : null;
  return {
    chart,
    fill: { element: needEl, hanja: ELEMENT_HANJA[needEl], ...FILL[needEl] },
    person: PERSON_FILL[f.weakestGroup],
    needReason: f.needed.reason,
    months,
  };
}
