import type { ElementKo } from "@/lib/pillarView";
import { ELEMENT_ORDER, elementRelation, isLuckySuri, normalizeSuri, soundElement, type NameHanjaDict, type SuriGrid } from "@/lib/nameReading";

/**
 * 작명·개명 추천 (2026-10-12 수정안 46) - AI 없이 규칙으로 이름 후보를 고른다.
 *
 *  1. 이름 소리: 요즘 많이 쓰는 두 글자 이름 목록(성별)에서 고른다 - 소리만으로 낯선 이름이 나오지 않게.
 *  2. 한자: 그 소리의 인명용 한자 중 자주 쓰이고 뜻이 좋은 글자 (사전 순서 = 흔히 쓰는 순서), 뜻이 궂은 글자는 뺀다.
 *  3. 거르기: 수리 4격(원·형·이·정)이 모두 길수일 것, 성 → 이름 소리 오행이 두 번 부딪히지 않을 것.
 *  4. 점수: 자원오행이 사주의 부족한 기운을 채우는지(가장 큰 점수), 그 기운을 낳는 기운인지, 음양 고루, 소리 흐름, 흔한 한자.
 *  5. 돌림자가 있으면 그 자리에 고정한다.
 * 이 풀이는 전해 오는 작명 이론에 따른 참고용이다 (학파마다 획수·기준이 조금씩 다를 수 있음).
 */

/** 한글 소리 → [한자, 뜻풀이] 목록 (public/hanja/dict.json, 흔히 쓰는 순서) */
export type MeaningDict = Record<string, Array<[string, string]>>;

export type Gender = "male" | "female";

/** 요즘·예전에 두루 쓰는 두 글자 이름 소리 (표시·조합용, 사주 계산과 무관) */
const NAMES: Record<Gender, string[]> = {
  male: [
    "민준", "서준", "도윤", "예준", "시우", "하준", "주원", "지호", "지후", "준우", "준서", "건우", "도현", "현우", "지훈",
    "우진", "선우", "서진", "민재", "연우", "유준", "정우", "승우", "승현", "시윤", "준혁", "은우", "지환", "승민", "지우",
    "유찬", "윤우", "민성", "준영", "시후", "진우", "지원", "수현", "재윤", "시현", "동현", "태윤", "민우", "재원", "한결",
    "민호", "윤호", "이준", "은찬", "하율", "태민", "지한", "도하", "은호", "지율", "준호", "성민", "재민", "영민", "현준",
    "재현", "상현", "민혁", "성훈", "정민", "경민", "태현", "준성", "성준", "동욱", "승준", "태훈", "도훈", "재훈", "민석",
    "상우", "주호", "성현", "윤재", "규민", "현수", "태준", "준희", "건희", "우현", "시원", "지성", "민규", "형준", "재희",
  ],
  female: [
    "서윤", "서연", "지우", "하윤", "서현", "하은", "민서", "지유", "윤서", "채원", "지민", "수아", "지아", "지윤", "다은",
    "은서", "예은", "수빈", "소율", "예린", "하린", "지원", "소윤", "지안", "시은", "채은", "예원", "유나", "가은", "윤아",
    "서아", "하율", "아린", "다인", "수민", "서영", "유진", "민지", "예서", "은채", "나윤", "시아", "소연", "채윤", "혜원",
    "하연", "예나", "서하", "이서", "주아", "나은", "지현", "수연", "유주", "세아", "연서", "아윤", "서우", "은솔", "주하",
    "해인", "수진", "은지", "현지", "미소", "예지", "가윤", "다연", "소희", "지수", "혜진", "윤희", "정원", "유경", "선영",
    "은영", "지혜", "수정", "하영", "은비", "가영", "민경", "예진", "보은", "소은", "유빈", "채아", "서진", "윤지", "연희",
  ],
};

/** 이름에 쓰기 꺼리는 뜻 (이 낱말이 뜻풀이에 들어간 한자는 뺀다) */
const BAD_MEANING =
  /죽|병들|병 |앓|아플|슬플|슬퍼|울 |울다|근심|걱정|망할|망령|잃을|흉할|악할|모질|독할|독 |귀신|도둑|훔칠|범할|간사|거짓|속일|꾸짖|원망|성낼|미워|싫어|패할|무너|떨어질|칼|피 |시체|똥|오줌|더러|미칠|어리석|천할|벌레|뱀|쥐|여우|돼지|개 |짐승|가난|굶|주릴|늙을|외로울|홀로|고아|과부|이별|헤어질|버릴|끊을|부술|깨질|상할|다칠|형벌|감옥|가둘|묶을|노예|종 |첩|창녀|음란|술 |취할|노름|싸울|다툴|전쟁|군사|죄|벌할|어두울|그늘|막힐|그칠|마칠|끝날|짧을|작을|낮을|모자랄|부족|비뚤|굽을|게으를|느릴|어지러울|어려울|괴로울|고생|수고|번거로울|약할|여윌|마를|시들|늦을|쉴|잠잘|꿈|헛|빌|빈 |없을|아닐|말 물|말 이을|어조사|성씨|姓|땅이름|나라이름|사람이름|산이름|물이름|고을이름|벼슬이름|풀이름|나무이름|새이름|물고기|同字|略字|本字|俗字|와 同/;

/** 이름에 흔히 쓰는 한자 (소리별, 자주 쓰는 순서) - 사전의 낯선 글자가 후보로 나오지 않게 이 목록을 먼저 쓴다 */
const CURATED: Record<string, string> = {
  가: "佳嘉可珂伽", 건: "建健乾鍵", 결: "潔結", 경: "京慶敬景炅卿璟瓊", 규: "圭奎珪揆規", 나: "娜那奈", 다: "多茶",
  도: "道度都燾到", 동: "東同棟桐", 린: "璘麟潾", 미: "美薇媄渼微", 민: "民旻玟珉敏旼", 보: "寶保甫普輔", 비: "妃斐菲",
  빈: "彬斌嬪贇濱", 상: "尙相祥常湘", 서: "瑞曙序敍舒", 석: "錫碩奭晳石", 선: "善宣鮮璿瑄先", 성: "成星誠晟聖性盛城",
  세: "世細歲勢", 소: "素昭韶炤笑", 솔: "率", 수: "秀洙守修壽琇樹粹", 승: "承昇勝乘丞", 시: "時是始詩施",
  아: "雅娥兒亞妸", 안: "安晏岸", 연: "延姸然衍娟硏燕蓮沇", 영: "英榮永映暎瑛泳煐玲寧", 예: "藝禮睿叡譽豫芮",
  우: "宇祐佑雨友優瑀", 욱: "旭昱煜郁頊", 원: "元原源媛瑗苑遠沅圓", 유: "裕有維柔侑宥瑜唯惟", 윤: "允潤胤鈗玧昀閏",
  율: "律栗", 은: "恩銀誾垠珢殷", 이: "利伊怡頤珥", 인: "仁寅印認", 재: "在才材載宰哉梓", 정: "正貞晶廷庭禎炡定政靜姃",
  주: "周柱珠宙朱住姝", 준: "俊準浚駿峻晙埈竣濬", 지: "智志知祉芝枝址池旨至", 진: "珍眞振鎭辰晉進津", 찬: "燦讚贊澯璨",
  채: "采彩綵埰", 태: "泰太台兌", 하: "夏河荷昰廈霞", 한: "漢翰韓瀚", 해: "海解楷諧", 혁: "赫爀奕", 현: "賢玄炫鉉現顯弦晛峴",
  형: "亨炯瀅衡馨", 혜: "惠慧蕙", 호: "浩昊鎬皓晧豪澔祜", 환: "煥桓奐歡", 후: "厚後候侯", 훈: "勳訓熏薰", 희: "熙喜姬禧希熹曦",
};

export interface NamingChar {
  hangul: string;
  hanja: string;
  meaning: string;
  strokes: number;
  element: ElementKo | "";
}

export interface NamingCandidate {
  hangul: string;
  hanja: string;
  chars: NamingChar[];
  suri: SuriGrid[];
  yinYangBalanced: boolean;
  soundFlow: Array<ReturnType<typeof elementRelation>>;
  /** 이름 한자 중 부족한 기운을 채우는 글자 수 */
  fills: number;
  score: number;
}

export interface NamingInput {
  surname: string;
  surnameHanja: string;
  gender: Gender;
  needed: ElementKo[];
  /** 돌림자: 한글 한 글자 + 한자 한 글자 + 자리(1 = 이름 첫 글자, 2 = 끝 글자) */
  dollim?: { hangul: string; hanja: string; position: 1 | 2 } | null;
  /** 빼야 할 이름(한글) - 다시 추천받을 때 이전 후보·지금 이름 */
  exclude?: string[];
  count: number;
}

const SURI_MEANING: Record<SuriGrid["name"], string> = {
  원격: "어린 시절과 바탕",
  형격: "청년기와 사회생활",
  이격: "중년의 대인관계와 가정",
  정격: "평생의 큰 흐름과 말년",
};

/** 사전 뜻풀이가 어긋난 글자 바로잡기 */
const HUN_FIX: Record<string, string> = { 姸: "고울", 城: "재", 峻: "높을", 晛: "햇살", 昰: "여름", 潤: "윤택할", 洙: "물가", 渼: "물결무늬", 瀞: "맑을", 潾: "맑을", 漢: "한수", 澔: "넓을", 浩: "넓을", 泳: "헤엄칠" };

/** "밝을 명" → "밝을" (뜻풀이에서 끝의 소리를 뗀다) */
export function hunOf(meaning: string, sound: string): string {
  const t = meaning.trim();
  return t.endsWith(` ${sound}`) ? t.slice(0, -sound.length - 1).trim() : t;
}

function mother(e: ElementKo): ElementKo {
  // e를 낳는 기운 (상생에서 한 칸 앞)
  return ELEMENT_ORDER[(ELEMENT_ORDER.indexOf(e) + 4) % 5];
}

function killer(e: ElementKo): ElementKo {
  // e를 누르는 기운 (상극)
  return ELEMENT_ORDER[(ELEMENT_ORDER.indexOf(e) + 3) % 5];
}

/** 한 소리에 쓸 만한 한자 후보 (흔한 순서로 최대 limit개) */
export function goodHanjaFor(sound: string, meanings: MeaningDict, names: NameHanjaDict, limit = 10, wide = false): NamingChar[] {
  const out: NamingChar[] = [];
  const list = meanings[sound] ?? [];
  const curated = CURATED[sound];
  if (curated && !wide) {
    for (const h of curated) {
      const e = names[h];
      if (!e || !e[2].includes(sound)) continue;
      const m = list.find(([x]) => x === h)?.[1] ?? "";
      out.push({ hangul: sound, hanja: h, meaning: HUN_FIX[h] ?? (hunOf(m, sound) || h), strokes: e[0], element: (e[1] || "") as ElementKo | "" });
    }
    return out.slice(0, limit);
  }
  // 넓혀 찾기: 흔히 쓰는 글자 다음으로 사전의 뜻 좋은 글자
  if (curated) out.push(...goodHanjaFor(sound, meanings, names, limit, false));
  for (const [h, m] of list) {
    const e = names[h];
    if (!e || !e[1] || !e[2].includes(sound) || out.some((x) => x.hanja === h)) continue;
    const hun = hunOf(m, sound);
    if (!hun || BAD_MEANING.test(` ${hun} `)) continue;
    out.push({ hangul: sound, hanja: h, meaning: hun, strokes: e[0], element: e[1] as ElementKo });
    if (out.length >= limit + (curated ? 8 : 0)) break;
  }
  return out;
}

export function suriOf(surnameStrokes: number, given: number[]): SuriGrid[] {
  const givenSum = given.reduce((a, b) => a + b, 0);
  const values: Record<SuriGrid["name"], number> = {
    원격: givenSum,
    형격: surnameStrokes + given[0],
    이격: given.length === 1 ? surnameStrokes : surnameStrokes + givenSum - given[0],
    정격: surnameStrokes + givenSum,
  };
  return (["원격", "형격", "이격", "정격"] as const).map((name) => ({
    name,
    meaning: SURI_MEANING[name],
    value: normalizeSuri(values[name]),
    lucky: isLuckySuri(values[name]),
  }));
}

/** 성 한자의 원획 합 (두 글자 성 포함). 사전에 없으면 null */
export function surnameStrokes(surnameHanja: string, names: NameHanjaDict): number | null {
  const cs = [...surnameHanja];
  let s = 0;
  for (const c of cs) {
    const e = names[c];
    if (!e) return null;
    s += e[0];
  }
  return s;
}

export function recommendNames(input: NamingInput, meanings: MeaningDict, names: NameHanjaDict): NamingCandidate[] {
  const first = recommendOnce(input, meanings, names, false);
  if (first.length >= input.count) return first;
  // 돌림자·다시 추천으로 후보가 모자라면 덜 흔한 한자까지 넓혀 채운다 (흔한 글자 후보가 앞에)
  const more = recommendOnce({ ...input, exclude: [...(input.exclude ?? []), ...first.map((c) => c.hangul)], count: input.count - first.length }, meanings, names, true);
  return [...first, ...more];
}

function recommendOnce(input: NamingInput, meanings: MeaningDict, names: NameHanjaDict, wide: boolean): NamingCandidate[] {
  const S = surnameStrokes(input.surnameHanja, names);
  if (S === null) return [];
  const surnameSounds = [...input.surname];
  const lastSurname = surnameSounds[surnameSounds.length - 1];
  const sStrokes = [...input.surnameHanja].map((c) => names[c][0]);
  const exclude = new Set(input.exclude ?? []);
  const need = new Set(input.needed);
  const helpers = new Set(input.needed.map(mother));
  const hurts = new Set(input.needed.map(killer));

  // 소리 목록: 돌림자가 있으면 그 자리에 그 소리가 오는 이름 + 목록 이름의 나머지 글자와 돌림자를 엮은 이름
  let sounds = NAMES[input.gender];
  const d = input.dollim;
  if (d) {
    const others = new Set<string>();
    for (const n of [...NAMES.male, ...NAMES.female]) others.add(d.position === 1 ? n[1] : n[0]);
    for (const n of NAMES[input.gender]) others.add(d.position === 1 ? n[1] : n[0]);
    sounds = [...others].map((o) => (d.position === 1 ? d.hangul + o : o + d.hangul));
  }

  const cache = new Map<string, NamingChar[]>();
  const pool = (s: string) => {
    if (!cache.has(s)) cache.set(s, goodHanjaFor(s, meanings, names, 10, wide));
    return cache.get(s)!;
  };
  const dollimChar = (): NamingChar | null => {
    if (!d) return null;
    const e = names[d.hanja];
    if (!e) return null;
    const m = (meanings[d.hangul] ?? []).find(([h]) => h === d.hanja)?.[1] ?? "";
    return { hangul: d.hangul, hanja: d.hanja, meaning: HUN_FIX[d.hanja] ?? hunOf(m, d.hangul), strokes: e[0], element: (e[1] || "") as ElementKo | "" };
  };
  const fixed = dollimChar();
  if (d && !fixed) return [];

  const best = new Map<string, NamingCandidate>();
  for (const name of sounds) {
    if ([...name].length !== 2 || exclude.has(name)) continue;
    const [a, b] = [...name];
    if (a === lastSurname || a === b) continue; // 김김·윤윤 같은 소리 겹침
    const firsts = d && d.position === 1 ? [fixed!] : pool(a);
    const seconds = d && d.position === 2 ? [fixed!] : pool(b);
    // 소리 오행 흐름 (성 마지막 소리 → 이름 첫 소리 → 끝 소리)
    const se = [soundElement(lastSurname), soundElement(a), soundElement(b)];
    const flow = [0, 1].map((i) => (se[i] && se[i + 1] ? elementRelation(se[i]!, se[i + 1]!) : "같음"));
    const clashes = flow.filter((f) => f === "극" || f === "눌림").length;
    if (clashes >= 2) continue;
    firsts.forEach((c1, i1) => {
      seconds.forEach((c2, i2) => {
        if (c1.hanja === c2.hanja) return;
        const suri = suriOf(S, [c1.strokes, c2.strokes]);
        const luckyCount = suri.filter((s) => s.lucky).length;
        // 네 격 모두 길수가 원칙. 돌림자 때문에 한 격이 어긋날 수밖에 없을 때만 셋까지 허용한다 (뒤에서 거른다)
        if (luckyCount < 3) return;
        const yy = [...sStrokes, c1.strokes, c2.strokes].map((n) => n % 2);
        const yinYangBalanced = yy.includes(0) && yy.includes(1);
        const els = [c1.element, c2.element];
        const fills = els.filter((e) => e && need.has(e as ElementKo)).length;
        let score = fills * 6 + (luckyCount === 4 ? 20 : 0);
        score += els.filter((e) => e && helpers.has(e as ElementKo)).length * 2;
        score -= els.filter((e) => e && hurts.has(e as ElementKo)).length * 3;
        score += yinYangBalanced ? 2 : 0;
        score += clashes === 0 ? 2 : 0;
        score -= (i1 + i2) * 0.15; // 흔한 한자일수록 조금 더
        if (fills === 0) return; // 부족한 기운을 한 글자도 채우지 못하면 추천하지 않는다
        const cand: NamingCandidate = {
          hangul: name,
          hanja: c1.hanja + c2.hanja,
          chars: [c1, c2],
          suri,
          yinYangBalanced,
          soundFlow: flow,
          fills,
          score,
        };
        const prev = best.get(name);
        if (!prev || prev.score < score) best.set(name, cand);
      });
    });
  }

  // 점수 순, 같은 첫 소리가 두 번을 넘지 않게 고루. 네 격이 모두 길한 이름이 있으면 그것만 쓴다
  const all4 = [...best.values()].filter((c) => c.suri.every((s) => s.lucky));
  const ranked = d ? [...best.values()] : all4;
  const sorted = ranked.sort((x, y) => y.score - x.score || x.hangul.localeCompare(y.hangul));
  const out: NamingCandidate[] = [];
  const firstCount = new Map<string, number>();
  for (const c of sorted) {
    const f = [...c.hangul][d?.position === 1 ? 1 : 0];
    if ((firstCount.get(f) ?? 0) >= 2) continue;
    firstCount.set(f, (firstCount.get(f) ?? 0) + 1);
    out.push(c);
    if (out.length >= input.count) break;
  }
  return out;
}

/** 후보 이름 이야기 - AI 없이 쓰는 기본 문장 (AI가 실패해도 이 문장이 들어간다) */
export function templateStory(c: NamingCandidate, needed: ElementKo[]): string {
  const [x, y] = c.chars;
  const fillEl = c.chars.filter((ch) => ch.element && needed.includes(ch.element as ElementKo)).map((ch) => `${ch.hanja}(${ch.element})`);
  return `${x.hanja}(${x.meaning} ${x.hangul}) · ${y.hanja}(${y.meaning} ${y.hangul}) — '${x.meaning}', '${y.meaning}'의 뜻을 함께 품은 이름이에요. ${
    fillEl.length ? `${fillEl.join("·")} 글자가 사주에서 아쉬운 ${needed.join("·")}의 기운을 채워 주고, ` : ""
  }${c.suri.every((s) => s.lucky) ? "수리 네 격이 모두 길한 수로 이어져" : "수리 네 격 가운데 셋이 길한 수라"} ${c.yinYangBalanced ? "음양도 고루 갖췄어요" : "흐름이 단정해요"}.`;
}
