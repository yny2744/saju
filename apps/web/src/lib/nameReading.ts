import type { ElementKo } from "@/lib/pillarView";

/**
 * 무료 이름 풀이 (2026-10-08 수정안 11번) - AI 없이 표와 규칙으로만 계산한다.
 *
 *  1. 수리(원·형·이·정 4격): 성과 이름 한자의 원획(작명 획수)을 더해 81수리로 길흉을 본다.
 *  2. 음양: 글자마다 원획이 홀수면 양, 짝수면 음. 한쪽으로 치우치지 않아야 좋다.
 *  3. 발음오행: 한글 첫소리로 본 오행의 흐름 (통용 기준: ㄱㅋ목 · ㄴㄷㄹㅌ화 · ㅇㅎ토 · ㅅㅈㅊ금 · ㅁㅂㅍ수).
 *  4. 자원오행: 한자 부수가 나타내는 오행이 사주에 필요한 기운을 채워 주는지.
 *
 * 자료: public/hanja/name-hanja.json (유니코드 Unihan 기반, scripts/build-name-hanja.py 참고).
 * 이 풀이는 전해 오는 작명 이론에 따른 참고용이다. 학파에 따라 획수·기준이 조금씩 다를 수 있다.
 */

/** 글자 → [원획, 자원오행("" = 부수만으로 정하기 어려움), 한글음 목록] */
export type NameHanjaDict = Record<string, [number, string, string[]]>;

export const ELEMENT_ORDER: ElementKo[] = ["목", "화", "토", "금", "수"];

/** 81수리 중 전해 오는 분류에서 길한 수 */
const LUCKY = new Set([1, 3, 5, 6, 7, 8, 11, 13, 15, 16, 17, 18, 21, 23, 24, 25, 29, 31, 32, 33, 35, 37, 38, 39, 41, 45, 47, 48, 52, 57, 61, 63, 65, 67, 68, 81]);

/** 81을 넘는 수는 80을 빼서 본다 */
export function normalizeSuri(n: number): number {
  let v = n;
  while (v > 81) v -= 80;
  return v;
}

export function isLuckySuri(n: number): boolean {
  return LUCKY.has(normalizeSuri(n));
}

/** 두 글자 이상 성 (이름 첫 두 글자가 여기 있으면 성을 두 글자로 본다) */
const DOUBLE_SURNAMES = new Set(["남궁", "황보", "제갈", "사공", "선우", "서문", "독고", "동방", "어금", "망절", "소봉", "장곡"]);

export function splitName(hangul: string): { surname: string; given: string } | null {
  const s = [...hangul.trim()].filter((c) => /[가-힣]/.test(c)).join("");
  if (s.length < 2) return null;
  if (s.length >= 3 && DOUBLE_SURNAMES.has(s.slice(0, 2))) return { surname: s.slice(0, 2), given: s.slice(2) };
  return { surname: s.slice(0, 1), given: s.slice(1) };
}

const CHOSEONG = ["ㄱ", "ㄲ", "ㄴ", "ㄷ", "ㄸ", "ㄹ", "ㅁ", "ㅂ", "ㅃ", "ㅅ", "ㅆ", "ㅇ", "ㅈ", "ㅉ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"];
const SOUND_ELEMENT: Record<string, ElementKo> = {
  ㄱ: "목", ㄲ: "목", ㅋ: "목",
  ㄴ: "화", ㄷ: "화", ㄸ: "화", ㄹ: "화", ㅌ: "화",
  ㅇ: "토", ㅎ: "토",
  ㅅ: "금", ㅆ: "금", ㅈ: "금", ㅉ: "금", ㅊ: "금",
  ㅁ: "수", ㅂ: "수", ㅃ: "수", ㅍ: "수",
};

export function soundElement(syllable: string): ElementKo | null {
  const code = syllable.charCodeAt(0) - 0xac00;
  if (code < 0 || code > 11171) return null;
  return SOUND_ELEMENT[CHOSEONG[Math.floor(code / 588)]] ?? null;
}

/** a가 b를 낳으면(상생) "생", 이기면(상극) "극", 같으면 "같음" */
export function elementRelation(a: ElementKo, b: ElementKo): "생" | "극" | "같음" | "받음" | "눌림" {
  const i = ELEMENT_ORDER.indexOf(a);
  const j = ELEMENT_ORDER.indexOf(b);
  if (i === j) return "같음";
  if ((i + 1) % 5 === j) return "생"; // a → b 상생
  if ((j + 1) % 5 === i) return "받음"; // b → a 상생
  if ((i + 2) % 5 === j) return "극"; // a가 b를 극
  return "눌림"; // b가 a를 극
}

export interface SuriGrid {
  name: "원격" | "형격" | "이격" | "정격";
  meaning: string;
  value: number;
  lucky: boolean;
}

export interface NameReadingResult {
  surname: string;
  given: string;
  chars: Array<{ hangul: string; hanja: string | null; strokes: number | null; element: string; yinYang: "양" | "음" | null }>;
  /** 한자가 모두 있어 수리를 계산했는지 */
  complete: boolean;
  suri: SuriGrid[];
  yinYangBalanced: boolean | null;
  sound: { elements: Array<ElementKo | null>; flow: Array<"생" | "극" | "같음" | "받음" | "눌림">; clashes: number };
  /** 이름 한자가 가진 자원오행 중 사주에 필요한 기운 */
  supports: ElementKo[];
  /** 자원오행을 정할 수 없는 글자 수 */
  unknownElements: number;
  verdict: "good" | "fair" | "weak";
}

const SURI_MEANING: Record<SuriGrid["name"], string> = {
  원격: "어린 시절과 바탕 (이름 글자의 합)",
  형격: "청년기와 사회생활 (성 + 이름 첫 글자)",
  이격: "중년의 대인관계와 가정 (성 + 이름 끝 글자)",
  정격: "평생의 큰 흐름과 말년 (전체 합)",
};

/**
 * @param hangulName 한글 이름 (예: 유남영)
 * @param hanjaName  고른 한자 이름 (예: 柳南榮, 한자를 모르는 글자는 한글로 섞여 있을 수 있음)
 * @param needed     사주에 필요한 오행 (neededEnergy 결과)
 */
export function readName(hangulName: string, hanjaName: string | undefined, needed: ElementKo[], dict: NameHanjaDict): NameReadingResult | null {
  const split = splitName(hangulName);
  if (!split) return null;
  const syllables = [...split.surname, ...split.given];
  const hanjaChars = hanjaName ? [...hanjaName.trim()] : [];
  const sameLength = hanjaChars.length === syllables.length;

  const chars = syllables.map((h, i) => {
    const c = sameLength ? hanjaChars[i] : undefined;
    const entry = c && /\p{Script=Han}/u.test(c) ? dict[c] : undefined;
    const strokes = entry ? entry[0] : null;
    return {
      hangul: h,
      hanja: entry ? c! : null,
      strokes,
      element: entry ? entry[1] : "",
      yinYang: strokes === null ? null : strokes % 2 === 1 ? ("양" as const) : ("음" as const),
    };
  });

  const complete = chars.every((c) => c.strokes !== null);
  const sLen = split.surname.length;
  const S = chars.slice(0, sLen).reduce((a, c) => a + (c.strokes ?? 0), 0);
  const g = chars.slice(sLen).map((c) => c.strokes ?? 0);

  let suri: SuriGrid[] = [];
  if (complete && g.length >= 1) {
    const givenSum = g.reduce((a, b) => a + b, 0);
    const first = g[0];
    const restSum = givenSum - first;
    // 외자 이름은 이격을 성의 획수로 본다 (통용 방식)
    const values: Record<SuriGrid["name"], number> = {
      원격: givenSum,
      형격: S + first,
      이격: g.length === 1 ? S : S + restSum,
      정격: S + givenSum,
    };
    suri = (["원격", "형격", "이격", "정격"] as const).map((name) => ({
      name,
      meaning: SURI_MEANING[name],
      value: normalizeSuri(values[name]),
      lucky: isLuckySuri(values[name]),
    }));
  }

  const yy = chars.map((c) => c.yinYang).filter((x): x is "양" | "음" => x !== null);
  const yinYangBalanced = complete ? yy.includes("양") && yy.includes("음") : null;

  const soundEls = syllables.map(soundElement);
  const flow: NameReadingResult["sound"]["flow"] = [];
  for (let i = 0; i + 1 < soundEls.length; i++) {
    const a = soundEls[i];
    const b = soundEls[i + 1];
    if (a && b) flow.push(elementRelation(a, b));
  }
  const clashes = flow.filter((f) => f === "극" || f === "눌림").length;

  const nameEls = new Set(chars.slice(sLen).map((c) => c.element).filter(Boolean));
  const supports = needed.filter((e) => nameEls.has(e));
  const unknownElements = chars.slice(sLen).filter((c) => c.hanja && !c.element).length;

  // 종합: 수리 길한 격 수 + 음양 + 발음 흐름 + 사주 보완
  let score = 0;
  if (complete) {
    const luckyCount = suri.filter((s) => s.lucky).length;
    score += luckyCount >= 4 ? 2 : luckyCount >= 3 ? 1 : 0;
    if (yinYangBalanced) score += 1;
  }
  if (clashes === 0) score += 1;
  if (supports.length > 0) score += 1;
  const verdict: NameReadingResult["verdict"] = !complete ? (clashes === 0 ? "fair" : "weak") : score >= 4 ? "good" : score >= 2 ? "fair" : "weak";

  return { surname: split.surname, given: split.given, chars, complete, suri, yinYangBalanced, sound: { elements: soundEls, flow, clashes }, supports, unknownElements, verdict };
}
