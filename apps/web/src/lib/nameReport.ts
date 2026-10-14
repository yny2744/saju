import type { SajuJson } from "saju-engine";
import type { ElementKo } from "@/lib/pillarView";
import { ELEMENTS, ELEMENT_HANJA, ELEMENT_NATURE } from "@/lib/manseView";
import { neededEnergy } from "@/lib/neededEnergy";
import { DAY_MASTER, FILL, LACK_CORE } from "@/lib/basic/common";
import { elementRelation, readName, type NameHanjaDict, type NameReadingResult } from "@/lib/nameReading";
import { suriInfo } from "@/lib/suri81";

/**
 * 무료 이름 풀이 리포트 (2026-10-14 수정안 14) - AI 없이 엔진 값으로 글과 그림 재료를 함께 만든다.
 * 사주와 이름을 한 이야기로 묶는다: 나의 바탕(일간·오행) → 이름 글자 → 이름이 더하는 기운 → 수리 네 격 → 소리 → 음양 → 종합과 채우는 법.
 * 말투 원칙: 칭찬 먼저, 아쉬운 점은 살며시, 겁주지 않는다. {이름} 대신 실제 이름을 넣는다.
 */

/** 뜻 사전(dict.json): 소리 → [[한자, "뜻 음"], ...] */
export type MeaningDict = Record<string, Array<[string, string]>>;

export interface NameReportChar {
  hangul: string;
  hanja: string | null;
  meaning: string | null;
  strokes: number | null;
  element: ElementKo | null;
  sound: ElementKo | null;
  yinYang: "양" | "음" | null;
  isSurname: boolean;
  fills: boolean;
  text: string;
}

export interface NameReport {
  name: string;
  hanja: string | null;
  complete: boolean;
  score: number;
  verdict: NameReadingResult["verdict"];
  headline: string;
  summary: string;
  criteria: Array<{ key: string; label: string; got: number; max: number; note: string }>;
  base: { dayStemLabel: string; dayText: string; shares: Array<{ element: ElementKo; percent: number }>; needed: ElementKo[]; lackText: string };
  chars: NameReportChar[];
  /** 이름이 더하는 기운: 사주만 / 이름을 더한 뒤 (점수) */
  boost: { before: Record<ElementKo, number>; after: Record<ElementKo, number>; text: string };
  suri: Array<{ name: string; period: string; value: number; lucky: boolean; title: string; text: string }>;
  suriText: string;
  sound: { nodes: Array<{ hangul: string; element: ElementKo | null }>; links: Array<"생" | "극" | "같음" | "받음" | "눌림">; text: string };
  yinYang: { marks: Array<"양" | "음" | null>; balanced: boolean | null; text: string };
  fill: { element: ElementKo; colors: string; direction: string; numbers: string; object: string; habit: string };
  closing: string;
  /** 이름과 나(일간)의 관계, 첫인상과 여운 */
  relation: string;
  impression: string;
}

const PERIOD: Record<string, string> = { 원격: "어린 시절", 형격: "청년기", 이격: "중년기", 정격: "말년·평생" };
const STEM_LABEL: Record<string, string> = { 갑: "갑목(甲木)", 을: "을목(乙木)", 병: "병화(丙火)", 정: "정화(丁火)", 무: "무토(戊土)", 기: "기토(己土)", 경: "경금(庚金)", 신: "신금(辛金)", 임: "임수(壬水)", 계: "계수(癸水)" };
const STEM_EL: Record<string, ElementKo> = { 갑: "목", 을: "목", 병: "화", 정: "화", 무: "토", 기: "토", 경: "금", 신: "금", 임: "수", 계: "수" };
const FLOW_WORD: Record<string, string> = { 생: "살려 주고", 받음: "도움을 받고", 같음: "같은 기운으로 이어지고", 극: "부딪히고", 눌림: "눌리고" };

function el(v: string | null | undefined): ElementKo | null {
  return v && (ELEMENTS as string[]).includes(v) ? (v as ElementKo) : null;
}

/** 받침에 따라 은/는, 이/가 */
function josa(word: string, a: string, b: string): string {
  const c = word.charCodeAt(word.length - 1) - 0xac00;
  return c >= 0 && c <= 11171 && c % 28 !== 0 ? a : b;
}

/** 받침이 있으면(ㄹ 제외) 으로, 없거나 ㄹ이면 로 */
function euro(word: string): string {
  const c = word.charCodeAt(word.length - 1) - 0xac00;
  if (c < 0 || c > 11171) return "로";
  const f = c % 28;
  return f === 0 || f === 8 ? "로" : "으로";
}

/** 첫소리 오행 → 처음 불릴 때의 인상, 끝소리 → 남는 여운 */
const FIRST_IMPRESSION: Record<ElementKo, string> = {
  목: "곧고 싱그러운 인상을 줘요. 처음 듣는 사람에게 '반듯하고 성장하는 사람'으로 다가가요.",
  화: "밝고 따뜻한 인상을 줘요. 이름을 부르는 순간 분위기가 환해지는 소리예요.",
  토: "편안하고 믿음직한 인상을 줘요. 처음 만나도 기대고 싶은 사람으로 느껴져요.",
  금: "또렷하고 단정한 인상을 줘요. 맺고 끊음이 분명한 사람으로 기억돼요.",
  수: "부드럽고 깊은 인상을 줘요. 차분하고 생각이 깊은 사람으로 다가가요.",
};
const LAST_ECHO: Record<ElementKo, string> = {
  목: "끝소리는 위로 뻗는 나무의 기운이라, 이름이 끝난 뒤에도 '앞으로 더 클 사람'이라는 여운이 남아요.",
  화: "끝소리는 피어오르는 불의 기운이라, 부르고 나면 마음이 따뜻해지는 여운이 남아요.",
  토: "끝소리는 받쳐 주는 흙의 기운이라, 듣는 사람에게 안정감 있는 여운이 남아요.",
  금: "끝소리는 맑게 울리는 쇠의 기운이라, 또렷하게 기억에 새겨지는 여운이 남아요.",
  수: "끝소리는 스며드는 물의 기운이라, 오래도록 은은하게 기억되는 여운이 남아요.",
};
/** 이름 첫 글자 기운과 나의 본바탕(일간)의 관계 */
const DM_REL: Record<"생" | "같음" | "극" | "받음" | "눌림", string> = {
  생: "이름 첫 글자의 기운이 본바탕을 낳아 주는 짜임이에요. 어머니가 아이를 키우듯 이름이 나를 북돋아 주니, 이름이 곧 든든한 뒷배가 돼요.",
  같음: "이름 첫 글자의 기운이 본바탕과 같아요. 이름이 나의 색을 더 진하고 또렷하게 해 주어, 내 장점이 사람들 눈에 잘 띄어요.",
  받음: "본바탕이 이름 첫 글자의 기운을 낳아 주는 짜임이에요. 내가 가진 힘이 이름을 통해 밖으로 펼쳐지니, 재능과 표현이 살아나는 이름이에요.",
  극: "이름 첫 글자의 기운이 본바탕을 다잡아 주는 짜임이에요. 느슨해지지 않게 나를 단련시키는 이름이라, 원칙과 책임감이 자라요.",
  눌림: "본바탕이 이름 첫 글자의 기운을 다스리는 짜임이에요. 내가 이름의 기운을 손에 쥐고 쓰는 모양이라, 실속과 재물을 챙기는 힘이 커져요.",
};
const PERIOD_GOOD: Record<string, string> = {
  원격: "어린 시절과 바탕을 이루는 수가 좋아, 타고난 재주가 일찍 드러나고 집안의 사랑을 받기 쉬워요.",
  형격: "사회에 나가 자리를 잡는 청년기의 수가 좋아, 일과 배움에서 기회를 잘 잡아요.",
  이격: "중년의 사람 관계와 가정을 보는 수가 좋아, 함께하는 사람 덕을 보고 집안이 화목해요.",
  정격: "평생의 큰 흐름과 말년을 보는 수가 좋아, 나이 들수록 이룬 것이 쌓이고 편안해져요.",
};
const PERIOD_CARE: Record<string, string> = {
  원격: "어린 시절의 수가 조금 아쉬워요. 바탕을 다지는 시기라 서두르기보다 기초를 탄탄히 하면 좋아요.",
  형격: "청년기의 수가 조금 아쉬워요. 일을 벌일 때 한 번 더 살피고, 믿을 만한 선배의 조언을 들으면 좋아요.",
  이격: "중년기의 수가 조금 아쉬워요. 사람 사이에서 마음을 먼저 표현하고, 가까운 인연을 아끼면 단단해져요.",
  정격: "평생의 수가 조금 아쉬워요. 큰 욕심보다 꾸준히 쌓는 쪽이 말년을 편안하게 해 줘요.",
};

function meaningOf(dict: MeaningDict | null, hangul: string, hanja: string | null): string | null {
  if (!dict || !hanja) return null;
  const hit = dict[hangul]?.find(([h]) => h === hanja);
  return hit ? hit[1] : null;
}

export function buildNameReport(nickname: string, hanjaName: string | undefined, saju: SajuJson, names: NameHanjaDict, meanings: MeaningDict | null): NameReport | null {
  const need = neededEnergy(saju);
  const r = readName(nickname, hanjaName, need.elements, names);
  if (!r) return null;
  const nm = nickname.trim();
  const surLen = [...r.surname].length;

  // ── 나의 바탕 ─────────────────────────────
  const dayStem = saju.pillars.day.heavenlyStem as string;
  const dm = DAY_MASTER[dayStem];
  const counts = saju.elements.summary.counts as Record<ElementKo, number>;
  const total = ELEMENTS.reduce((s, e) => s + counts[e], 0) || 1;
  const shares = ELEMENTS.map((e) => ({ element: e, percent: Math.round((counts[e] / total) * 100) }));
  const needed = need.elements;
  const lackText = `${needed.map((e) => `${e}(${ELEMENT_HANJA[e]})`).join("·")}의 기운이 ${need.reason === "lacking" ? "비어 있어요" : "가장 약해요"}. ${LACK_CORE[needed[0]]}`;

  // ── 글자마다 ─────────────────────────────
  const chars: NameReportChar[] = r.chars.map((c, i) => {
    const isSurname = i < surLen;
    const element = el(c.element);
    const sound = r.sound.elements[i];
    const meaning = meaningOf(meanings, c.hangul, c.hanja);
    const fills = !isSurname && !!element && needed.includes(element);
    let text: string;
    if (c.hanja) {
      const m = meaning ? `'${meaning}'의 뜻을 담은 글자로, ` : "";
      const e = element ? `부수로 보면 ${ELEMENT_NATURE[element]}(${ELEMENT_HANJA[element]})의 기운을 품고 있어요.` : "부수만으로는 오행을 정하기 어려운 글자예요.";
      const s = isSurname ? " 성(姓)은 집안에서 이어받은 뿌리라 이름 풀이의 바탕이 돼요." : fills ? ` 바로 ${nm}님 사주에 아쉬운 기운이라, 이 글자가 평생 그 빈자리를 채워 줘요.` : "";
      text = `${c.hanja}(${c.hangul})${josa(c.hangul, "은", "는")} ${m}${c.strokes}획 ${c.yinYang === "양" ? "홀수라 양(陽)" : "짝수라 음(陰)"}이에요. ${e}${s}`;
    } else {
      text = `'${c.hangul}'${josa(c.hangul, "은", "는")} 한자를 알지 못해 소리로만 봤어요. 첫소리로 보면 ${sound ? `${ELEMENT_NATURE[sound]}(${ELEMENT_HANJA[sound]})의 소리` : "오행을 정하기 어려운 소리"}예요.`;
    }
    return { hangul: c.hangul, hanja: c.hanja, meaning, strokes: c.strokes, element, sound, yinYang: c.yinYang, isSurname, fills, text };
  });

  // ── 이름이 더하는 기운 ─────────────────────
  const before = { ...counts };
  const after = { ...counts };
  const unit = total / 8; // 원국 한 글자만큼의 무게
  for (const c of chars) {
    if (c.isSurname) continue;
    if (c.element) after[c.element] += unit * 0.6;
    if (c.sound) after[c.sound] += unit * 0.3;
  }
  const filled = needed.filter((e) => after[e] > before[e]);
  const boostText = filled.length
    ? `이름을 부를 때마다 ${filled.map((e) => `${ELEMENT_NATURE[e]}(${ELEMENT_HANJA[e]})`).join("·")}의 기운이 조금씩 더해져요. 사주에 아쉬운 자리를 이름이 함께 메워 주는 모습이라, 이름과 사주가 서로 돕는 짝이에요.`
    : `이름 글자와 소리가 사주에 아쉬운 ${needed.map((e) => `${ELEMENT_NATURE[e]}(${ELEMENT_HANJA[e]})`).join("·")}의 기운을 직접 채워 주지는 않아요. 그래서 이 기운은 생활 속 색·방위·물건으로 채워 주면 좋아요.`;

  // ── 수리 네 격 ───────────────────────────
  const suri = r.suri.map((s) => {
    const info = suriInfo(s.value);
    return { name: s.name, period: PERIOD[s.name], value: s.value, lucky: s.lucky, title: info.name, text: `${info.text} ${s.lucky ? PERIOD_GOOD[s.name] : PERIOD_CARE[s.name]}` };
  });
  const luckyN = suri.filter((s) => s.lucky).length;
  const suriText = !r.complete
    ? "한자 이름을 모두 넣으면 획수로 보는 원격·형격·이격·정격 네 격을 풀어 드려요."
    : luckyN === 4
      ? "네 격이 모두 길한 수예요. 어린 시절부터 말년까지 이름의 수가 고르게 받쳐 주는, 흔치 않은 좋은 짜임이에요."
      : luckyN === 3
        ? `네 격 중 셋이 길한 수예요. ${suri.find((s) => !s.lucky)?.period} 무렵에만 조금 더 마음을 써 주면 고르게 좋아요.`
        : `네 격 중 ${luckyN}개가 길한 수예요. 아쉬운 격이 가리키는 시기에는 서두르지 않고, 곁의 사람과 함께 가는 것이 이름의 수를 보완하는 길이에요.`;

  // ── 소리 ─────────────────────────────────
  const nodes = chars.map((c) => ({ hangul: c.hangul, element: c.sound }));
  const links = r.sound.flow;
  const soundParts = links.map((f, i) => `'${chars[i].hangul}'에서 '${chars[i + 1].hangul}'${euro(chars[i + 1].hangul)} 넘어갈 때는 ${FLOW_WORD[f]}`);
  const soundText =
    (r.sound.clashes === 0
      ? "부르는 소리가 처음부터 끝까지 부딪힘 없이 이어져요. 남이 내 이름을 부를 때 부드럽고 듣기 좋은 이름이에요."
      : `소리가 부딪히는 곳이 ${r.sound.clashes}군데 있어요. 부르는 사람에게 또렷하게 남는 대신 조금 강하게 들릴 수 있어요.`) +
    (soundParts.length ? ` ${soundParts.join(", ")} 있어요.` : "");
  const firstS = chars.find((c) => !c.isSurname)?.sound ?? null;
  const lastS = chars[chars.length - 1]?.sound ?? null;
  const impression = [firstS ? `이름 첫소리는 ${ELEMENT_NATURE[firstS]}(${ELEMENT_HANJA[firstS]})의 소리라 ${FIRST_IMPRESSION[firstS]}` : "", lastS ? LAST_ECHO[lastS] : ""].filter(Boolean).join(" ");

  // ── 음양 ─────────────────────────────────
  const marks = chars.map((c) => c.yinYang);
  const yyText =
    r.yinYangBalanced === null
      ? "한자를 모두 알아야 획수로 음양을 볼 수 있어요."
      : r.yinYangBalanced
        ? "홀수(양)와 짝수(음) 획이 섞여 있어 음양이 고르게 어울려요. 밀고 당기는 힘이 균형을 이루는 이름이에요."
        : `획수가 모두 ${marks[0] === "양" ? "홀수(양)" : "짝수(음)"}라 한쪽으로 기울었어요. ${marks[0] === "양" ? "앞으로 나아가는 힘은 크지만 쉬어 가는 여유를" : "차분한 힘은 크지만 앞으로 나서는 힘을"} 생활에서 채워 주면 좋아요.`;

  // ── 점수 ─────────────────────────────────
  const criteria: NameReport["criteria"] = [];
  if (r.complete) {
    criteria.push({ key: "suri", label: "수리 네 격", got: luckyN * 7.5, max: 30, note: `길한 격 ${luckyN}/4` });
    criteria.push({ key: "yy", label: "음양 조화", got: r.yinYangBalanced ? 10 : 4, max: 10, note: r.yinYangBalanced ? "고르게 어울림" : "한쪽으로 기욺" });
  }
  criteria.push({ key: "sound", label: "소리 흐름", got: r.sound.clashes === 0 ? 20 : r.sound.clashes === 1 ? 12 : 5, max: 20, note: r.sound.clashes === 0 ? "부딪힘 없음" : `부딪힘 ${r.sound.clashes}곳` });
  if (r.complete) {
    criteria.push({ key: "fill", label: "한자의 사주 보완", got: r.supports.length ? 25 : 8, max: 25, note: r.supports.length ? `${r.supports.join("·")} 채움` : "직접 채우지 않음" });
  }
  const soundFill = needed.some((e) => chars.some((c) => !c.isSurname && c.sound === e));
  criteria.push({ key: "soundfill", label: "소리의 사주 보완", got: soundFill ? 15 : 6, max: 15, note: soundFill ? "소리로 채움" : "소리로는 채우지 않음" });
  const got = criteria.reduce((s, c) => s + c.got, 0);
  const max = criteria.reduce((s, c) => s + c.max, 0);
  const score = Math.round((got / max) * 100);

  const headline =
    r.verdict === "good" ? `${nm}님 이름은 사주와 잘 어울리는 이름이에요` : r.verdict === "fair" ? `${nm}님 이름은 무난하고 좋은 이름이에요` : `${nm}님 이름은 좋은 점과 아쉬운 점이 함께 있어요`;
  const good: string[] = [];
  const weak: string[] = [];
  for (const c of criteria) (c.got / c.max >= 0.7 ? good : weak).push(c.label);
  const summary =
    (good.length ? `${good.join(", ")}${josa(good[good.length - 1], "이", "가")} 특히 좋아요. ` : "") +
    (weak.length ? `${weak.join(", ")}${josa(weak[weak.length - 1], "은", "는")} 조금 아쉬운데, 아래에서 생활 속으로 채우는 법까지 함께 알려 드릴게요.` : "모든 기준이 고르게 좋아요. 지금 이름을 아끼고 자주 불러 주세요.");

  const dmEl = STEM_EL[dayStem];
  const firstGiven = chars.find((c) => !c.isSurname);
  const firstEl = firstGiven?.element ?? firstGiven?.sound ?? null;
  const rel = dmEl && firstEl ? elementRelation(firstEl, dmEl) : null;
  const relText = rel ? `${nm}님의 본바탕은 ${STEM_LABEL[dayStem]}이고, ${DM_REL[rel]}` : "";

  const f = FILL[needed[0]];
  const closing = `${nm}님의 이름은 평생 가장 많이 불리는 소리예요. 하루에도 여러 번, 평생 수십만 번 불리며 그때마다 이름의 기운이 나에게 닿아요. 이름이 다 채우지 못한 ${needed[0]}(${ELEMENT_HANJA[needed[0]]})의 기운은 ${f.colors} 같은 색, ${f.direction}, ${f.object}처럼 곁에 두는 것으로 채울 수 있어요.`.replace(/\s+/g, " ");

  return {
    name: nm,
    hanja: r.complete ? r.chars.map((c) => c.hanja).join("") : null,
    complete: r.complete,
    score,
    verdict: r.verdict,
    headline,
    summary,
    criteria,
    base: { dayStemLabel: STEM_LABEL[dayStem] ?? dayStem, dayText: dm ? dm.core.replace(/\{이름\}/g, nm) : "", shares, needed, lackText },
    chars,
    boost: { before, after, text: boostText },
    suri,
    suriText,
    sound: { nodes, links, text: soundText },
    yinYang: { marks, balanced: r.yinYangBalanced, text: yyText },
    fill: { element: needed[0], colors: f.colors, direction: f.direction, numbers: f.numbers, object: f.object, habit: f.habit },
    closing,
    relation: relText,
    impression,
  };
}
