import webpush from "web-push";
import { getTodayKstDateString } from "saju-engine";
import { db } from "@/server/auth/db";
import { getUserBySessionToken } from "@/server/auth/session";
import { BUSINESS_INFO } from "@/lib/businessInfo";
import { dailyPushMessage, readSubscription, welcomePushMessage, PUSH_PUBLIC_KEY, type PushMessage, type PushSubscriptionInput } from "@/lib/push";

/**
 * 매일 아침 "오늘의 운세" 알림 - 서버 쪽 (2026-11-01 유샘). 문장은 lib/push.ts.
 * Vercel 환경변수 (서버 전용, NEXT_PUBLIC_ 금지):
 *   VAPID_PRIVATE_KEY - 비밀 열쇠 (npx web-push generate-vapid-keys 로 만든 privateKey)
 *   VAPID_SUBJECT     - 연락처 (예: mailto:고객센터 메일). 없으면 고객센터 메일을 쓴다
 *   CRON_SECRET       - 발송 주소(/api/push/daily)를 아무나 부르지 못하게 하는 암호
 */

const MAX_FAILS = 3;

function vapidReady(): boolean {
  const priv = process.env.VAPID_PRIVATE_KEY ?? "";
  if (!PUSH_PUBLIC_KEY || !priv) return false;
  const subject = process.env.VAPID_SUBJECT || `mailto:${BUSINESS_INFO.csEmail}`;
  webpush.setVapidDetails(subject, PUSH_PUBLIC_KEY, priv);
  return true;
}

type Row = { endpoint: string; p256dh: string; auth: string };

/** 한 기기에 보내기. gone = 기기가 구독을 지웠다(404·410) → 줄을 지운다 */
async function sendOne(row: Row, msg: PushMessage): Promise<"sent" | "gone" | "failed"> {
  try {
    await webpush.sendNotification({ endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } }, JSON.stringify(msg), {
      TTL: 6 * 3600, // 휴대폰이 꺼져 있었으면 6시간 안에 켜질 때 받는다 (그 뒤엔 오늘 알림이 아니라 버린다)
      urgency: "normal",
      topic: msg.tag.slice(0, 32),
    });
    return "sent";
  } catch (e) {
    const code = (e as { statusCode?: number }).statusCode;
    if (code === 404 || code === 410) return "gone";
    return "failed";
  }
}

export type PushResult = { status: number; body: unknown };

/** 알림 켜기 - 구독 저장 + 확인 알림 한 번 */
export async function handlePushSubscribe(token: string | undefined, raw: unknown): Promise<PushResult> {
  if (!vapidReady()) return { status: 503, body: { error: { code: "PUSH_OFF", message: "알림 준비 중이에요." } } };
  const sub = readSubscription((raw as { subscription?: unknown } | null)?.subscription);
  if (!sub) return { status: 400, body: { error: { code: "INVALID_SUBSCRIPTION", message: "알림 정보를 읽지 못했어요." } } };
  const user = await getUserBySessionToken(token).catch(() => null);
  const pool = await db();
  await pool.query(
    `INSERT INTO push_subscriptions (endpoint, p256dh, auth, user_id) VALUES ($1, $2, $3, $4)
     ON CONFLICT (endpoint) DO UPDATE SET p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth,
       user_id = COALESCE(EXCLUDED.user_id, push_subscriptions.user_id), fail_count = 0`,
    [sub.endpoint, sub.keys.p256dh, sub.keys.auth, user?.id ?? null]
  );
  const sent = await sendOne({ endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth }, welcomePushMessage());
  return { status: 200, body: { ok: true, welcomeSent: sent === "sent" } };
}

/** 알림 끄기 */
export async function handlePushUnsubscribe(raw: unknown): Promise<PushResult> {
  const endpoint = (raw as { endpoint?: unknown } | null)?.endpoint;
  if (typeof endpoint !== "string" || !endpoint.startsWith("https://")) {
    return { status: 400, body: { error: { code: "INVALID_SUBSCRIPTION", message: "알림 정보를 읽지 못했어요." } } };
  }
  const pool = await db();
  await pool.query(`DELETE FROM push_subscriptions WHERE endpoint = $1`, [endpoint]);
  return { status: 200, body: { ok: true } };
}

/**
 * 매일 아침 발송 - 오늘 아직 안 보낸 기기에 오늘의 운세 알림.
 * 시간 안에 다 못 보내면 남은 기기는 다음 호출에서 이어서 보낸다 (last_sent_on 으로 겹치지 않음).
 */
export async function sendDailyPush(now = new Date(), budgetMs = 50_000): Promise<{ date: string; sent: number; gone: number; failed: number; left: boolean }> {
  const date = getTodayKstDateString(now);
  const out = { date, sent: 0, gone: 0, failed: 0, left: false };
  if (!vapidReady()) return out;
  const msg = dailyPushMessage(date);
  const pool = await db();
  const started = Date.now();
  for (;;) {
    if (Date.now() - started > budgetMs) {
      out.left = true;
      break;
    }
    // 보내기 전에 오늘 날짜를 먼저 찍어 두어, 발송이 동시에 두 번 불려도 같은 기기에 두 번 가지 않게 한다
    const batch = await pool.query<Row>(
      `UPDATE push_subscriptions SET last_sent_on = $1
       WHERE endpoint IN (
         SELECT endpoint FROM push_subscriptions WHERE last_sent_on IS DISTINCT FROM $1 LIMIT 200 FOR UPDATE SKIP LOCKED
       )
       RETURNING endpoint, p256dh, auth`,
      [date]
    );
    if (batch.rows.length === 0) break;
    const results = await Promise.all(batch.rows.map((r) => sendOne(r, msg).then((x) => [r.endpoint, x] as const)));
    const gone = results.filter(([, x]) => x === "gone").map(([e]) => e);
    const failed = results.filter(([, x]) => x === "failed").map(([e]) => e);
    const sent = results.filter(([, x]) => x === "sent").map(([e]) => e);
    if (gone.length) await pool.query(`DELETE FROM push_subscriptions WHERE endpoint = ANY($1)`, [gone]);
    if (failed.length) {
      await pool.query(`UPDATE push_subscriptions SET fail_count = fail_count + 1 WHERE endpoint = ANY($1)`, [failed]);
      await pool.query(`DELETE FROM push_subscriptions WHERE fail_count >= $1`, [MAX_FAILS]);
    }
    if (sent.length) await pool.query(`UPDATE push_subscriptions SET fail_count = 0 WHERE endpoint = ANY($1) AND fail_count > 0`, [sent]);
    out.sent += sent.length;
    out.gone += gone.length;
    out.failed += failed.length;
  }
  return out;
}

/** 발송 주소 암호 확인 - Vercel Cron 은 "Authorization: Bearer <CRON_SECRET>" 을 붙여 부른다 */
export function cronAuthorized(authHeader: string | null): boolean {
  const secret = process.env.CRON_SECRET ?? "";
  if (secret.length < 16) return false; // 암호가 없거나 너무 짧으면 아예 열지 않는다
  return authHeader === `Bearer ${secret}`;
}

export type { PushSubscriptionInput };
