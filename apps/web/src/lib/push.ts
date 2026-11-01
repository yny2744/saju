import { calculateDailyGanzhi } from "saju-engine";
import { STEM_ELEMENT, BRANCH_ELEMENT } from "saju-engine/dist/src/rules/fiveElementTables";
import { BRANCH_HANJA, STEM_HANJA, type ElementKo } from "@/lib/pillarView";
import { ELEMENT_HANJA, ELEMENT_NATURE } from "@/lib/manseView";
import { APP_SHORT_NAME, APP_ICON_DIR } from "@/lib/appInfo";

/**
 * 매일 아침 "오늘의 운세" 알림 (2026-11-01 유샘: 앱을 설치한 손님이 매일 오늘의 운세로 하루를 시작하게).
 *   알림 문장은 AI 없이 엔진의 그날 일진으로 정해진 문장을 만든다 (무료 콘텐츠에는 AI를 쓰지 않는다).
 *   유료 상품 권유는 넣지 않는다 - 손님이 받겠다고 한 "오늘의 운세" 안내만 (지니 판단: 광고성 정보가 되지 않게).
 * 열쇠(VAPID)는 Vercel 환경변수에만 둔다: 공개 열쇠 NEXT_PUBLIC_VAPID_PUBLIC_KEY, 비밀 열쇠 VAPID_PRIVATE_KEY (서버 전용).
 * 공개 열쇠가 없으면 알림 단추 자체가 보이지 않는다.
 */

export { PUSH_ON, PUSH_PUBLIC_KEY } from "./pushKey";

/** 알림을 누르면 여는 곳 - 오늘의 운세 (꼬리표로 "알림에서 들어왔다"를 방문 집계에 남긴다) */
export const PUSH_DAILY_URL = "/start?next=fortune&utm_source=push&utm_medium=push&utm_campaign=daily";

export interface PushMessage {
  title: string;
  body: string;
  url: string;
  icon: string;
  /** 같은 날 알림이 두 번 와도 하나로 겹치게 */
  tag: string;
}

const el = (e: ElementKo) => `${ELEMENT_NATURE[e]}(${ELEMENT_HANJA[e]})`;

/** 그날(YYYY-MM-DD, 한국 날짜)의 아침 알림 문장 */
export function dailyPushMessage(date: string): PushMessage {
  const g = calculateDailyGanzhi(date);
  const sky = STEM_ELEMENT[g.stem] as ElementKo;
  const earth = BRANCH_ELEMENT[g.branch] as ElementKo;
  const hanja = `${STEM_HANJA[g.stem] ?? ""}${BRANCH_HANJA[g.branch] ?? ""}`;
  const flow = sky === earth ? `하늘과 땅 모두 ${el(sky)}의 기운이에요` : `하늘은 ${el(sky)}, 땅은 ${el(earth)}의 기운이에요`;
  return {
    title: `${APP_SHORT_NAME} · 오늘의 운세`,
    body: `오늘은 ${g.ganzhi}(${hanja})일, ${flow}. 내 사주와 오늘이 어떻게 만나는지 열어 보세요.`,
    url: PUSH_DAILY_URL,
    icon: `${APP_ICON_DIR}/icon-192.png`,
    tag: `daily-${date}`,
  };
}

/** 알림을 켠 직후 한 번 보내는 확인 알림 */
export function welcomePushMessage(): PushMessage {
  return {
    title: `${APP_SHORT_NAME} · 알림이 켜졌어요`,
    body: "내일부터 매일 아침 오늘의 운세를 알려 드릴게요.",
    url: PUSH_DAILY_URL,
    icon: `${APP_ICON_DIR}/icon-192.png`,
    tag: "welcome",
  };
}

/** 브라우저가 준 구독 정보가 올바른 모양인가 (서버에서 저장 전에 확인) */
export interface PushSubscriptionInput {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

const B64URL = /^[A-Za-z0-9_-]+={0,2}$/;

export function readSubscription(raw: unknown): PushSubscriptionInput | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } };
  const endpoint = typeof r.endpoint === "string" ? r.endpoint : "";
  const p256dh = typeof r.keys?.p256dh === "string" ? r.keys.p256dh : "";
  const auth = typeof r.keys?.auth === "string" ? r.keys.auth : "";
  if (!/^https:\/\/[^\s]+$/.test(endpoint) || endpoint.length > 1000) return null;
  if (!B64URL.test(p256dh) || p256dh.length < 40 || p256dh.length > 200) return null;
  if (!B64URL.test(auth) || auth.length < 8 || auth.length > 100) return null;
  return { endpoint, keys: { p256dh, auth } };
}
