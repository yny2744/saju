import { BUNDLE_SUGGESTIONS, TOPICS, isTopicKey, type TopicKey } from "@/lib/topics";

/**
 * 대문에서 무엇을 사려고 들어왔는지 (2026-10-09 수정안 20·24).
 *   ?topic=money   → 그 운세 하나 (운세 보기 990냥 → 깊게 보기 4,900냥)
 *   ?bundle=0..3   → 추천 묶음 몰아보기 (9,900냥, 3가지가 미리 골라진 채로)
 *   ?all=1         → 12가지 운세 전부 보기 (29,500냥)
 * 이 값은 주소에 그대로 실려 다니므로 허용된 값만 읽는다(임의 주소로 보내지 못하게).
 */
export type Intent = { kind: "topic"; topic: TopicKey } | { kind: "bundle"; index: number } | { kind: "all" };

export function parseIntent(q: URLSearchParams): Intent | null {
  const topic = q.get("topic");
  if (isTopicKey(topic)) return { kind: "topic", topic };
  const b = q.get("bundle");
  if (b !== null && /^\d$/.test(b) && Number(b) < BUNDLE_SUGGESTIONS.length) return { kind: "bundle", index: Number(b) };
  if (q.get("all") === "1") return { kind: "all" };
  return null;
}

export function intentQuery(i: Intent): string {
  if (i.kind === "topic") return `topic=${i.topic}`;
  if (i.kind === "bundle") return `bundle=${i.index}`;
  return "all=1";
}

/** 화면 안내용 이름: "재물 운세" / "든든한 노후 몰아보기" / "12가지 운세 전부 보기" */
export function intentLabel(i: Intent): string {
  if (i.kind === "topic") return `${TOPICS[i.topic].title} 운세`;
  if (i.kind === "bundle") return `${BUNDLE_SUGGESTIONS[i.index].title} 몰아보기`;
  return "12가지 운세 전부 보기";
}

/** 풀이 대상(사람)이 정해진 뒤 갈 곳 */
export function intentDestination(personId: string, i: Intent): string {
  const base = `/person/${encodeURIComponent(personId)}`;
  if (i.kind === "topic") return `${base}/${i.topic}`;
  if (i.kind === "bundle") return `${base}?buy=bundle3&pick=${BUNDLE_SUGGESTIONS[i.index].topics.join(",")}`;
  return `${base}?buy=bundle12`;
}

/** 생년월일 입력 → (로그인) → 사람 만들기 사이에 잠깐 기억해 두는 값 (결과 토큰이 길어 주소에 못 싣는다) */
export const PENDING_INTENT_KEY = "ryugyeol_pending_intent";
export const CONTINUE_PATH = "/continue";

/** 브라우저 저장소 (서버·시험 환경에는 없음 → null) */
type MiniStorage = { getItem(k: string): string | null; setItem(k: string, v: string): void; removeItem(k: string): void };
function store(): MiniStorage | null {
  return (globalThis as unknown as { localStorage?: MiniStorage }).localStorage ?? null;
}

export interface PendingIntent {
  resultId: string;
  q: string;
  at: number;
}

export function savePendingIntent(resultId: string, i: Intent): void {
  try {
    const v: PendingIntent = { resultId, q: intentQuery(i), at: Date.now() };
    store()?.setItem(PENDING_INTENT_KEY, JSON.stringify(v));
  } catch {
    /* 저장 못 해도 진행 - 돌아와서 다시 입력하면 됨 */
  }
}

/** 24시간 안에 기억해 둔 것만 꺼낸다 (무료 결과 보관 시간과 같음) */
export function readPendingIntent(): { resultId: string; intent: Intent } | null {
  try {
    const raw = store()?.getItem(PENDING_INTENT_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as PendingIntent;
    const intent = parseIntent(new URLSearchParams(v.q));
    if (!intent || typeof v.resultId !== "string" || Date.now() - v.at > 24 * 3600 * 1000) return null;
    return { resultId: v.resultId, intent };
  } catch {
    return null;
  }
}

export function clearPendingIntent(): void {
  try {
    store()?.removeItem(PENDING_INTENT_KEY);
  } catch {
    /* 무시 */
  }
}
