import type { ElementKo } from "@/lib/pillarView";
import type { TopicKey } from "@/lib/topics";
import type { FunResult } from "./types";

/**
 * 타로관 (2026-10-31 유샘 확정, AI 없음) - 메이저 카드 22장, 정방향만, 하루 한 번 한 장.
 *
 * 신뢰 원칙 (유샘): "내가 직접 골랐다"가 가장 중요하다.
 *   - 섞는 순간 22장의 순서가 정해지고(고객 기기 안에서 무작위), 고른 자리의 카드가 그대로 나온다.
 *   - 고른 뒤에는 나머지 21장도 제자리에서 모두 뒤집어 보여 준다.
 *   - 그래서 "하루 한 장 고정"처럼 결과를 미리 정해 두는 방식은 쓰지 않는다 (오늘 뽑은 결과를 기기에 저장해 다시 보여 줄 뿐).
 *
 * 카드 뜻은 서양 타로의 널리 알려진 상징을 따르고, 이름·그림은 동양풍으로 옮긴다 (그림 프롬프트: 대표 한자와 같은 순서).
 * 오행: 서양 타로의 원소·행성 대응을 오행에 견준다 - 불→화, 물→수, 흙→토, 바람→목(팔괘의 巽은 바람이자 나무),
 *   수성·달→수, 금성→금, 목성→목, 화성·해→화, 토성→토. 정의(천칭)는 저울과 검의 쇠 기운으로 금.
 * 풀이는 단정하지 않고(확정 예언 금지), 겁주지 않는다 (죽음→변화, 악마→욕망으로 순화).
 */

export type TarotQuestion = "today" | "love" | "money" | "work";

export const TAROT_QUESTIONS: Array<{ key: TarotQuestion; label: string; ask: string; topic: TopicKey }> = [
  { key: "today", label: "오늘 하루", ask: "오늘 나에게 필요한 기운은?", topic: "year" },
  { key: "love", label: "연애 · 인연", ask: "마음에 둔 인연은 어떻게 흘러갈까?", topic: "love" },
  { key: "money", label: "재물", ask: "지금 재물의 흐름은?", topic: "money" },
  { key: "work", label: "일 · 학업", ask: "지금 하는 일과 공부는?", topic: "job" },
];

export function isTarotQuestion(v: unknown): v is TarotQuestion {
  return typeof v === "string" && TAROT_QUESTIONS.some((q) => q.key === v);
}

export interface TarotCard {
  no: number;
  roman: string;
  name: string;
  hanja: string;
  element: ElementKo;
  /** 왜 그 오행인지 짧게 */
  elementWhy: string;
  keywords: string[];
  core: string;
  reading: Record<TarotQuestion, string>;
}

export const TAROT_CARDS: TarotCard[] = [
  {
    no: 0, roman: "0", name: "나그네", hanja: "旅", element: "목", elementWhy: "바람의 카드라 바람(巽)이자 나무인 목",
    keywords: ["새 출발", "자유", "가벼운 마음"],
    core: "봇짐 하나 메고 길을 나서는 나그네의 카드예요. 계산보다 마음이 먼저 움직이는 때, 새로운 시작의 문이 열려 있어요.",
    reading: {
      today: "미뤄 둔 첫걸음을 떼기 좋은 날이에요. 완벽하게 준비하지 않아도 괜찮아요.",
      love: "설렘이 앞서는 인연이에요. 가볍게 시작하되, 상대의 속도도 함께 살펴보세요.",
      money: "새로운 길이 보이지만 아직 지도가 없어요. 작게 시작해 감을 익히는 것이 좋아요.",
      work: "새 일이나 새 공부를 시작할 기운이에요. 처음의 호기심을 오래 붙잡아 두세요.",
    },
  },
  {
    no: 1, roman: "I", name: "마법사", hanja: "術", element: "수", elementWhy: "말과 재주의 별인 수성의 카드라 수",
    keywords: ["재주", "실행", "시작의 힘"],
    core: "필요한 도구를 모두 손에 쥔 도사의 카드예요. 생각을 현실로 옮길 재주와 힘이 지금 당신 안에 있어요.",
    reading: {
      today: "머릿속 계획을 하나라도 실제로 해 보는 날이에요. 손을 움직이면 길이 보여요.",
      love: "먼저 다가가면 흐름을 만들 수 있어요. 진심을 담은 한마디가 힘을 가져요.",
      money: "가진 재주가 돈이 되는 길이 열려요. 당신만의 솜씨를 드러내 보세요.",
      work: "실력을 보여 줄 기회예요. 준비해 둔 것을 자신 있게 꺼내 놓으세요.",
    },
  },
  {
    no: 2, roman: "II", name: "여사제", hanja: "秘", element: "수", elementWhy: "달의 카드라 고요한 물인 수",
    keywords: ["직관", "고요", "숨은 지혜"],
    core: "두루마리를 품고 고요히 앉은 여사제의 카드예요. 겉으로 드러난 것보다 마음 깊은 곳의 느낌이 답을 알고 있어요.",
    reading: {
      today: "서두르지 말고 조용히 살피는 날이에요. 처음 든 느낌을 믿어 보세요.",
      love: "아직 드러나지 않은 마음이 있어요. 말보다 눈빛과 분위기를 읽어 보세요.",
      money: "보이지 않는 정보가 있어요. 확인되기 전까지는 크게 움직이지 않는 것이 좋아요.",
      work: "혼자 깊이 공부하고 정리하기 좋은 때예요. 쌓아 둔 지식이 곧 힘이 돼요.",
    },
  },
  {
    no: 3, roman: "III", name: "여황제", hanja: "后", element: "금", elementWhy: "사랑과 풍요의 별인 금성의 카드라 금",
    keywords: ["풍요", "사랑", "결실"],
    core: "꽃과 곡식이 무성한 정원의 여황제 카드예요. 정성 들여 가꾼 것이 넉넉하게 열매 맺는 흐름이에요.",
    reading: {
      today: "나를 아끼고 잘 먹고 잘 쉬는 것이 운을 키우는 날이에요.",
      love: "따뜻하고 넉넉한 사랑의 기운이에요. 표현할수록 관계가 깊어져요.",
      money: "꾸준히 가꾼 것이 불어나는 흐름이에요. 씨앗을 심어 두기 좋은 때예요.",
      work: "결과물이 풍성해지는 때예요. 함께하는 사람들을 잘 챙기면 더 크게 자라요.",
    },
  },
  {
    no: 4, roman: "IV", name: "황제", hanja: "帝", element: "화", elementWhy: "불의 별자리인 양자리의 카드라 화",
    keywords: ["안정", "책임", "질서"],
    core: "옥좌에 앉아 홀을 쥔 왕의 카드예요. 흔들리지 않는 기준과 책임감으로 상황을 이끌 때예요.",
    reading: {
      today: "할 일을 순서대로 정리하고 하나씩 해내는 날이에요. 계획이 힘이 돼요.",
      love: "믿음직한 모습이 마음을 얻어요. 다만 이끄는 것과 정하는 것은 달라요, 상대 뜻도 물어보세요.",
      money: "원칙을 세우고 지키면 재물이 단단해져요. 즉흥적인 지출은 줄여 보세요.",
      work: "책임을 맡고 이끌 기회예요. 기준을 분명히 하면 사람들이 따라와요.",
    },
  },
  {
    no: 5, roman: "V", name: "스승", hanja: "師", element: "토", elementWhy: "흙의 별자리인 황소자리의 카드라 토",
    keywords: ["가르침", "전통", "조언"],
    core: "서당에서 제자들에게 가르침을 전하는 스승의 카드예요. 검증된 길과 믿을 만한 조언이 도움이 되는 때예요.",
    reading: {
      today: "경험 많은 사람의 한마디가 길잡이가 되는 날이에요. 귀 기울여 보세요.",
      love: "진지하고 믿음 있는 관계로 나아가는 흐름이에요. 가족이나 주변의 축복도 함께해요.",
      money: "안전하고 검증된 방법이 맞는 때예요. 전문가의 조언을 먼저 들어 보세요.",
      work: "배우고 익히기 좋은 때예요. 좋은 스승이나 선배를 가까이 두세요.",
    },
  },
  {
    no: 6, roman: "VI", name: "연인", hanja: "緣", element: "목", elementWhy: "바람의 별자리인 쌍둥이자리의 카드라 목",
    keywords: ["인연", "선택", "조화"],
    core: "붉은 실로 이어진 두 사람의 카드예요. 마음이 통하는 인연, 그리고 진심으로 고르는 선택을 뜻해요.",
    reading: {
      today: "마음이 가는 쪽을 따라가도 좋은 날이에요. 좋은 사람과 함께하는 시간이 운이 돼요.",
      love: "서로 끌리는 기운이 강한 카드예요. 솔직한 마음을 나누면 인연이 깊어져요.",
      money: "함께하는 사람과 손잡을 때 길이 열려요. 다만 마음이 아닌 조건도 꼼꼼히 보세요.",
      work: "갈림길에서 고를 때예요. 내가 정말 좋아하는 쪽이 오래 가는 길이에요.",
    },
  },
  {
    no: 7, roman: "VII", name: "전차", hanja: "車", element: "수", elementWhy: "물의 별자리인 게자리의 카드라 수",
    keywords: ["전진", "의지", "승리"],
    core: "두 마리 말이 끄는 수레를 모는 장수의 카드예요. 흩어진 힘을 한 방향으로 모으면 앞으로 힘차게 나아가요.",
    reading: {
      today: "망설이던 일을 밀고 나가기 좋은 날이에요. 목표 하나에 힘을 모으세요.",
      love: "적극적으로 다가갈수록 흐름이 빨라져요. 다만 상대의 마음도 함께 태우고 가세요.",
      money: "목표를 정하고 꾸준히 밀고 가면 성과가 나요. 여러 곳에 힘을 나누지 마세요.",
      work: "경쟁에서 앞서 나갈 기운이에요. 마지막까지 고삐를 놓지 마세요.",
    },
  },
  {
    no: 8, roman: "VIII", name: "힘", hanja: "力", element: "화", elementWhy: "불의 별자리인 사자자리의 카드라 화",
    keywords: ["부드러운 힘", "인내", "용기"],
    core: "호랑이를 부드럽게 쓰다듬는 여인의 카드예요. 진짜 힘은 억누르는 것이 아니라 다독이고 기다리는 데서 나와요.",
    reading: {
      today: "급한 마음을 다독이면 일이 풀리는 날이에요. 부드럽게, 그러나 끝까지.",
      love: "따뜻한 인내가 마음을 열어요. 몰아붙이기보다 기다려 줄 때 더 가까워져요.",
      money: "참고 버티는 힘이 결실로 이어져요. 조급한 결정만 피하면 돼요.",
      work: "어려운 일도 차분히 다루면 해낼 수 있어요. 당신의 끈기가 가장 큰 무기예요.",
    },
  },
  {
    no: 9, roman: "IX", name: "은둔자", hanja: "隱", element: "토", elementWhy: "흙의 별자리인 처녀자리의 카드라 토",
    keywords: ["성찰", "홀로", "내면의 등불"],
    core: "눈 덮인 산길에서 등불을 든 노인의 카드예요. 잠시 물러나 혼자 생각할 때 내 안의 답이 밝아져요.",
    reading: {
      today: "혼자만의 시간을 갖기 좋은 날이에요. 조용히 정리하면 길이 보여요.",
      love: "서두르기보다 내 마음부터 들여다볼 때예요. 내가 원하는 사랑이 무엇인지 알게 돼요.",
      money: "남의 말보다 스스로 꼼꼼히 따져 볼 때예요. 서두른 판단은 미뤄 두세요.",
      work: "깊이 파고드는 공부와 연구에 좋은 때예요. 혼자 집중하는 시간이 실력이 돼요.",
    },
  },
  {
    no: 10, roman: "X", name: "운명의 수레바퀴", hanja: "輪", element: "목", elementWhy: "넓히고 키우는 별인 목성의 카드라 목",
    keywords: ["흐름의 전환", "기회", "때"],
    core: "구름 위에서 도는 커다란 수레바퀴의 카드예요. 운의 흐름이 바뀌는 때, 새로운 기회가 돌아오고 있어요.",
    reading: {
      today: "뜻밖의 좋은 소식이나 우연한 만남이 생길 수 있는 날이에요. 문을 열어 두세요.",
      love: "인연의 흐름이 바뀌는 때예요. 다시 이어지거나 새로 시작되는 기운이 있어요.",
      money: "흐름이 바뀌는 시기예요. 들어온 기회를 잡되, 오르막과 내리막이 돈다는 것도 기억하세요.",
      work: "상황이 새 국면으로 넘어가요. 변화에 맞춰 움직이면 오히려 기회가 돼요.",
    },
  },
  {
    no: 11, roman: "XI", name: "정의", hanja: "義", element: "금", elementWhy: "저울과 곧은 검을 든 카드라 쇠의 기운인 금",
    keywords: ["공정", "균형", "책임 있는 선택"],
    core: "저울과 곧은 검을 든 판관의 카드예요. 뿌린 대로 거두는 때, 공정하고 분명한 판단이 길을 열어요.",
    reading: {
      today: "미룬 결정을 공정하게 내리기 좋은 날이에요. 기준이 분명하면 마음도 가벼워져요.",
      love: "서로 주고받는 균형이 중요한 때예요. 솔직하고 공평한 대화가 관계를 지켜요.",
      money: "계약과 서류를 꼼꼼히 살필 때예요. 정직하게 쌓은 것이 제자리를 찾아요.",
      work: "노력한 만큼 평가받는 때예요. 원칙을 지키면 결과가 따라와요.",
    },
  },
  {
    no: 12, roman: "XII", name: "매달린 사람", hanja: "懸", element: "수", elementWhy: "물의 카드라 수",
    keywords: ["멈춤", "다른 시선", "기다림"],
    core: "거꾸로 매달려서도 평온한 사람의 카드예요. 잠시 멈추고 거꾸로 볼 때 지금껏 보이지 않던 답이 보여요.",
    reading: {
      today: "일이 더디게 느껴져도 괜찮은 날이에요. 보는 각도를 바꾸면 실마리가 보여요.",
      love: "잠시 기다림이 필요한 때예요. 내 입장이 아닌 상대 입장에서 바라보세요.",
      money: "지금은 크게 움직이기보다 지켜보는 편이 좋아요. 기다림도 전략이에요.",
      work: "막힌 일은 방법을 바꿔 볼 때예요. 한 걸음 물러서면 새 길이 보여요.",
    },
  },
  {
    no: 13, roman: "XIII", name: "변화", hanja: "變", element: "수", elementWhy: "물의 별자리인 전갈자리의 카드라 수",
    keywords: ["끝과 시작", "탈바꿈", "정리"],
    core: "허물을 벗고 날아오르는 나비의 카드예요. 하나가 끝나야 새것이 시작돼요. 두려워할 끝이 아니라 탈바꿈의 때예요.",
    reading: {
      today: "오래 붙잡고 있던 것을 내려놓기 좋은 날이에요. 비운 자리에 새 기운이 들어와요.",
      love: "관계가 새 모습으로 바뀌는 때예요. 지난 감정을 정리하면 더 나은 인연이 와요.",
      money: "낡은 방식을 정리하고 새로 짜는 때예요. 줄일 것을 줄이면 흐름이 살아나요.",
      work: "한 단계를 마치고 다음 단계로 넘어가요. 끝맺음을 깔끔하게 하는 것이 중요해요.",
    },
  },
  {
    no: 14, roman: "XIV", name: "절제", hanja: "和", element: "화", elementWhy: "불의 별자리인 궁수자리의 카드라 화",
    keywords: ["조화", "균형", "알맞음"],
    core: "두 잔 사이로 물을 천천히 옮겨 붓는 선녀의 카드예요. 지나치지도 모자라지도 않게, 알맞게 섞을 때 가장 좋아요.",
    reading: {
      today: "무리하지 않고 알맞게 하는 것이 운이 되는 날이에요. 쉬엄쉬엄 가도 돼요.",
      love: "서로의 다름을 맞춰 가는 때예요. 천천히 섞일수록 오래가는 관계가 돼요.",
      money: "들어오고 나가는 균형을 맞출 때예요. 무리한 욕심보다 꾸준함이 이겨요.",
      work: "일과 쉼, 혼자와 함께의 균형을 맞추면 성과가 고르게 나와요.",
    },
  },
  {
    no: 15, roman: "XV", name: "욕망", hanja: "慾", element: "토", elementWhy: "흙의 별자리인 염소자리의 카드라 토",
    keywords: ["집착", "유혹", "스스로 푸는 사슬"],
    core: "느슨한 금빛 사슬의 카드예요. 나를 묶은 것은 생각보다 헐거워서, 알아차리는 순간 스스로 풀 수 있어요.",
    reading: {
      today: "달콤한 유혹 앞에서 한 번 더 생각하는 날이에요. 알아차리면 이미 반은 이긴 거예요.",
      love: "끌림이 강하지만 집착으로 번지지 않게 살펴보세요. 서로를 자유롭게 할 때 더 깊어져요.",
      money: "충동적인 소비나 쉬운 돈의 유혹을 조심할 때예요. 욕심을 덜면 길이 보여요.",
      work: "습관처럼 붙잡고 있는 방식을 돌아볼 때예요. 나를 묶은 것을 풀면 한결 가벼워져요.",
    },
  },
  {
    no: 16, roman: "XVI", name: "탑", hanja: "塔", element: "화", elementWhy: "부수고 새로 세우는 별인 화성의 카드라 화",
    keywords: ["뜻밖의 변화", "깨달음", "다시 세움"],
    core: "번개에 꼭대기가 무너지는 석탑의 카드예요. 갑작스러운 변화가 오지만, 단단하지 않던 것을 걷어 내고 제대로 다시 세울 기회예요.",
    reading: {
      today: "계획이 틀어져도 당황하지 마세요. 오히려 더 나은 길을 알려 주는 신호일 수 있어요.",
      love: "숨어 있던 문제가 드러나는 때예요. 솔직하게 마주하면 관계가 더 단단해져요.",
      money: "예상 밖의 지출이나 변수에 대비할 때예요. 기초를 튼튼히 다시 다지세요.",
      work: "낡은 틀이 깨지는 때예요. 무너진 자리에 더 튼튼한 계획을 세우세요.",
    },
  },
  {
    no: 17, roman: "XVII", name: "별", hanja: "星", element: "목", elementWhy: "바람의 별자리인 물병자리의 카드라 목",
    keywords: ["희망", "치유", "영감"],
    core: "큰 별 아래 맑은 물을 붓는 여인의 카드예요. 지친 마음이 회복되고, 다시 꿈꿀 희망이 반짝이는 때예요.",
    reading: {
      today: "마음이 조금씩 맑아지는 날이에요. 작은 희망 하나를 소중히 품어 보세요.",
      love: "순수하고 따뜻한 인연의 기운이에요. 상처가 아물고 새 마음이 열려요.",
      money: "당장 크지 않아도 앞날이 밝은 흐름이에요. 길게 보고 꾸준히 가세요.",
      work: "좋은 생각과 영감이 떠오르는 때예요. 떠오른 아이디어를 꼭 적어 두세요.",
    },
  },
  {
    no: 18, roman: "XVIII", name: "달", hanja: "月", element: "수", elementWhy: "물의 별자리인 물고기자리의 카드라 수",
    keywords: ["불확실", "상상", "흐릿한 길"],
    core: "보름달 아래 굽이진 길의 카드예요. 아직 길이 흐릿하게 보이는 때, 겉모습보다 확인된 사실을 믿는 것이 중요해요.",
    reading: {
      today: "괜한 걱정이 커질 수 있는 날이에요. 확인되지 않은 것은 마음에서 잠시 내려놓으세요.",
      love: "상대의 마음이 아직 흐릿해요. 짐작하기보다 조금 더 지켜보세요.",
      money: "확실하지 않은 투자나 약속은 잠시 미루세요. 분명해질 때까지 기다리는 것이 좋아요.",
      work: "정보가 부족한 때예요. 한 번 더 확인하고 꼼꼼히 기록해 두세요.",
    },
  },
  {
    no: 19, roman: "XIX", name: "태양", hanja: "日", element: "화", elementWhy: "해의 카드라 화",
    keywords: ["기쁨", "성공", "밝음"],
    core: "눈부신 해 아래 말을 탄 아이의 카드예요. 숨김없이 밝고 기쁜 기운, 노력이 환하게 빛을 보는 때예요.",
    reading: {
      today: "밝은 기운이 가득한 날이에요. 하고 싶던 일을 자신 있게 시작해 보세요.",
      love: "마음을 숨기지 않고 드러낼수록 좋은 흐름이 와요. 함께라서 즐거운 인연이에요.",
      money: "노력한 만큼 결실이 눈에 보이는 시기예요. 좋은 소식을 기대해도 좋아요.",
      work: "실력이 인정받는 때예요. 자신 있게 나서면 좋은 결과가 따라와요.",
    },
  },
  {
    no: 20, roman: "XX", name: "깨어남", hanja: "覺", element: "화", elementWhy: "불의 카드라 화",
    keywords: ["부름", "되살아남", "새 결심"],
    core: "나팔 소리에 사람들이 일어나는 카드예요. 오래 잠들어 있던 꿈이 다시 깨어나고, 새 결심을 할 때예요.",
    reading: {
      today: "미뤄 둔 다짐을 다시 꺼내기 좋은 날이에요. 오늘의 결심이 오래 갑니다.",
      love: "지난 인연에서 배운 것이 빛을 보는 때예요. 다시 연락이 닿거나 새로운 마음이 생겨요.",
      money: "묵혀 둔 계획을 다시 살펴볼 때예요. 지난 경험이 좋은 판단의 밑거름이 돼요.",
      work: "기다리던 부름이나 기회가 와요. 준비된 사람에게 문이 열려요.",
    },
  },
  {
    no: 21, roman: "XXI", name: "세계", hanja: "界", element: "토", elementWhy: "마무리와 완성의 별인 토성의 카드라 토",
    keywords: ["완성", "성취", "한 바퀴"],
    core: "화환 안에서 춤추는 여인과 네 방위 신수의 카드예요. 한 바퀴를 온전히 돌아 완성에 이르는, 가장 크게 이루는 카드예요.",
    reading: {
      today: "하던 일을 마무리하기 좋은 날이에요. 끝맺음의 기쁨을 충분히 누리세요.",
      love: "관계가 무르익어 한 단계 완성되는 때예요. 오래 바라던 결실을 기대해도 좋아요.",
      money: "목표에 닿는 흐름이에요. 이룬 것을 잘 지키고 다음 목표를 세워 보세요.",
      work: "큰일을 해내고 인정받는 때예요. 다음 무대로 나아갈 준비를 하세요.",
    },
  },
];

/**
 * 그림이 준비된 카드 번호 (public/tarot/00.png ~ 21.png). 여기 없는 카드는 한자 카드로 그린다.
 * 그림을 넣으면 파일을 올리고 번호를 더한다 (그림 프롬프트: 명견만리_타로_영문프롬프트.md).
 */
export const TAROT_IMAGES: number[] = [];

/** 고른 카드를 무료 묶음 결과(사주 겹쳐 보기 화면용)로 */
export function tarotResult(no: number, question: TarotQuestion): FunResult {
  const c = TAROT_CARDS[no];
  const q = TAROT_QUESTIONS.find((x) => x.key === question)!;
  return {
    key: String(no),
    badge: c.hanja,
    short: `${c.name} 카드`,
    title: `${c.roman} · ${c.name} (${c.hanja})`,
    subtitle: `${q.label} · ${c.keywords.join(" · ")}`,
    body: [c.core, c.reading[question]],
    tags: c.keywords,
    element: c.element,
    elementNote: `${c.name} 카드는 ${c.elementWhy}의 기운이에요.`,
  };
}

/** 0~21을 고르게 섞는다 (피셔-예이츠). rand 는 [0,1) - 기기 안의 암호 난수를 넘긴다 */
export function shuffleDeck(rand: () => number): number[] {
  const deck = TAROT_CARDS.map((c) => c.no);
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

/**
 * 뽑는 방식 (2026-10-31 유샘: 고객이 고른다, 처음엔 수레바퀴).
 *   wheel 수레바퀴: 22장이 새겨진 바퀴가 돌고, 내가 멈춘 순간 금빛 화살표가 가리킨 카드
 *   pick 카드 고르기: 엎어 둔 22장 중 한 장
 *   reels 세 줄 두루마리: 과거·현재·미래 세 줄을 하나씩 멈춰 세 장
 * 어느 방식이든 섞인 순서는 기기 안 암호 난수로 정해지고, 멈추거나 고른 뒤에는 22장을 모두 보여 준다.
 */
export type TarotMode = "wheel" | "pick" | "reels";

export const TAROT_MODES: Array<{ key: TarotMode; label: string; desc: string }> = [
  { key: "wheel", label: "수레바퀴", desc: "돌아가는 바퀴를 내가 멈춰 한 장" },
  { key: "pick", label: "카드 고르기", desc: "엎어 둔 22장 중 마음 가는 한 장" },
  { key: "reels", label: "세 줄 두루마리", desc: "과거 · 현재 · 미래 세 줄을 멈춰 세 장" },
];

export function isTarotMode(v: unknown): v is TarotMode {
  return v === "wheel" || v === "pick" || v === "reels";
}

/**
 * 세 줄 두루마리: 섞인 22장을 세 줄로 나눠 담는다 (8 · 7 · 7장). 줄마다 다른 카드라 세 장이 겹치지 않고,
 * 22장이 한 번씩만 들어 있어 멈춘 뒤 줄마다 들어 있던 카드를 그대로 보여 줄 수 있다.
 * 반환값은 줄마다 deck 의 자리 번호 목록.
 */
export const REEL_SLOTS: number[][] = [
  [0, 1, 2, 3, 4, 5, 6, 7],
  [8, 9, 10, 11, 12, 13, 14],
  [15, 16, 17, 18, 19, 20, 21],
];

/**
 * 수레바퀴: 바퀴를 θ도(시계 방향) 돌렸을 때 위쪽 금빛 화살표 아래 칸.
 * 칸 i 의 가운데는 바퀴 위 i × (360/22) 도. 멈출 때는 늘 이 각도의 배수에 서므로 화면의 칸과 결과가 같다.
 */
export function slotUnderPointer(theta: number): number {
  const n = TAROT_CARDS.length;
  return ((Math.round(-theta / (360 / n)) % n) + n) % n;
}

export const SPREAD_POSITIONS = [
  { key: "past", label: "과거", lead: "지나온 시간에는" },
  { key: "present", label: "현재", lead: "지금 당신 곁에는" },
  { key: "future", label: "미래", lead: "앞으로는" },
] as const;

/** 세 장 펼치기 한 자리의 풀이 - 자리 뜻 + 카드 낱말 + (현재·미래는) 고른 질문의 풀이, (과거는) 카드 뜻 */
export function spreadLine(no: number, position: 0 | 1 | 2, question: TarotQuestion): { head: string; body: string } {
  const c = TAROT_CARDS[no];
  const pos = SPREAD_POSITIONS[position];
  const kw = c.keywords.slice(0, 2).join(" · ");
  const flow = position === 2 ? `「${kw}」의 기운이 다가와요.` : position === 1 ? `「${kw}」의 기운이 있어요.` : `「${kw}」의 기운이 흐르고 있었어요.`;
  return {
    head: `${pos.label} · ${c.name} (${c.hanja})`,
    body: `${pos.lead} ${flow} ${position === 0 ? c.core : c.reading[question]}`,
  };
}

/** 한 번 뽑은 결과는 기기에 저장한다 - 하루 한 번 (한국 날짜 기준, 방식과 상관없이 하루 한 번) */
export const TAROT_STORAGE_KEY = "ryugyeol_tarot";

export interface TarotSaved {
  /** 한국 날짜 YYYY-MM-DD */
  date: string;
  /** 뽑은 방식 - 2026-10-31 첫 판(카드 고르기만)에는 없었다 → 없으면 pick */
  mode: TarotMode;
  question: TarotQuestion;
  /** 섞인 22장 순서 (자리 → 카드 번호) */
  deck: number[];
  /** 고른 자리 (수레바퀴는 화살표가 멈춘 자리, 세 줄은 현재 줄의 자리) */
  picked: number;
  /** 세 줄 두루마리만: 과거·현재·미래 줄마다 멈춘 자리 */
  spread?: number[];
}

export function isTarotSaved(v: unknown, today: string): v is TarotSaved {
  if (typeof v !== "object" || v === null) return false;
  const s = v as Record<string, unknown>;
  if (s.date !== today || !isTarotQuestion(s.question)) return false;
  if (s.mode !== undefined && !isTarotMode(s.mode)) return false;
  if (!Array.isArray(s.deck) || s.deck.length !== TAROT_CARDS.length) return false;
  if ([...(s.deck as number[])].sort((a, b) => a - b).some((n, i) => n !== i)) return false;
  if (!(Number.isInteger(s.picked) && (s.picked as number) >= 0 && (s.picked as number) < TAROT_CARDS.length)) return false;
  if (s.mode === "reels") {
    const sp = s.spread;
    if (!Array.isArray(sp) || sp.length !== 3) return false;
    if (!sp.every((slot, i) => REEL_SLOTS[i].includes(slot as number))) return false;
    if (s.picked !== sp[1]) return false;
  }
  return true;
}

/** 저장된 값을 지금 형식으로 (첫 판 저장값에는 mode 가 없다) */
export function normalizeTarotSaved(s: TarotSaved): TarotSaved {
  return { ...s, mode: s.mode ?? "pick" };
}

export function kstToday(now: Date = new Date()): string {
  return new Date(now.getTime() + 9 * 3600 * 1000).toISOString().slice(0, 10);
}
