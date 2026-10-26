import type { ElementKo } from "@/lib/pillarView";
import type { FunResult } from "./types";

/**
 * 탄생화 · 꽃말 (2026-10-26 무료 묶음, AI 없음).
 *
 * 탄생화: 서양에서 널리 쓰는 "태어난 달의 꽃"(달마다 한 가지)을 쓴다. 날짜별(366일) 탄생화는 출처마다 달라서 쓰지 않는다.
 * 꽃말은 널리 알려진 뜻을 줄여 적고, 설명 문장은 이 사이트에서 새로 쓴 것이다.
 * 오행: 꽃의 대표 색을 오행 색(목 초록·화 빨강/분홍/보라·토 노랑·금 흰색·수 검정/남색)에 견준다.
 * "나를 채우는 꽃": 사주에 부족한 오행의 색과 성질을 가진, 집에서 곁에 두기 쉬운 꽃.
 */

interface MonthFlower {
  name: string;
  meaning: string;
  color: string;
  element: ElementKo;
  body: string[];
}

const MONTH: Record<number, MonthFlower> = {
  1: { name: "카네이션", meaning: "사랑 · 존경", color: "붉은빛", element: "화", body: ["한겨울에 태어난 당신의 꽃은 카네이션이에요.", "고마운 사람에게 건네는 꽃처럼, 받은 마음을 잊지 않고 갚는 사람이에요.", "곁에 있는 사람들에게 오래도록 존경받는 따뜻함이 있어요."] },
  2: { name: "제비꽃", meaning: "겸손 · 성실", color: "보랏빛", element: "화", body: ["2월에 태어난 당신의 꽃은 제비꽃이에요.", "낮게 피어도 향기가 멀리 가는 꽃처럼, 드러내지 않아도 성실함이 전해지는 사람이에요.", "조용히 쌓은 것이 언젠가 크게 빛을 봐요."] },
  3: { name: "수선화", meaning: "새 출발 · 자기 존중", color: "노란빛", element: "토", body: ["봄을 여는 3월, 당신의 꽃은 수선화예요.", "추위를 뚫고 가장 먼저 피는 꽃처럼, 새로 시작하는 힘이 강한 사람이에요.", "남의 눈보다 내 기준을 믿을 때 가장 아름답게 피어나요."] },
  4: { name: "데이지", meaning: "순수 · 희망", color: "흰빛", element: "금", body: ["4월에 태어난 당신의 꽃은 데이지예요.", "작고 하얀 꽃잎처럼 꾸밈없고 맑은 마음을 가졌어요.", "어떤 상황에서도 희망을 먼저 보는 눈이 주변을 밝혀요."] },
  5: { name: "은방울꽃", meaning: "다시 찾아온 행복", color: "흰빛", element: "금", body: ["5월에 태어난 당신의 꽃은 은방울꽃이에요.", "고개 숙인 작은 종처럼 겸손하지만, 맑은 향기로 존재를 알리는 사람이에요.", "힘든 시간을 지나면 반드시 더 큰 행복이 찾아오는 흐름을 가졌어요."] },
  6: { name: "장미", meaning: "사랑 · 열정", color: "붉은빛", element: "화", body: ["초여름 6월, 당신의 꽃은 장미예요.", "가장 사랑받는 꽃답게, 사람을 끌어당기는 매력과 뜨거운 마음이 있어요.", "가시가 꽃을 지키듯, 나를 지키는 단호함도 함께 가졌어요."] },
  7: { name: "수련", meaning: "맑은 마음", color: "물빛", element: "수", body: ["한여름 7월, 당신의 꽃은 수련이에요.", "흙탕물 위에서도 맑게 피는 꽃처럼, 어떤 환경에서도 마음의 결을 지키는 사람이에요.", "고요한 곳에서 생각을 정리할 때 가장 좋은 답을 찾아요."] },
  8: { name: "글라디올러스", meaning: "굳은 의지 · 승리", color: "붉은빛", element: "화", body: ["8월에 태어난 당신의 꽃은 글라디올러스예요.", "칼처럼 곧게 뻗은 꽃대처럼, 한번 정한 뜻을 굽히지 않는 사람이에요.", "버티고 버틴 끝에 결국 이기는 힘이 있어요."] },
  9: { name: "과꽃", meaning: "믿음 · 추억", color: "남보랏빛", element: "수", body: ["가을의 문턱 9월, 당신의 꽃은 과꽃이에요.", "오래된 마당에 해마다 피는 꽃처럼, 한결같은 믿음을 주는 사람이에요.", "함께한 시간을 소중히 간직해서, 오랜 인연이 많아요."] },
  10: { name: "금잔화", meaning: "반드시 올 행복", color: "노란빛", element: "토", body: ["10월에 태어난 당신의 꽃은 금잔화(메리골드)예요.", "햇빛을 닮은 노란 꽃처럼, 곁에 있으면 마음이 따뜻해지는 사람이에요.", "지금이 조금 더디더라도, 기다리던 기쁨이 반드시 찾아오는 흐름이에요."] },
  11: { name: "국화", meaning: "고결 · 진실", color: "흰빛", element: "금", body: ["늦가을 11월, 당신의 꽃은 국화예요.", "찬 서리에도 꼿꼿이 피는 꽃처럼, 어려울수록 품격을 잃지 않는 사람이에요.", "진실한 말과 행동으로 오래 신뢰받아요."] },
  12: { name: "포인세티아", meaning: "축복 · 행복을 빌어요", color: "붉은빛", element: "화", body: ["한 해를 마무리하는 12월, 당신의 꽃은 포인세티아예요.", "연말을 밝히는 붉은 잎처럼, 사람들에게 축복과 기쁨을 나눠 주는 사람이에요.", "당신이 있는 자리는 늘 따뜻한 잔치가 돼요."] },
};

/** 사주에 부족한 기운을 채워 주는 꽃 (집에서 곁에 두기 쉬운 꽃) */
export const FILL_FLOWER: Record<ElementKo, { name: string; why: string; tip: string }> = {
  목: { name: "난초", why: "사철 푸른 잎이 곧게 뻗는 난초는 나무(木)의 기운을 대표하는 꽃이에요.", tip: "동쪽 창가에 화분 하나" },
  화: { name: "제라늄", why: "햇볕을 좋아하고 붉게 피는 제라늄은 불(火)의 기운을 북돋워요.", tip: "남쪽 볕 드는 자리에" },
  토: { name: "해바라기", why: "땅에 깊이 뿌리내리고 노랗게 피는 해바라기는 흙(土)의 기운을 닮았어요.", tip: "거실 한가운데 노란 꽃" },
  금: { name: "백합", why: "희고 단정한 백합은 쇠(金)의 맑고 곧은 기운을 품고 있어요.", tip: "서쪽 자리에 흰 꽃 한 송이" },
  수: { name: "수국", why: "물을 많이 머금고 푸르게 피는 수국(水菊)은 이름처럼 물(水)의 기운이에요.", tip: "북쪽 자리에 푸른 수국" },
};

export function monthFlower(solarDate: string): MonthFlower {
  return MONTH[Number(solarDate.split("-")[1])];
}

export function flowerResult(solarDate: string): FunResult {
  const m = Number(solarDate.split("-")[1]);
  const f = MONTH[m];
  return {
    key: String(m),
    badge: f.name.slice(0, 1),
    short: f.name,
    title: `${m}월의 꽃 · ${f.name}`,
    subtitle: `꽃말: ${f.meaning}`,
    body: f.body,
    tags: f.meaning.split(" · "),
    element: f.element,
    elementNote: `${f.name}의 ${f.color}을 동양의 오행 색에 견주면 ${f.element}의 기운이에요.`,
  };
}
