import { josa } from "@/tenants";
import { TOPICS, TOPIC_KEYS, withUnse, type TopicKey } from "@/lib/topics";

/**
 * 관 화면 설정 (2026-11-03 유샘 지시서: 모든 관을 수능대박운 방식으로 통일).
 *   틀: 머리줄 → 관 제목 → 홍보 영상(또는 대표 그림, 수능과 같은 16:9 가로 띠) → 안내 한 줄(+ "로그인 없이 무료로 보기") → 입력 칸 → 풀이
 *   관마다 다른 것은 여기서만 바꾼다: 제목 / 홍보 영상 / 대표 그림 / 안내 한 줄 / 무료 표시. (입력 칸·풀이 화면은 관마다 있던 것을 그대로 쓴다)
 *   대표 그림은 관별 홍보 영상이 오기 전까지 임시로 메인 소개 카드(/cards/intro-0N.webp) 중 주제가 맞는 것 (같은 날 유샘).
 *   소개 카드는 정사각형이라 가로 띠에서는 그림 아래쪽(imagePos)을 보여 준다.
 */

export interface RoomEntry {
  title: string;
  /** 홍보 영상 (있으면 맨 위) */
  video?: string;
  /** 대표 그림 (영상이 없을 때) */
  image?: string;
  /** 가로 띠로 자를 때 보이는 자리 (object-position) */
  imagePos?: string;
  /** 가로 띠 안에서 그림을 키우는 배율 (아래쪽 기준) - 글자 박힌 위쪽이 띠에 들어오지 않게 */
  imageZoom?: number;
  /** 입력 칸 위 안내 한 줄 */
  line: string;
  /** 로그인 없이 볼 수 있는 관이면 "로그인 없이 무료로 보기" 제목 */
  free?: boolean;
}

/** 소개 카드 번호(카드에 적힌 "01. 물음" ~ "07. 結")로 고른다 - 파일은 한 칸 뒤 (intro-01 은 브랜드 표지) */
const CARD = (n: number) => `/cards/intro-0${n + 1}.webp`;
/** 카드 위쪽에 글자가 박혀 있어 가로 띠에서는 맨 아래쪽 그림을 보여 준다 */
const LOWER = "center 100%";

/**
 * 2026-11-04 유샘: 글자가 잘려 보이지 않게, 카드마다 글자가 끝나는 아래(1080 기준 세로 위치)부터만 띠에 보이도록 키운다.
 * 정사각형 카드를 16:9 띠에 꽉 채우면 아래쪽 1080×9/16 = 607.5 만큼 보이므로, 배율 = 607.5 ÷ (1080 - 글자 끝).
 */
const CARD_TEXT_END: Record<number, number> = { 1: 790, 2: 705, 3: 640, 4: 745, 5: 575, 6: 700, 7: 640 };
function cardImage(n: number): Pick<RoomEntry, "image" | "imagePos" | "imageZoom"> {
  const end = CARD_TEXT_END[n] ?? 0;
  return { image: CARD(n), imagePos: LOWER, imageZoom: Math.max(1, Math.round((607.5 / (1080 - end)) * 100) / 100) };
}

/** 12가지 운세 관 - 주제별 대표 그림 */
const TOPIC_IMAGE: Partial<Record<TopicKey, number>> = {
  nature: 1, job: 1, love: 5, marriage: 5, relationship: 5, family: 5,
  money: 7, promotion: 7, business: 7, year: 7, daeun: 7, health: 4,
};

function topicRoom(t: TopicKey): RoomEntry {
  return {
    title: withUnse(TOPICS[t].title),
    ...cardImage(TOPIC_IMAGE[t] ?? 1),
    line: `이름과 생년월일을 넣어 주세요. ${josa(withUnse(TOPICS[t].title), "을/를")} 사주로 풀어 드려요.`,
    free: true,
  };
}

export type RoomKey =
  | `topic:${TopicKey}`
  | "year2027"
  | "saju"
  | "fortune"
  | "gunghap"
  | "tarot"
  | "face"
  | "tti"
  | "name"
  | "namebiz"
  | "taekil"
  | `fun:${string}`;

const BASE: Record<string, RoomEntry> = {
  // 사주관 (/start) - 만세력
  saju: { title: "나의 사주풀이", ...cardImage(1), line: "이름과 생년월일을 넣어 주세요. 만세력과 타고난 기운을 바로 보여 드려요.", free: true },
  // 오늘의 운세관 (/start?next=fortune)
  fortune: { title: "오늘의 운세", ...cardImage(4), line: "이름과 생년월일을 넣어 주세요. 오늘과 내일의 기운을 풀어 드려요.", free: true },
  // 2027 신년 운세 (/go/newyear2027) - 올해 운세를 2027년 정미년으로
  year2027: { title: "2027 신년 운세", ...cardImage(7), line: "이름과 생년월일을 넣어 주세요. 2027년 한 해의 흐름을 풀어 드려요.", free: true },
  gunghap: { title: "궁합", ...cardImage(5), line: "두 사람의 이름과 생년월일을 넣어 주세요. 사주로 인연을 풀어 드려요." },
  tarot: { title: "타로", ...cardImage(6), line: "지금 마음에 걸린 물음 하나를 고르고, 카드를 직접 멈추거나 골라 보세요.", free: true },
  face: { title: "관상", ...cardImage(2), line: "정면 사진 한 장으로 얼굴형과 이목구비를 전통 관상학으로 풀어 드려요.", free: true },
  tti: { title: "띠별 운세", ...cardImage(4), line: "생년월일 없이 띠만 고르면 오늘과 내일의 운세를 보여 드려요.", free: true },
  name: { title: "작명", ...cardImage(3), line: "이름 풀이부터 개명·아기 이름·상호 작명까지, 사주에 맞춰 풀어 드려요." },
  namebiz: { title: "상호 풀이", ...cardImage(3), line: "가게·회사 이름이 업종의 기운과 맞는지 무료로 풀어 드려요.", free: true },
  taekil: { title: "택일", ...cardImage(3), line: "목적과 기간을 고르고 생년월일을 넣어 주세요. 좋은 날을 골라 드려요.", free: true },
};

/** 재미관 (별자리·탄생화·탄생석·수비학·혈액형·MBTI) */
const FUN: Record<string, { title: string; image: number; line: string }> = {
  zodiac: { title: "별자리", image: 2, line: "생년월일을 넣어 주세요. 별자리와 사주를 함께 보여 드려요." },
  flower: { title: "탄생화", image: 7, line: "생년월일을 넣어 주세요. 나를 닮은 꽃과 나를 채우는 꽃을 보여 드려요." },
  birthstone: { title: "탄생석", image: 3, line: "생년월일을 넣어 주세요. 태어난 달의 보석과 나를 채우는 돌을 보여 드려요." },
  numerology: { title: "수비학", image: 3, line: "생년월일을 넣어 주세요. 생일 숫자로 인생 수를 풀어 드려요." },
  blood: { title: "혈액형", image: 1, line: "혈액형과 생년월일을 넣어 주세요. 혈액형과 사주를 함께 보여 드려요." },
  mbti: { title: "MBTI", image: 1, line: "MBTI와 생년월일을 넣어 주세요. 유형과 사주의 일간을 겹쳐 풀어 드려요." },
};

export function room(key: RoomKey): RoomEntry | undefined {
  if (key.startsWith("topic:")) {
    const t = key.slice(6) as TopicKey;
    return (TOPIC_KEYS as readonly string[]).includes(t) ? topicRoom(t) : undefined;
  }
  if (key.startsWith("fun:")) {
    const f = FUN[key.slice(4)];
    return f ? { title: f.title, ...cardImage(f.image), line: f.line, free: true } : undefined;
  }
  return BASE[key];
}
