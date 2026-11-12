import type { SajuJson } from "saju-engine";
import { NAME_TOKEN } from "@/server/readings/generateReading";
import { kstDateString } from "@/lib/manseView";
import { examFactsForPrompt } from "@/lib/suneung";
import { EXAM_QUALITY_RULES } from "./exam";

/**
 * 수능 심층분석 2~4 (2026-11-12 유샘 확정 상품명·부제) - 풀이 지시문.
 *   계산은 엔진(examFactsForPrompt), 해석은 AI. 근거로 볼 값은 일반 명리 이론으로 지니가 잡은 초안이며 유샘 검수 전이다.
 *   결제 상품은 아직 붙이지 않았다 (관리자 시험 화면에서만 쓴다).
 */

export type ExamExtraKey = "exam_goal" | "exam_focus" | "exam_calm";

export const EXAM_EXTRA: Record<ExamExtraKey, { title: string; points: string[]; basis: string[]; rules: string[] }> = {
  exam_goal: {
    title: "목표 성취운",
    points: ["목표 달성을 위한 사주적 흐름", "노력에 따른 성과와 결실의 가능성", "바라는 목표와 타고난 기질의 조화", "수능까지 남은 날의 목표 점검법"],
    basis: [
      "관성(정관·편관): 목표·자리·책임을 받아들이는 힘",
      "재성(정재·편재): 노력이 결과물로 맺히는 자리",
      "식상(식신·상관): 실행하고 표현하는 힘",
      "일간의 강약과 지금 대운·올해 세운의 흐름",
    ],
    rules: [
      "합격·불합격, 점수, 등급, 대학 이름을 점치거나 단정하지 마세요. '결실의 가능성'은 노력이 어떤 길로 열매가 되는지(방법·시기·습관)로만 쓰세요.",
      "특정 대학·학과를 추천하지 마세요. 기질에 맞는 목표 세우는 방식만 말하세요.",
    ],
  },
  exam_focus: {
    title: "집중과 몰입운",
    points: ["타고난 집중력과 학습 능력", "몰입을 높이는 환경과 학습 방식", "집중을 방해하는 요소와 극복 방향", "나에게 맞는 하루 공부 시간표"],
    basis: [
      "인성(정인·편인): 받아들이고 이해하고 기억하는 힘",
      "식신: 한 가지를 꾸준히 파고드는 몰입",
      "비겁(비견·겁재): 버티는 힘과 경쟁심",
      "오행의 치우침(많은 기운·남은 작은 빈자리)과 일간의 강약",
    ],
    rules: ["공부 시간·장소·방식은 누구나 바로 해 볼 수 있는 구체적인 행동으로 쓰세요.", "주의력 장애 같은 의학·심리 진단처럼 들리는 말은 쓰지 마세요."],
  },
  exam_calm: {
    title: "시험 컨디션 안정운",
    points: ["긴장과 불안에 대처하는 심리적 성향", "시험 전후 체력과 컨디션 변화", "예상치 못한 상황에 대한 대처와 안정 방향", "시험 전날과 당일 아침 루틴"],
    basis: [
      "관성(특히 편관): 압박을 느끼는 방식과 일간이 그것을 견디는 힘",
      "인성: 마음을 가라앉히고 다시 중심을 잡는 힘",
      "시험날 일진과 원국 사이의 합·충 (확정 사실에 있을 때만)",
      "오행 균형 - 몸의 리듬은 오행 상징(예: 수=휴식·잠, 화=활력)으로만 말하기",
    ],
    rules: [
      "질병·증상·약·진단을 말하지 마세요. 의학 조언이 아니라 생활 리듬(잠, 식사, 쉬는 법, 호흡)으로만 쓰세요.",
      "불안을 키우는 말(위험, 사고, 실수할 수 있다 등)은 쓰지 말고, 미리 준비하면 든든해진다는 말투로 쓰세요.",
    ],
  },
};

export function isExamExtraKey(v: unknown): v is ExamExtraKey {
  return typeof v === "string" && v in EXAM_EXTRA;
}

export function buildExamExtraPrompt(saju: SajuJson, key: ExamExtraKey, today: string = kstDateString()): string {
  const p = EXAM_EXTRA[key];
  return `# 확정 사실 (계산 엔진이 판정까지 끝낸 값 - 근거는 이 목록에서만 가져오세요)
${examFactsForPrompt(saju, today)}

# 요청: 수능 심층분석 - ${p.title}

이 풀이는 수험생 본인이나 수험생의 부모님이 읽습니다. 수험생을 "${NAME_TOKEN}님"이라고 부르세요. "${NAME_TOKEN}"은 실제 이름 대신 쓰는 표시이니 중괄호까지 글자 그대로 쓰세요.
아래 내용을 소제목 하나씩 깊이 있게 풀이하세요.
${p.points.map((x) => `- ${x}`).join("\n")}

이 상품에서 근거로 삼을 값 (위 확정 사실에 있는 것만 쓰고, 없으면 지어내지 마세요):
${p.basis.map((x) => `- ${x}`).join("\n")}

규칙:
- 소제목 4개, 소제목마다 700~900자, 전체 2,800~3,600자.
- 합격·불합격이나 점수를 점치거나 단정하지 마세요. "붙는다/떨어진다" 같은 말은 쓰지 마세요. 응원하고, 할 수 있는 행동으로 말하세요.
${p.rules.map((x) => `- ${x}`).join("\n")}
- 소제목마다 위 [확정 사실] 중 근거를 하나 이상 짚으세요. 목록에 없는 합·충·대운 이름은 쓰지 마세요.
- 마지막 소제목은 앞의 풀이를 바탕으로 바로 따라 할 수 있는 실천표처럼 써 주세요 (시간·순서·횟수가 보이게).
- 행운 꾸러미(색·숫자·방위·물건)는 "수능대박운 심층분석"이 다루니 이 풀이에서는 쓰지 마세요. 다른 상품과 겹치지 않게 이 상품의 주제에만 집중하세요.
- "부족한"·"모자란"·"결핍" 같은 말 대신 "남은 작은 빈자리"라고 쓰세요.
${EXAM_QUALITY_RULES}
- summary: 맨 위에 놓을 두 문장 응원 요약.

JSON 형식:
{"summary":"...","parts":[{"heading":"...","body":"..."},...]}`;
}
