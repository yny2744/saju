import { TOPICS, isAnyTopicKey, isTopicKey } from "@/lib/topics";

/** 1004 천사의 한마디 (2026-10-12 수정안 47) - 화면·서버 공용 */
export const REVIEW_TITLE = "1004 천사의 한마디";
/** 계정의 첫 후기 선물 */
export const REVIEW_GIFT = 990;
/** 사이트 전체 1,004번째 후기 선물 (12가지 운세 전부 보기 값) */
export const REVIEW_ANGEL_NO = 1004;
export const REVIEW_ANGEL_GIFT = 29500;
export const REVIEW_MIN_CHARS = 20;

/** "유남영" → "유*영", "김철" → "김*", 영문 닉네임도 가운데를 가린다 */
export function maskName(name: string): string {
  const cs = [...(name ?? "").trim()];
  if (cs.length === 0) return "손님";
  if (cs.length === 1) return cs[0] + "*";
  if (cs.length === 2) return cs[0] + "*";
  return cs[0] + "*".repeat(cs.length - 2) + cs[cs.length - 1];
}

/** basic:money → "재물 운세 보기", deep:money → "재물 깊게 보기", naming → "아이 작명" */
export function reviewProductLabel(product: string): string {
  if (product === "naming") return "아이 작명";
  if (product === "rename") return "개명 추천";
  const [k, t] = product.split(":");
  if (k === "basic" && isTopicKey(t)) return `${TOPICS[t].title} 운세 보기`;
  if (k === "deep" && isAnyTopicKey(t)) return `${TOPICS[t].title} 깊게 보기`;
  return "류결사주";
}
