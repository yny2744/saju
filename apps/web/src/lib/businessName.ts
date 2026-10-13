import type { ElementKo } from "@/lib/pillarView";
import { ELEMENT_ORDER, elementRelation, isLuckySuri, normalizeSuri, soundElement, type NameHanjaDict } from "@/lib/nameReading";

/**
 * 상호(가게·회사 이름) 풀이 · 작명 (2026-10-13 수정안 63) - AI 없이 표와 규칙으로만 계산한다.
 *
 *  1. 업종 오행: 업종마다 전해 오는 오행. 상호의 소리(첫소리 오행)가 업종 기운을 낳거나(상생) 같으면 좋고, 누르면(상극) 아쉽다.
 *  2. 소리 흐름: 글자와 글자 사이 첫소리 오행이 부딪히지 않는지 (이름 풀이와 같은 기준).
 *  3. 총획 수리: 한자 상호면 모든 글자 원획을 더해 81수리로 길흉을 본다 (한글 상호는 보지 않는다).
 *  4. 대표자 사주: 상호의 소리·한자 기운이 대표자 사주에 아쉬운 기운을 채워 주는지.
 *  5. 부르기: 2~4글자면 기억하기 좋다.
 *
 * 같은 이름이 상표로 등록돼 있는지는 여기서 알 수 없다 - 화면에서 특허청 키프리스 확인을 꼭 안내한다.
 */

export type IndustryKey =
  | "food"
  | "cafe"
  | "beauty"
  | "edu"
  | "fashion"
  | "health"
  | "realty"
  | "build"
  | "finance"
  | "car"
  | "it"
  | "shop"
  | "travel"
  | "craft"
  | "farm"
  | "service";

export interface Industry {
  key: IndustryKey;
  label: string;
  element: ElementKo;
  /** 상호 뒤에 흔히 붙이는 말 (안내용) */
  suffix: string;
}

/** 업종 오행 (통용 분류를 따르되, 손님이 고르기 쉬운 묶음으로) */
export const INDUSTRIES: Industry[] = [
  { key: "food", label: "음식점·식당", element: "화", suffix: "식당 · 밥상 · 한식" },
  { key: "cafe", label: "카페·음료·주점", element: "수", suffix: "카페 · 다방 · 주막" },
  { key: "beauty", label: "미용·네일·화장품", element: "화", suffix: "헤어 · 뷰티 · 살롱" },
  { key: "edu", label: "학원·교육·출판", element: "목", suffix: "학원 · 교실 · 서당" },
  { key: "fashion", label: "옷·잡화·꽃집", element: "목", suffix: "옷방 · 공방 · 꽃집" },
  { key: "health", label: "병원·약국·건강", element: "목", suffix: "한의원 · 약국 · 의원" },
  { key: "realty", label: "부동산·중개", element: "토", suffix: "공인중개사 · 부동산" },
  { key: "build", label: "건설·인테리어", element: "토", suffix: "건설 · 인테리어" },
  { key: "finance", label: "금융·보험·법률·세무", element: "금", suffix: "세무 · 법무 · 금융" },
  { key: "car", label: "자동차·기계·금속", element: "금", suffix: "모터스 · 공업사 · 정비" },
  { key: "it", label: "IT·전자·방송·광고", element: "화", suffix: "랩 · 미디어 · 소프트" },
  { key: "shop", label: "유통·무역·쇼핑몰", element: "수", suffix: "상회 · 마켓 · 무역" },
  { key: "travel", label: "여행·운송·물류", element: "수", suffix: "여행 · 물류 · 운수" },
  { key: "craft", label: "공방·디자인·예술", element: "목", suffix: "공방 · 스튜디오" },
  { key: "farm", label: "농업·식품·숙박", element: "토", suffix: "농원 · 푸드 · 스테이" },
  { key: "service", label: "그 밖의 서비스업", element: "토", suffix: "상사 · 컴퍼니" },
];

export function industryOf(key: unknown): Industry | null {
  return INDUSTRIES.find((x) => x.key === key) ?? null;
}

export type FeelingKey = "trust" | "warm" | "young" | "premium" | "tradition" | "rich" | "nature" | "bright";
export const FEELINGS: Array<{ key: FeelingKey; label: string }> = [
  { key: "trust", label: "믿음·정직" },
  { key: "warm", label: "따뜻함·정성" },
  { key: "young", label: "젊음·새로움" },
  { key: "premium", label: "고급·으뜸" },
  { key: "tradition", label: "전통·오래감" },
  { key: "rich", label: "풍요·번창" },
  { key: "nature", label: "자연·건강" },
  { key: "bright", label: "밝음·희망" },
];
export function isFeelingKey(v: unknown): v is FeelingKey {
  return FEELINGS.some((f) => f.key === v);
}

// ───────────────────────── 로마자 (영문 표기) ─────────────────────────
// 국어의 로마자 표기법(2000)을 글자 단위로 따른다 (이어 읽을 때의 소리 변화는 반영하지 않음 - 영문 간판 참고용).
const RR_INITIAL = ["g", "kk", "n", "d", "tt", "r", "m", "b", "pp", "s", "ss", "", "j", "jj", "ch", "k", "t", "p", "h"];
const RR_MEDIAL = ["a", "ae", "ya", "yae", "eo", "e", "yeo", "ye", "o", "wa", "wae", "oe", "yo", "u", "wo", "we", "wi", "yu", "eu", "ui", "i"];
const RR_FINAL = ["", "k", "k", "k", "n", "n", "n", "t", "l", "k", "m", "l", "l", "l", "p", "l", "m", "p", "p", "t", "t", "ng", "t", "t", "k", "t", "p", "t"];

export function romanize(hangul: string): string {
  let out = "";
  for (const ch of hangul) {
    const code = ch.charCodeAt(0) - 0xac00;
    if (code < 0 || code > 11171) {
      out += ch;
      continue;
    }
    const i = Math.floor(code / 588);
    const m = Math.floor((code % 588) / 28);
    const f = code % 28;
    let ini = RR_INITIAL[i];
    // 첫 글자의 ㄹ은 r 대신 관례대로 r, 받침 뒤 ㄹ도 r (단순화)
    if (out === "" && ini === "r") ini = "r";
    out += ini + RR_MEDIAL[m] + RR_FINAL[f];
  }
  return out.charAt(0).toUpperCase() + out.slice(1);
}

// ───────────────────────── 상호 풀이 ─────────────────────────

export interface BusinessChar {
  hangul: string;
  hanja: string | null;
  strokes: number | null;
  /** 자원오행 (한자 부수) */
  element: string;
  /** 소리오행 (첫소리) */
  sound: ElementKo | null;
}

export interface BusinessReading {
  name: string;
  hanja: string | null;
  chars: BusinessChar[];
  /** 한자가 모두 있어 총획 수리를 계산했는지 */
  complete: boolean;
  totalStrokes: number | null;
  suri: { value: number; lucky: boolean } | null;
  sound: { flow: Array<"생" | "극" | "같음" | "받음" | "눌림">; clashes: number };
  industry: { key: IndustryKey; label: string; element: ElementKo; helps: number; hurts: number; first: "생" | "같음" | "극" | "보통" } | null;
  /** 대표자 사주에 아쉬운 기운 중 상호가 채워 주는 것 (대표자 사주가 있을 때만) */
  supports: ElementKo[] | null;
  needed: ElementKo[] | null;
  lengthOk: boolean;
  english: string;
  score: number;
  verdict: "good" | "fair" | "weak";
}

/** 상호에서 한글 글자만 (띄어쓰기·영문·숫자는 뺀다) */
export function businessSyllables(name: string): string[] {
  return [...name].filter((c) => /[가-힣]/.test(c));
}

/** a 기운이 업종 기운 b에 주는 영향: 낳거나(생) 같으면 도움, a가 b를 누르면(극) 아쉬움 */
function toIndustry(a: ElementKo, b: ElementKo): "생" | "같음" | "극" | "보통" {
  const r = elementRelation(a, b);
  if (r === "생" || r === "같음") return r;
  if (r === "극") return "극";
  return "보통";
}

/**
 * @param name     한글 상호 (예: 다온식당 → "다온"만 넣는 걸 권하지만, 넣은 대로 본다)
 * @param hanja    한자 상호 (글자 수가 같을 때만 쓴다, 모르는 글자는 한글로 섞여 있어도 됨)
 * @param industry 업종 (없으면 업종 풀이는 뺀다)
 * @param needed   대표자 사주에 아쉬운 기운 (없으면 사주 풀이는 뺀다)
 */
export function readBusinessName(name: string, hanja: string | null | undefined, industry: Industry | null, needed: ElementKo[] | null, dict: NameHanjaDict): BusinessReading | null {
  const syl = businessSyllables(name);
  if (syl.length < 1 || syl.length > 8) return null;
  const hj = hanja ? [...hanja.replace(/\s/g, "")] : [];
  const same = hj.length === syl.length;
  const chars: BusinessChar[] = syl.map((h, i) => {
    const c = same ? hj[i] : undefined;
    const e = c && /\p{Script=Han}/u.test(c) ? dict[c] : undefined;
    return { hangul: h, hanja: e ? c! : null, strokes: e ? e[0] : null, element: e ? e[1] : "", sound: soundElement(h) };
  });
  const complete = chars.every((c) => c.strokes !== null);
  const totalStrokes = complete ? chars.reduce((a, c) => a + (c.strokes ?? 0), 0) : null;
  const suri = totalStrokes !== null ? { value: normalizeSuri(totalStrokes), lucky: isLuckySuri(totalStrokes) } : null;

  const flow: BusinessReading["sound"]["flow"] = [];
  for (let i = 0; i + 1 < chars.length; i++) {
    const a = chars[i].sound;
    const b = chars[i + 1].sound;
    if (a && b) flow.push(elementRelation(a, b));
  }
  const clashes = flow.filter((f) => f === "극" || f === "눌림").length;

  let ind: BusinessReading["industry"] = null;
  if (industry) {
    const rel = chars.map((c) => (c.sound ? toIndustry(c.sound, industry.element) : "보통"));
    ind = {
      key: industry.key,
      label: industry.label,
      element: industry.element,
      helps: rel.filter((r) => r === "생" || r === "같음").length,
      hurts: rel.filter((r) => r === "극").length,
      first: rel[0] ?? "보통",
    };
  }

  let supports: ElementKo[] | null = null;
  if (needed) {
    const have = new Set<string>([...chars.map((c) => c.sound ?? ""), ...chars.map((c) => c.element)].filter(Boolean));
    supports = needed.filter((e) => have.has(e));
  }

  const lengthOk = syl.length >= 2 && syl.length <= 4;
  let score = 0;
  score += clashes === 0 ? 2 : clashes === 1 ? 1 : 0;
  if (ind) score += (ind.first === "생" || ind.first === "같음" ? 1 : 0) + (ind.helps >= 1 ? 1 : 0) - (ind.hurts >= 2 ? 1 : 0);
  if (suri) score += suri.lucky ? 2 : -1;
  if (supports && supports.length > 0) score += 1;
  if (lengthOk) score += 1;
  const max = 2 + (ind ? 2 : 0) + (suri ? 2 : 0) + (supports ? 1 : 0) + 1;
  const ratio = score / max;
  const verdict: BusinessReading["verdict"] = ratio >= 0.7 ? "good" : ratio >= 0.4 ? "fair" : "weak";

  return {
    name: syl.join(""),
    hanja: complete ? chars.map((c) => c.hanja).join("") : null,
    chars,
    complete,
    totalStrokes,
    suri,
    sound: { flow, clashes },
    industry: ind,
    supports,
    needed,
    lengthOk,
    english: romanize(syl.join("")),
    score,
    verdict,
  };
}

// ───────────────────────── 상호 작명 (후보 고르기) ─────────────────────────

/** 상호 후보 재료: 한자어(뜻이 밝은 말)와 순우리말. 한자는 인명용 사전에서 소리가 맞는지 시험으로 확인한다. */
export interface PoolWord {
  hangul: string;
  /** 한자어면 한자 (없으면 순우리말) */
  hanja?: string;
  meaning: string;
  feel: FeelingKey[];
}

export const BUSINESS_POOL: PoolWord[] = [
  // 한자어
  { hangul: "대성", hanja: "大成", meaning: "크게 이룸", feel: ["rich", "premium"] },
  { hangul: "창성", hanja: "昌盛", meaning: "날로 번창함", feel: ["rich"] },
  { hangul: "번영", hanja: "繁榮", meaning: "번성하고 영화로움", feel: ["rich"] },
  { hangul: "형통", hanja: "亨通", meaning: "모든 일이 뜻대로 풀림", feel: ["rich", "bright"] },
  { hangul: "융성", hanja: "隆盛", meaning: "기운차게 일어남", feel: ["rich"] },
  { hangul: "만복", hanja: "萬福", meaning: "온갖 복", feel: ["rich", "warm"] },
  { hangul: "다복", hanja: "多福", meaning: "복이 많음", feel: ["rich", "warm"] },
  { hangul: "길상", hanja: "吉祥", meaning: "좋은 일의 조짐", feel: ["bright", "tradition"] },
  { hangul: "태평", hanja: "泰平", meaning: "크고 평안함", feel: ["tradition", "warm"] },
  { hangul: "화평", hanja: "和平", meaning: "화목하고 평안함", feel: ["warm"] },
  { hangul: "화목", hanja: "和睦", meaning: "서로 뜻이 맞고 정다움", feel: ["warm"] },
  { hangul: "정담", hanja: "情談", meaning: "정답게 나누는 이야기", feel: ["warm"] },
  { hangul: "미담", hanja: "美談", meaning: "아름다운 이야기", feel: ["warm", "bright"] },
  { hangul: "청담", hanja: "淸談", meaning: "맑고 깨끗한 이야기", feel: ["premium", "nature"] },
  { hangul: "진심", hanja: "眞心", meaning: "참된 마음", feel: ["trust", "warm"] },
  { hangul: "정성", hanja: "精誠", meaning: "온 마음을 다함", feel: ["warm", "trust"] },
  { hangul: "성실", hanja: "誠實", meaning: "정성스럽고 참됨", feel: ["trust"] },
  { hangul: "신뢰", hanja: "信賴", meaning: "믿고 맡김", feel: ["trust"] },
  { hangul: "정직", hanja: "正直", meaning: "바르고 곧음", feel: ["trust"] },
  { hangul: "신화", hanja: "信和", meaning: "믿음과 화합", feel: ["trust", "warm"] },
  { hangul: "명가", hanja: "名家", meaning: "이름난 집", feel: ["premium", "tradition"] },
  { hangul: "일품", hanja: "一品", meaning: "가장 뛰어남", feel: ["premium"] },
  { hangul: "명품", hanja: "名品", meaning: "이름난 물건", feel: ["premium"] },
  { hangul: "제일", hanja: "第一", meaning: "첫째, 으뜸", feel: ["premium"] },
  { hangul: "백년", hanja: "百年", meaning: "백 년을 이어 감", feel: ["tradition"] },
  { hangul: "천년", hanja: "千年", meaning: "천 년을 이어 감", feel: ["tradition"] },
  { hangul: "장수", hanja: "長壽", meaning: "오래 삶", feel: ["tradition", "nature"] },
  { hangul: "수복", hanja: "壽福", meaning: "오래 살고 복을 누림", feel: ["tradition", "rich"] },
  { hangul: "서광", hanja: "曙光", meaning: "새벽빛, 희망의 조짐", feel: ["bright", "young"] },
  { hangul: "여명", hanja: "黎明", meaning: "새벽 밝을 무렵", feel: ["bright", "young"] },
  { hangul: "명성", hanja: "明星", meaning: "밝은 별", feel: ["bright", "premium"] },
  { hangul: "광명", hanja: "光明", meaning: "밝은 빛", feel: ["bright"] },
  { hangul: "태양", hanja: "太陽", meaning: "해", feel: ["bright", "young"] },
  { hangul: "상생", hanja: "相生", meaning: "서로 살림", feel: ["warm", "trust"] },
  { hangul: "동행", hanja: "同行", meaning: "함께 길을 감", feel: ["warm", "trust"] },
  { hangul: "안락", hanja: "安樂", meaning: "편안하고 즐거움", feel: ["warm"] },
  { hangul: "풍년", hanja: "豐年", meaning: "넉넉한 해", feel: ["rich", "nature"] },
  { hangul: "풍성", hanja: "豐盛", meaning: "넉넉하고 성함", feel: ["rich"] },
  { hangul: "청록", hanja: "靑綠", meaning: "푸른 초록", feel: ["nature", "young"] },
  { hangul: "송림", hanja: "松林", meaning: "소나무 숲", feel: ["nature", "tradition"] },
  { hangul: "산수", hanja: "山水", meaning: "산과 물, 자연", feel: ["nature", "tradition"] },
  { hangul: "해원", hanja: "海原", meaning: "넓은 바다", feel: ["nature", "young"] },
  { hangul: "금강", hanja: "金剛", meaning: "단단하고 굳셈", feel: ["trust", "premium"] },
  { hangul: "한결", meaning: "처음과 같이 한결같음", feel: ["trust", "tradition"] },
  // 순우리말
  { hangul: "다온", meaning: "좋은 일이 다 온다", feel: ["bright", "rich", "young"] },
  { hangul: "가온", meaning: "세상의 가운데", feel: ["premium", "young"] },
  { hangul: "해솔", meaning: "해와 소나무처럼 밝고 푸름", feel: ["nature", "bright"] },
  { hangul: "미르", meaning: "용(龍)의 옛말", feel: ["premium", "tradition"] },
  { hangul: "늘봄", meaning: "늘 봄처럼", feel: ["warm", "young"] },
  { hangul: "다솜", meaning: "사랑의 옛말", feel: ["warm"] },
  { hangul: "마루", meaning: "꼭대기, 으뜸", feel: ["premium"] },
  { hangul: "단비", meaning: "꼭 필요할 때 오는 비", feel: ["warm", "nature"] },
  { hangul: "해밀", meaning: "비 갠 뒤 맑은 하늘", feel: ["bright", "young"] },
  { hangul: "라온", meaning: "즐거운", feel: ["young", "bright"] },
  { hangul: "나래", meaning: "날개", feel: ["young"] },
  { hangul: "도담", meaning: "야무지고 탐스러움", feel: ["warm", "young"] },
  { hangul: "가람", meaning: "강의 옛말", feel: ["nature", "tradition"] },
  { hangul: "윤슬", meaning: "햇빛에 반짝이는 잔물결", feel: ["premium", "nature"] },
  { hangul: "소담", meaning: "탐스럽고 소박함", feel: ["warm", "nature"] },
  { hangul: "으뜸", meaning: "첫째, 가장 좋은 것", feel: ["premium", "trust"] },
  { hangul: "한빛", meaning: "큰 빛", feel: ["bright"] },
  { hangul: "새봄", meaning: "새로 맞는 봄", feel: ["young", "bright"] },
  { hangul: "온새미", meaning: "언제나 변함없이", feel: ["trust", "tradition"] },
  { hangul: "해오름", meaning: "해가 떠오름", feel: ["bright", "young"] },
  { hangul: "아름", meaning: "두 팔로 안는 넉넉함", feel: ["warm", "rich"] },
  { hangul: "별하", meaning: "별과 하늘", feel: ["bright", "young"] },
  { hangul: "노을", meaning: "해 질 녘 붉은 하늘", feel: ["warm", "nature"] },
  { hangul: "모람", meaning: "모두 함께", feel: ["warm", "trust"] },
  { hangul: "벼리", meaning: "일의 뼈대, 중심", feel: ["trust", "tradition"] },
];

export interface BusinessCandidate {
  hangul: string;
  hanja: string | null;
  meaning: string;
  english: string;
  reading: BusinessReading;
  /** 어디서 왔는지: 엔진 재료(pool) / AI 제안(ai) */
  from: "pool" | "ai";
  story: string;
}

/** 후보 하나의 점수 (높을수록 좋음) - 풀이 점수 + 고른 느낌 */
export function candidateScore(r: BusinessReading, feel: FeelingKey[], wantFeel: FeelingKey[]): number {
  let s = r.score * 3;
  if (r.industry) s += r.industry.helps * 1.5 - r.industry.hurts * 2;
  if (r.supports) s += r.supports.length * 2;
  s += feel.filter((f) => wantFeel.includes(f)).length * 3;
  return s;
}

/** 후보로 쓸 수 있는지 (거르는 기준): 소리 부딪힘 1곳 이하, 한자면 총획 길수, 업종을 2글자 이상 누르지 않음 */
export function acceptable(r: BusinessReading): boolean {
  if (r.sound.clashes > 1) return false;
  if (r.suri && !r.suri.lucky) return false;
  if (r.industry && r.industry.hurts >= 2) return false;
  return r.chars.length >= 2 && r.chars.length <= 4;
}

/** 엔진 재료만으로 후보를 고른다 (AI가 없을 때도 이것만으로 충분히 나온다) */
export function poolCandidates(industry: Industry, needed: ElementKo[], wantFeel: FeelingKey[], exclude: string[], dict: NameHanjaDict): Array<{ word: PoolWord; reading: BusinessReading; score: number }> {
  const ex = new Set(exclude);
  return BUSINESS_POOL.filter((w) => !ex.has(w.hangul))
    .map((w) => {
      const reading = readBusinessName(w.hangul, w.hanja ?? null, industry, needed, dict)!;
      return { word: w, reading, score: candidateScore(reading, w.feel, wantFeel) };
    })
    .filter((x) => x.reading && acceptable(x.reading))
    .sort((a, b) => b.score - a.score);
}

/** 기본 이야기 (AI가 없거나 실패했을 때) */
export function templateBusinessStory(c: { hangul: string; hanja: string | null; meaning: string; reading: BusinessReading }): string {
  const r = c.reading;
  const parts: string[] = [];
  parts.push(`'${c.hangul}'${c.hanja ? `(${c.hanja})` : ""}은 "${c.meaning}"이라는 뜻을 담은 이름이에요.`);
  if (r.industry) {
    if (r.industry.first === "생") parts.push(`첫소리가 ${r.industry.label}의 ${r.industry.element} 기운을 낳아 주어 일이 술술 풀리는 소리예요.`);
    else if (r.industry.first === "같음") parts.push(`첫소리가 ${r.industry.label}의 ${r.industry.element} 기운과 같아 업종의 힘을 북돋아요.`);
    else parts.push(`소리의 기운이 ${r.industry.label}의 ${r.industry.element} 기운과 크게 부딪히지 않아요.`);
  }
  if (r.supports && r.supports.length > 0) parts.push(`대표님 사주에 아쉬운 ${r.supports.join("·")}의 기운을 소리와 글자로 채워 드려요.`);
  if (r.suri?.lucky) parts.push(`한자 총획 ${r.totalStrokes}획은 길한 수예요.`);
  parts.push(r.sound.clashes === 0 ? "글자와 글자 사이 소리가 부딪힘 없이 이어져 부르기에도 편해요." : "부르기 쉽고 기억에 남는 이름이에요.");
  return parts.join(" ");
}

export const ELEMENTS_ORDER = ELEMENT_ORDER;
