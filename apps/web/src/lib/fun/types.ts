import type { ElementKo } from "@/lib/pillarView";
import type { TopicKey } from "@/lib/topics";

/**
 * 무료 묶음 (2026-10-26) - 수비학·별자리·혈액형·탄생화 (+ 2026-10-31 탄생석·타로).
 * 모두 AI 없이 정해 둔 문장으로 만든다 ("무료에는 AI를 쓰지 않는다" 원칙).
 * 흐름: 무료 결과 → 사주와 겹쳐 보기(일간·부족한 기운) → 이어지는 12가지 운세로.
 */

export type FunKind = "numerology" | "zodiac" | "blood" | "flower" | "birthstone" | "tarot";

export const FUN_KINDS: FunKind[] = ["numerology", "zodiac", "blood", "flower", "birthstone", "tarot"];

export function isFunKind(v: unknown): v is FunKind {
  return typeof v === "string" && (FUN_KINDS as string[]).includes(v);
}

/** 무료 결과 한 장 */
export interface FunResult {
  key: string;
  /** 동그라미 안에 크게 보이는 글자 (숫자·별자리 기호·혈액형·꽃 이름 첫 글자 등) */
  badge: string;
  /** 문장 안에서 부르는 짧은 이름 (예: "인생 수 4", "황소자리", "은방울꽃", "AB형") */
  short: string;
  title: string;
  subtitle: string;
  body: string[];
  tags: string[];
  /** 이 결과를 오행에 견준 것 - 없으면(혈액형) 사주 겹쳐 보기에서 오행 비교를 하지 않는다 */
  element?: ElementKo;
  /** 왜 그 오행으로 보는지 한 줄 */
  elementNote?: string;
}

export const BLOOD_TYPES = ["A", "B", "O", "AB"] as const;
export type BloodType = (typeof BLOOD_TYPES)[number];

export function isBloodType(v: unknown): v is BloodType {
  return typeof v === "string" && (BLOOD_TYPES as readonly string[]).includes(v);
}

export interface FunMeta {
  title: string;
  /** 대문 카드 한 줄 */
  desc: string;
  /** 사주와 겹쳐 본 뒤 이어 주는 12가지 운세 */
  topic: TopicKey;
  /** 사주 겹쳐 보기 안내 문구 */
  overlayLead: string;
}

export const FUN_META: Record<FunKind, FunMeta> = {
  numerology: {
    title: "수비학 · 인생 수",
    desc: "생일 숫자로 보는 나의 인생 수, 그리고 사주와의 만남",
    topic: "nature",
    overlayLead: "숫자가 말하는 나와, 사주가 말하는 나는 같을까요?",
  },
  zodiac: {
    title: "별자리",
    desc: "서양의 별자리와 동양의 사주로 함께 보는 나",
    topic: "year",
    overlayLead: "별자리의 기운을 내 사주에 겹쳐 보면 무엇이 보일까요?",
  },
  blood: {
    title: "혈액형",
    desc: "A·B·O·AB로 보는 겉모습, 사주로 보는 속마음",
    topic: "relationship",
    overlayLead: "혈액형이 겉으로 드러나는 나라면, 사주는 타고난 뿌리예요.",
  },
  flower: {
    title: "탄생화 · 꽃말",
    desc: "내가 태어난 달의 꽃, 그리고 나를 채워 주는 꽃",
    topic: "nature",
    overlayLead: "내 탄생화와, 내 사주에 부족한 기운을 채워 주는 꽃은 다를 수 있어요.",
  },
  birthstone: {
    title: "탄생석 · 보석말",
    desc: "내가 태어난 달의 보석, 그리고 나를 채워 주는 돌",
    topic: "money",
    overlayLead: "내 탄생석과, 내 사주에 부족한 기운을 채워 주는 돌은 다를 수 있어요.",
  },
  // 2026-10-31 타로관 - 이어지는 운세는 고른 질문에 따라 바뀐다 (tarot.ts TAROT_QUESTIONS)
  tarot: {
    title: "타로 · 오늘의 한 장",
    desc: "22장 가운데 내가 직접 고른 한 장, 그리고 내 사주와의 만남",
    topic: "year",
    overlayLead: "내가 고른 카드의 기운을 내 사주에 겹쳐 보면 무엇이 보일까요?",
  },
};
