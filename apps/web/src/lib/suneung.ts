import type { SajuJson } from "saju-engine";
import { determineTenGod, STEM_POLARITY } from "saju-engine/dist/src/rules/tenGodTables";
import { STEM_ELEMENT } from "saju-engine/dist/src/rules/fiveElementTables";
import { BRANCH_HANJA, STEM_HANJA, type ElementKo } from "@/lib/pillarView";
import { ELEMENT_HANJA, ELEMENT_NATURE, kstDateString } from "@/lib/manseView";
import { sajuFacts, TEN_GOD_GROUP } from "@/lib/sajuFacts";
import { relationOf, type Branch, type Relation } from "@/lib/tti";
import type { TenGodGroup } from "@/lib/journey";
import { DAY_MASTER, FILL, GROUP_LABEL } from "@/lib/basic/common";

/**
 * 수능대박운 (2026-10-17 수정안 17) - 시즌에 따라 이름과 내용이 바뀐다 (자동으로 내리지 않고 이어 간다).
 *   수능대박운: 수능 날(2026-11-19)까지
 *   합격운:     11/20 ~ 2월 말 (정시 원서·면접·발표를 기다리는 때)
 *   새 출발운:  3월부터 (새 학기·새 출발)
 *
 * 가볍게 보기(990냥)는 AI 없이 엔진 값으로 문장을 골라 엮는다. 깊게 보기(4,900냥)는 이 사실을 근거로 AI가 쓴다.
 * 말투: 단정하지 않고 응원한다. 결과(합격·불합격)를 점치지 않는다.
 */

/** 2027학년도 수능 (목) - 해마다 이 줄만 바꾼다 */
export const EXAM_DATE = "2026-11-19";
/** 합격운이 끝나고 새 출발운으로 바뀌는 날 */
export const PASS_END = "2027-02-28";
/** 시험날 일진 (엔진 calculateDailyGanzhi("2026-11-19") = 정유) - 시험에서 엔진 값과 같은지 확인한다 */
export const EXAM_DAY = { stem: "정", branch: "유" } as const;

export type ExamSeason = "suneung" | "pass" | "start";

export const SEASON_INFO: Record<ExamSeason, { title: string; short: string; hanja: string; blurb: string }> = {
  suneung: { title: "수능대박운", short: "수능대박운", hanja: "試", blurb: "시험날 나의 기운과 행운 꾸러미" },
  pass: { title: "합격운", short: "합격운", hanja: "榜", blurb: "원서·면접·발표까지 나의 흐름" },
  start: { title: "새 출발운", short: "새 출발운", hanja: "始", blurb: "새 학기, 새 자리에서 나의 흐름" },
};

export function examSeason(today: string = kstDateString()): ExamSeason {
  if (today <= EXAM_DATE) return "suneung";
  if (today <= PASS_END) return "pass";
  return "start";
}

/** 수능까지 남은 날 (당일 0, 지나면 null) */
export function examDday(today: string = kstDateString()): number | null {
  const [y, m, d] = today.split("-").map(Number);
  const [ey, em, ed] = EXAM_DATE.split("-").map(Number);
  const diff = Math.round((Date.UTC(ey, em - 1, ed) - Date.UTC(y, m - 1, d)) / 86400000);
  return diff >= 0 ? diff : null;
}

/** 엽전 장부·잠금에 쓰는 이름: exam_suneung / exam_suneung_deep … (시즌마다 따로 산다) */
export function examUnlockTopic(season: ExamSeason, deep: boolean): string {
  return `exam_${season}${deep ? "_deep" : ""}`;
}

// ───────────────────────── 문장 창고 ─────────────────────────

/** 일간 10가지 - 공부 체질 */
const STUDY: Record<string, string> = {
  갑: "큰 나무처럼 목표를 하나 세우면 곧게 밀고 가는 공부 체질이에요. 계획표를 크게 그려 두고 하루하루 지워 나갈 때 힘이 나요. 다만 한 과목에 꽂히면 다른 과목을 놓치기 쉬우니, 과목을 고르게 돌려 주세요.",
  을: "덩굴처럼 유연하게 길을 찾는 공부 체질이에요. 한 가지 방법이 막히면 다른 방법으로 돌아가는 재주가 있어요. 함께 공부하는 친구가 있을 때 더 오래 버티는 편이라, 혼자 지칠 땐 스터디 메이트를 곁에 두세요.",
  병: "태양처럼 한번 불붙으면 몰아서 해내는 공부 체질이에요. 컨디션이 좋은 날 집중력이 남달라요. 대신 기분에 따라 들쑥날쑥하기 쉬우니, 마지막 달에는 '조금씩 매일'을 지켜 주세요.",
  정: "등불처럼 조용히 오래 타는 공부 체질이에요. 남들이 모르게 꾸준히 쌓아 온 것이 시험날 빛을 봐요. 걱정이 많아질 때는 지금까지 해 온 것을 적어 보면 마음이 가라앉아요.",
  무: "큰 산처럼 묵직하게 버티는 공부 체질이에요. 한번 앉으면 오래 앉아 있는 힘이 있어요. 다만 새로운 유형 앞에서 멈칫하기 쉬우니, 마지막엔 낯선 문제를 일부러 몇 개씩 풀어 두세요.",
  기: "논밭처럼 차곡차곡 기르는 공부 체질이에요. 정리 노트와 오답 노트가 가장 큰 무기예요. 꼼꼼한 만큼 시간 배분이 늦어지기 쉬우니, 시계를 보며 푸는 연습을 해 두세요.",
  경: "무쇠처럼 결단이 빠른 공부 체질이에요. 아는 문제는 빠르고 정확하게 끝내요. 대신 헷갈리는 문제에서 고집을 부리기 쉬우니, '넘기고 돌아오기'를 약속처럼 지켜 주세요.",
  신: "보석처럼 섬세하게 다듬는 공부 체질이에요. 작은 실수를 찾아내는 눈이 밝아요. 완벽하려는 마음이 긴장을 키우기 쉬우니, 시험장에서는 '80점의 확신으로 넘어가기'를 기억하세요.",
  임: "큰 강처럼 넓게 흐르는 공부 체질이에요. 전체 흐름을 잡는 힘이 좋아 개념을 이어 붙이는 데 강해요. 범위가 넓어 산만해지기 쉬우니, 마지막엔 자주 틀리는 것만 추려 보세요.",
  계: "단비처럼 스며드는 공부 체질이에요. 조용한 곳에서 집중이 깊어지고 직관이 맑아요. 남과 비교하면 흔들리기 쉬우니, 내 속도를 믿고 가세요.",
};

/** 시험날(丁火 일진)이 나에게 어떤 기운인지 - 십신 묶음 */
const EXAM_DAY_GROUP: Record<TenGodGroup, string> = {
  비겁: "시험날 하늘의 기운이 {이름}님과 같은 결로 들어와요. 내 편이 곁에 선 듯 마음이 든든한 날이에요. 다만 남의 속도에 휩쓸리기 쉬우니, 쉬는 시간에 답을 맞춰 보는 대화는 피하고 내 리듬을 지켜 주세요.",
  식상: "시험날 하늘의 기운이 {이름}님의 재능과 표현을 밖으로 꺼내 주는 날이에요. 머릿속에 든 것이 술술 풀려 나오기 좋아요. 손이 빨라지는 만큼, 마킹과 마지막 확인을 한 번 더 챙겨 주세요.",
  재성: "시험날 하늘의 기운이 {이름}님에게 '실속'으로 들어와요. 해 온 만큼 차곡차곡 점수로 거둬들이기 좋은 날이에요. 어려운 문제에 욕심내기보다, 맞힐 수 있는 문제를 확실히 챙기는 쪽이 이 날의 기운과 맞아요.",
  관성: "시험날 하늘의 기운이 {이름}님에게 '책임과 긴장'으로 들어와요. 적당한 긴장은 집중으로 바뀌는 날이에요. 첫 교시 시작 전에 깊게 세 번 숨을 쉬면, 이 긴장이 바른 집중으로 자리 잡아요.",
  인성: "시험날 하늘의 기운이 {이름}님을 도와주는 '배움과 도움'으로 들어와요. 공부해 둔 것이 떠오르고 마음이 차분해지기 좋은 날이에요. 아는 것을 믿고, 처음 고른 답을 쉽게 바꾸지 마세요.",
};

/** 시험날 일진 지지(酉)와 나의 일지 - 관계 */
const EXAM_DAY_BRANCH: Record<Relation, string> = {
  육합: "게다가 시험날의 땅 기운(酉)이 {이름}님의 자리와 손을 잡는 육합이에요. 시험장 분위기가 낯설지 않고 편안하게 느껴지기 쉬워요.",
  삼합: "게다가 시험날의 땅 기운(酉)이 {이름}님의 자리와 한 팀을 이루는 삼합이에요. 주변의 응원과 기운이 모여드는 날이에요.",
  "같은 띠": "시험날의 땅 기운(酉)이 {이름}님의 자리와 같은 글자예요. 익숙한 기운이라 평소 실력 그대로를 내기 좋아요.",
  평: "시험날의 땅 기운(酉)은 {이름}님의 자리와 부딪치지도 묶이지도 않아요. 평소처럼 담담하게 치르기 좋은 날이에요.",
  해: "시험날의 땅 기운(酉)이 {이름}님의 자리와 살짝 어긋나요. 작은 신경 쓰임(소음·자리)에 마음을 뺏기지 않도록, 귀마개 연습을 미리 해 두면 좋아요.",
  파: "시험날의 땅 기운(酉)이 {이름}님의 자리를 살짝 흔들어요. 준비물은 전날 밤에 두 번 확인해 두면, 그 흔들림이 아무 일 없이 지나가요.",
  형: "시험날의 땅 기운(酉)과 {이름}님의 자리 사이에 조이는 기운이 있어요. 아침을 서두르지 않게 일찍 일어나 여유를 두면 좋아요.",
  충: "시험날의 땅 기운(酉)이 {이름}님의 자리와 부딪치는 충이에요. 충은 나쁜 것이 아니라 '움직임'이에요. 평소보다 몸이 들뜨기 쉬우니, 따뜻한 물 한 잔과 천천히 걷기로 마음을 가라앉혀 주세요.",
};

/** 일간 오행 - 집중 리듬 */
const RHYTHM: Record<ElementKo, string> = {
  목: "나무의 기운은 아침에 힘이 오르는 기운이에요. 1교시 국어 시간과 결이 잘 맞아요. 남은 날 동안 아침 8시 40분에 국어 한 세트를 푸는 습관을 들이면, 시험날 아침이 한결 가벼워져요.",
  화: "불의 기운은 오전 늦게부터 한낮까지 가장 밝게 타는 기운이에요. 2교시 수학 시간이 {이름}님의 집중이 가장 잘 오르는 때예요. 대신 점심 뒤에 기운이 꺼지기 쉬우니, 점심은 가볍게 드세요.",
  토: "흙의 기운은 흔들림 없이 오래 버티는 기운이에요. 오후 교시까지 집중이 고르게 이어지는 편이에요. 하루 시간표를 실제 수능 시간표대로 맞춰 '한 번 끝까지 앉아 보기'를 꼭 해 두세요.",
  금: "쇠의 기운은 오후에서 저녁으로 갈수록 날카로워지는 기운이에요. 3·4교시(영어·탐구)에서 힘을 내기 좋아요. 아침 집중을 끌어올리려면 일어나자마자 찬물로 세수하고 가볍게 몸을 풀어 주세요.",
  수: "물의 기운은 밤에 깊어지는 기운이에요. 밤공부가 잘되는 체질이지만, 남은 날은 잠자는 시간을 조금씩 당겨 아침 리듬으로 옮겨 주세요. 시험날 아침에 머리가 맑아야 이 기운이 제 힘을 내요.",
};

/** 시험날 기운 이름 (십신 묶음을 수험생 말로) */
const EXAM_GROUP_WORD: Record<TenGodGroup, string> = {
  비겁: "든든한 내 편의 기운",
  식상: "실력이 술술 풀려 나오는 기운",
  재성: "해 온 만큼 거둬들이는 기운",
  관성: "바른 긴장과 집중의 기운",
  인성: "배움과 도움의 기운",
};

/** 가장 두드러진 십신 - 마음 한 줄 */
const MIND: Record<TenGodGroup, string> = {
  비겁: "남과 비교하지 않기. 오늘의 상대는 어제의 나예요.",
  식상: "아는 것을 다 쓰고 나오기. 머릿속에 든 것은 반드시 길을 찾아 나와요.",
  재성: "맞힐 수 있는 것부터 확실하게. 차곡차곡이 가장 큰 힘이에요.",
  관성: "긴장은 내가 잘하고 싶다는 증거예요. 숨 한 번이면 집중이 돼요.",
  인성: "지금까지 해 온 나를 믿기. 처음 떠오른 답이 대개 맞아요.",
};

/** 합격운 시즌 - 가장 두드러진 십신으로 본 "기다리는 동안" */
const PASS_GROUP: Record<TenGodGroup, string> = {
  비겁: "{이름}님은 스스로 길을 정할 때 힘이 나는 사주예요. 원서를 쓸 때 남의 말보다 내 기준(가고 싶은 학과·생활)을 먼저 적어 두면 흔들리지 않아요. 같은 처지의 친구와 정보를 나누되, 결정은 내가 하세요.",
  식상: "{이름}님은 말과 표현으로 나를 보여 줄 때 빛나는 사주예요. 면접이나 실기가 있다면 오히려 기회가 되는 흐름이에요. 하고 싶은 말을 세 줄로 정리해 소리 내어 연습해 두세요.",
  재성: "{이름}님은 현실 감각이 좋은 사주예요. 점수와 경쟁률을 차분히 따져 '안정·적정·도전'을 고르게 나누는 데 강해요. 표를 만들어 한눈에 비교하면 마음이 정리돼요.",
  관성: "{이름}님은 원칙과 책임감이 강한 사주예요. 마감·서류·준비물을 빈틈없이 챙기는 힘이 있어요. 기다림이 길게 느껴질 땐, 하루 일정을 정해 두고 생활 리듬을 지키면 마음이 편해요.",
  인성: "{이름}님은 도움과 배움이 들어오는 사주예요. 선생님·선배의 조언이 원서 고르기에 큰 길잡이가 돼요. 혼자 고민하지 말고 꼭 한 번 상담을 받아 보세요.",
};

/** 새 출발운 시즌 */
const START_GROUP: Record<TenGodGroup, string> = {
  비겁: "새 자리에서 {이름}님은 금방 내 사람을 만드는 흐름이에요. 첫 한 달은 동아리·모임 하나에 꾸준히 나가 보세요. 그곳에서 오래갈 벗을 만나기 쉬워요.",
  식상: "새 자리에서 {이름}님의 재능이 드러나는 흐름이에요. 발표·과제·동아리에서 먼저 손을 들면 이름이 알려져요. 다만 일을 너무 많이 벌이지 않게 하나씩 골라 주세요.",
  재성: "새 자리에서 {이름}님은 실속을 챙기는 흐름이에요. 아르바이트·장학금·용돈 관리 같은 현실의 일이 잘 풀려요. 첫 학기에 돈 쓰는 습관을 잘 잡아 두면 좋아요.",
  관성: "새 자리에서 {이름}님은 책임 있는 역할을 맡기 쉬운 흐름이에요. 과대표·조장 같은 자리가 들어오면 해 볼 만해요. 규칙적인 생활이 이 기운을 살려 줘요.",
  인성: "새 자리에서 {이름}님은 좋은 스승과 선배를 만나는 흐름이에요. 궁금한 것은 망설이지 말고 물어보세요. 첫 학기의 배움이 앞으로 몇 년의 바탕이 돼요.",
};

/** 시험장(면접장·새 자리) 행운 꾸러미 - 부족한 기운 */
const KIT_OBJECT: Record<ElementKo, { pocket: string; snack: string }> = {
  목: { pocket: "초록색 펜이나 연필", snack: "바나나 같은 부드러운 과일" },
  화: { pocket: "빨간 손수건이나 붉은빛 필통", snack: "따뜻한 차 한 병" },
  토: { pocket: "노란 포스트잇이나 황토빛 필통", snack: "고구마나 단호박 같은 든든한 간식" },
  금: { pocket: "은색 시계(아날로그)나 흰 손수건", snack: "배나 사과 같은 하얀 속살 과일" },
  수: { pocket: "검정·남색 볼펜이나 투명 물병", snack: "미지근한 물 (자주, 조금씩)" },
};

// ───────────────────────── 엮기 ─────────────────────────

export interface ExamKit {
  element: ElementKo;
  hanja: string;
  nature: string;
  colors: string;
  numbers: string;
  direction: string;
  pocket: string;
  snack: string;
}

export interface ExamReading {
  season: ExamSeason;
  title: string;
  dday: number | null;
  examDay: { ganzhi: string; hanja: string; group: TenGodGroup; relation: Relation } | null;
  summary: string;
  sections: Array<{ heading: string; body: string }>;
  kit: ExamKit;
  mind: string;
  /** 깊게 보기에서 다룰 내용 (흐리게 미리 보여 줌) */
  deeper: string[];
}

const fill = (s: string, name: string) => s.replace(/\{이름\}/g, name);

export const EXAM_DEEP_POINTS: Record<ExamSeason, string[]> = {
  suneung: ["남은 날 과목별 공부 리듬", "시험날 교시마다 기운의 흐름", "긴장이 올라올 때 나에게 맞는 처방", "시험 뒤 원서 고를 때 나에게 맞는 방향", "꼭 채워야 할 하나"],
  pass: ["원서 고를 때 나에게 맞는 방향", "면접·실기에서 나를 보여 주는 법", "기다리는 동안 마음 다스리기", "올해 하반기까지의 흐름", "꼭 채워야 할 하나"],
  start: ["새 자리에서 나의 강점", "사람과 관계를 넓히는 법", "공부·일의 방향 잡기", "올 한 해 달마다 흐름", "꼭 채워야 할 하나"],
};

export function composeExam(saju: SajuJson, nickname: string, today: string = kstDateString()): ExamReading {
  const season = examSeason(today);
  const f = sajuFacts(saju, today);
  const dm = DAY_MASTER[f.dayStem];
  const need = f.needed.elements[0];
  const F = FILL[need];
  const obj = KIT_OBJECT[need];
  const kit: ExamKit = { element: need, hanja: ELEMENT_HANJA[need], nature: ELEMENT_NATURE[need], colors: F.colors, numbers: F.numbers, direction: F.direction, pocket: obj.pocket, snack: obj.snack };
  const study = STUDY[f.dayStem] ?? "";
  const kitLine = `${f.needed.reason === "lacking" ? "사주에 비어 있는" : "사주에서 가장 약한"} ${need}(${ELEMENT_HANJA[need]})의 기운을 곁에 두면 마음이 한결 단단해져요. 색은 ${F.colors}, 숫자는 ${F.numbers}, 방위는 ${F.direction}이에요. 주머니 속에는 ${obj.pocket}, 쉬는 시간 간식으로는 ${obj.snack} 어떠세요?`;

  let examDay: ExamReading["examDay"] = null;
  const sections: Array<{ heading: string; body: string }> = [];
  let summary: string;

  if (season === "suneung") {
    const tg = determineTenGod(STEM_ELEMENT[f.dayStem], STEM_POLARITY[f.dayStem], STEM_ELEMENT[EXAM_DAY.stem], STEM_POLARITY[EXAM_DAY.stem]);
    const group = TEN_GOD_GROUP[tg];
    const relation = relationOf(saju.pillars.day.earthlyBranch as Branch, EXAM_DAY.branch);
    examDay = { ganzhi: `${EXAM_DAY.stem}${EXAM_DAY.branch}`, hanja: `${STEM_HANJA[EXAM_DAY.stem]}${BRANCH_HANJA[EXAM_DAY.branch]}`, group, relation };
    summary = `${dm.image} 같은 {이름}님, 11월 19일은 ${EXAM_GROUP_WORD[group]}이 들어오는 날이에요`;
    sections.push(
      { heading: "나의 공부 체질", body: `${dm.core.split(". ")[0]}. ${study}` },
      { heading: `시험날 11월 19일, 정유(丁酉)일의 기운`, body: `${EXAM_DAY_GROUP[group]} ${EXAM_DAY_BRANCH[relation]}` },
      { heading: "남은 날, 나에게 맞는 공부 리듬", body: RHYTHM[f.dayElement] },
      { heading: "시험장 행운 꾸러미", body: kitLine }
    );
  } else if (season === "pass") {
    summary = `${dm.image} 같은 {이름}님, 원서·면접·발표까지 ${GROUP_LABEL[f.strongest].keyword}의 힘으로 가요`;
    sections.push(
      { heading: "나의 바탕", body: `${dm.core.split(". ")[0]}. ${study.split(". ")[0]}.` },
      { heading: "원서·면접·발표까지, 나의 흐름", body: `${PASS_GROUP[f.strongest]} ${f.seun.year}년 겨울은 ${f.seun.ganzhi}(${f.seun.hanja})년의 끝자락이에요. 결과를 기다리는 동안에도 몸과 생활의 리듬을 지키면, 다음 걸음이 한결 가벼워요.` },
      { heading: "면접장·실기장 행운 꾸러미", body: kitLine }
    );
  } else {
    summary = `${dm.image} 같은 {이름}님, 새 자리의 열쇠는 ${GROUP_LABEL[f.strongest].keyword}이에요`;
    sections.push(
      { heading: "나의 바탕", body: `${dm.core}` },
      { heading: "새 자리에서 나의 흐름", body: START_GROUP[f.strongest] },
      { heading: "새 출발 행운 꾸러미", body: kitLine.replace("마음이 한결 단단해져요", "새 자리에 빨리 뿌리내려요").replace(`쉬는 시간 간식으로는 ${obj.snack} 어떠세요?`, `책상 위에는 ${F.object}, 가까이 두어 보세요.`) }
    );
  }

  return {
    season,
    title: SEASON_INFO[season].title,
    dday: season === "suneung" ? examDday(today) : null,
    examDay,
    summary: fill(summary, nickname),
    sections: sections.map((s) => ({ heading: s.heading, body: fill(s.body, nickname) })),
    kit,
    mind: MIND[f.strongest],
    deeper: EXAM_DEEP_POINTS[season],
  };
}

/** 깊게 보기 AI에 넘길 확정 사실 (목록에 있는 근거만 쓰게 한다) */
export function examFactsForPrompt(saju: SajuJson, today: string = kstDateString()): string {
  const r = composeExam(saju, "{이름}", today);
  const f = sajuFacts(saju, today);
  const lines = [
    `- 시즌: ${r.title}${r.dday !== null ? ` (수능까지 ${r.dday}일, 수능 ${EXAM_DATE})` : ""}`,
    `- 일간: ${f.dayStem}(${f.dayStemHanja}) ${f.dayElement}`,
    `- 가장 두드러진 십신 묶음: ${f.strongest} (${GROUP_LABEL[f.strongest].keyword})`,
    `- 가장 약한 십신 묶음: ${f.weakestGroup}`,
    `- 부족한 오행: ${f.needed.elements.join("·")} (${f.needed.reason === "lacking" ? "비어 있음" : "가장 약함"})`,
    `- 올해 세운: ${f.seun.ganzhi}(${f.seun.hanja}) ${f.seun.group}`,
    f.currentDaeun ? `- 지금 대운: ${f.currentDaeun.ganzhi}(${f.currentDaeun.hanja}) ${f.currentDaeun.group}` : "",
    r.examDay ? `- 시험날 일진: ${r.examDay.ganzhi}(${r.examDay.hanja}) → 나에게 ${r.examDay.group}, 일지와 ${r.examDay.relation}` : "",
    `- 행운 꾸러미: 색 ${r.kit.colors} / 숫자 ${r.kit.numbers} / 방위 ${r.kit.direction} / ${r.kit.pocket} / ${r.kit.snack}`,
  ];
  return lines.filter(Boolean).join("\n");
}
