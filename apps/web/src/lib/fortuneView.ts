import type { FortuneJson, FortuneResultJson, SajuJson } from "saju-engine";
import { STEM_HANJA, BRANCH_HANJA } from "@/lib/pillarView";

/**
 * 오늘/내일의 운세 화면용 점수·근거 정리 (규칙 기반, AI 미사용).
 *
 * 점수는 엔진이 계산한 세 가지만 쓴다:
 *   1) 오늘 천간의 십신(tenGodOfDay)  2) 오늘 지지의 12운성(twelveStageOfDay)
 *   3) 오늘 일진 ↔ 원국 각 기둥의 합·충·형·파·해(perPillar)
 * 영역 대응은 엔진 문구 규칙(relationRules.ts)과 같다: 일주→연애, 월주→직장, 연주·시주→인간관계.
 * ⚠️ 점수 가중치는 참고용으로 정한 값이며 명리학적으로 확정된 수치가 아니다(화면에도 안내).
 */

export type Area = "money" | "love" | "relationship" | "work";
export const AREAS: Array<{ key: Area; label: string; hanja: string }> = [
  { key: "money", label: "금전운", hanja: "財" },
  { key: "love", label: "연애운", hanja: "愛" },
  { key: "relationship", label: "인간관계", hanja: "人" },
  { key: "work", label: "직장·사업운", hanja: "業" },
];

const TEN_GOD_DELTA: Record<string, Partial<Record<Area, number>>> = {
  비견: { relationship: 1, money: -1 },
  겁재: { money: -2, relationship: -1 },
  식신: { love: 2, money: 1 },
  상관: { love: 1, relationship: -1, work: -1 },
  편재: { money: 1, work: 1 },
  정재: { money: 2 },
  편관: { work: -1 },
  정관: { work: 2 },
  편인: { work: 1, love: -1 },
  정인: { relationship: 1, work: 1 },
};

const POSITION_AREA: Record<string, Area> = { day: "love", month: "work", year: "relationship", hour: "relationship" };
const POSITION_LABEL: Record<string, string> = { year: "년주", month: "월주", day: "일주", hour: "시주" };

/** 12운성 → 쉬운 말 (화면에 "사(死)" 같은 용어를 그대로 쓰지 않기 위함) */
export const STAGE_PLAIN: Record<string, { phase: string; delta: number }> = {
  장생: { phase: "새로 피어나는 흐름", delta: 1 },
  목욕: { phase: "마음이 흔들리기 쉬운 흐름", delta: -1 },
  관대: { phase: "자신감이 붙는 흐름", delta: 1 },
  임관: { phase: "힘이 잘 붙는 흐름", delta: 1 },
  제왕: { phase: "기운이 가장 왕성한 흐름", delta: 1 },
  쇠: { phase: "속도를 줄이는 흐름", delta: 0 },
  병: { phase: "쉬어 가야 하는 흐름", delta: -1 },
  사: { phase: "차분히 마무리하는 흐름", delta: -1 },
  묘: { phase: "안으로 다지는 흐름", delta: 0 },
  절: { phase: "방향을 점검하는 흐름", delta: -1 },
  태: { phase: "새 계획을 품는 흐름", delta: 0 },
  양: { phase: "힘을 기르는 흐름", delta: 0 },
};

export type Weather = "sunny" | "partly" | "cloudy" | "rainy";
export function weatherOf(score10: number): Weather {
  if (score10 >= 8) return "sunny";
  if (score10 >= 6) return "partly";
  if (score10 >= 4) return "cloudy";
  return "rainy";
}
export const WEATHER_LABEL: Record<Weather, string> = { sunny: "좋음", partly: "무난", cloudy: "보통", rainy: "주의" };

export interface Evidence {
  area: Area;
  text: string;
  tone: "good" | "bad";
}

export interface AreaView {
  key: Area;
  label: string;
  hanja: string;
  score: number;
  weather: Weather;
  text: string;
  evidence: Evidence[];
}

export interface FortuneView {
  dateLabel: string;
  day: { stem: string; branch: string; hanja: string };
  me: { stem: string; branch: string; hanja: string };
  overall: { score: number; weather: Weather; text: string; phase: string };
  areas: AreaView[];
  chips: Array<{ text: string; tone: "good" | "bad" }>;
  keywords: string[];
  advice: string;
}

const REL_TEXT = {
  stemCombination: { name: "천간합", text: "도움이나 좋은 제안이 들어오기 쉬워요", tone: "good" as const, d: 1 },
  branchCombination: { name: "육합", text: "손발이 잘 맞고 화합하기 좋아요", tone: "good" as const, d: 2 },
  branchClash: { name: "충", text: "부딪힘이나 예상 밖 변수가 생기기 쉬워요", tone: "bad" as const, d: -3 },
  branchPunishment: { name: "형", text: "예민해지거나 사소한 스트레스가 생기기 쉬워요", tone: "bad" as const, d: -2 },
  branchDestruction: { name: "파", text: "계획이 틀어지거나 더뎌지기 쉬워요", tone: "bad" as const, d: -1 },
  branchHarm: { name: "해", text: "말 한마디가 오해를 사기 쉬워요", tone: "bad" as const, d: -1 },
};

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
export function dateLabel(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const wd = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return `${m}월 ${d}일 ${WEEKDAYS[wd]}요일`;
}

const SAFE_ADVICE: Record<string, string> = {
  제왕: "자신감은 좋지만 주변 의견에도 귀 기울이면 더 좋은 하루가 돼요.",
  목욕: "중요한 결정은 하루 정도 미루고 다시 생각해보세요.",
  쇠: "무리한 약속보다 할 수 있는 만큼만 계획하세요.",
  병: "오늘은 몸을 챙기는 걸 우선순위에 두세요.",
};

export function buildFortuneView(saju: SajuJson, fortune: FortuneJson, result: FortuneResultJson): FortuneView {
  const { tenGodOfDay, twelveStageOfDay, perPillar } = fortune.relationToday;
  const scores: Record<Area, number> = { money: 6, love: 6, relationship: 6, work: 6 };
  const evidence: Evidence[] = [];
  const chips: FortuneView["chips"] = [];

  for (const [area, d] of Object.entries(TEN_GOD_DELTA[tenGodOfDay] ?? {})) scores[area as Area] += d ?? 0;
  const stage = STAGE_PLAIN[twelveStageOfDay] ?? { phase: "", delta: 0 };
  for (const a of Object.keys(scores) as Area[]) scores[a] += stage.delta;

  const dayStem = fortune.dayGanzhi.stem;
  const dayBranch = fortune.dayGanzhi.branch;
  for (const [pos, rel] of Object.entries(perPillar)) {
    if (!rel) continue;
    const pillar = saju.pillars[pos as keyof typeof saju.pillars];
    if (!pillar) continue;
    const area = POSITION_AREA[pos];
    for (const k of Object.keys(REL_TEXT) as Array<keyof typeof REL_TEXT>) {
      const on = k === "branchPunishment" ? rel.branchPunishment !== null : (rel as unknown as Record<string, boolean>)[k];
      if (!on) continue;
      const meta = REL_TEXT[k];
      scores[area] += meta.d;
      const a = k === "stemCombination" ? STEM_HANJA[dayStem] : BRANCH_HANJA[dayBranch];
      const b = k === "stemCombination" ? STEM_HANJA[pillar.heavenlyStem] : BRANCH_HANJA[pillar.earthlyBranch];
      const posLabel = POSITION_LABEL[pos];
      evidence.push({ area, tone: meta.tone, text: `오늘 ${a} ↔ 내 ${posLabel} ${b}: ${meta.name}(${relHanja(k)}) — ${meta.text}` });
      chips.push({ text: `${posLabel} ${meta.name}`, tone: meta.tone });
    }
  }

  const areas: AreaView[] = AREAS.map(({ key, label, hanja }) => {
    const score = Math.max(1, Math.min(10, scores[key]));
    return { key, label, hanja, score, weather: weatherOf(score), text: result.categories[key], evidence: evidence.filter((e) => e.area === key) };
  });

  const avg = areas.reduce((s, a) => s + a.score, 0) / areas.length;
  const overallScore = Math.round(avg * 10);

  // 엔진 조언이 영역 문장과 똑같이 반복되면(주의 규칙을 그대로 가져온 경우) 12운성 기반 조언으로 대신한다.
  const repeated = Object.values(result.categories).includes(result.advice);
  const advice = repeated ? SAFE_ADVICE[twelveStageOfDay] ?? "평소의 페이스를 유지하면서 차분하게 하루를 보내세요." : result.advice;

  return {
    dateLabel: dateLabel(fortune.date),
    day: { stem: dayStem, branch: dayBranch, hanja: `${STEM_HANJA[dayStem]}${BRANCH_HANJA[dayBranch]}` },
    me: {
      stem: saju.pillars.day.heavenlyStem,
      branch: saju.pillars.day.earthlyBranch,
      hanja: `${STEM_HANJA[saju.pillars.day.heavenlyStem]}${BRANCH_HANJA[saju.pillars.day.earthlyBranch]}`,
    },
    overall: { score: overallScore, weather: weatherOf(avg), text: result.categories.overall, phase: stage.phase },
    areas,
    chips,
    keywords: result.keywords,
    advice,
  };
}

function relHanja(k: keyof typeof REL_TEXT): string {
  return { stemCombination: "合", branchCombination: "合", branchClash: "沖", branchPunishment: "刑", branchDestruction: "破", branchHarm: "害" }[k];
}
