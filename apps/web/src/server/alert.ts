import { BRAND } from "@/tenants";
import { logErrorToDb } from "@/server/admin/errorLog";
/**
 * 오류 알림 (2026-10-08 수정안 9번).
 *
 * 항상 서버 로그(Vercel → Logs)에 남기고, 배포 환경변수 ERROR_ALERT_WEBHOOK_URL 이 있으면 그 주소로도 보낸다.
 * (디스코드·슬랙·텔레그램 봇 등 "웹훅 주소"를 넣으면 휴대폰으로 알림을 받을 수 있다. 없으면 로그만.)
 * 알림이 실패해도 서비스 동작에는 영향을 주지 않는다.
 *
 * 개인정보 원칙: 알림 문구에 생년월일·이름 같은 손님 정보를 넣지 않는다 - 어디서 무슨 오류인지만 보낸다.
 */

const MAX_LEN = 900;

export function formatAlert(where: string, error: unknown): string {
  const msg = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  return `[${BRAND} 오류] ${where}\n${msg}`.slice(0, MAX_LEN);
}

export function notifyError(where: string, error: unknown): void {
  const text = formatAlert(where, error);
  // eslint-disable-next-line no-console
  console.error(text);
  logErrorToDb(where, error instanceof Error ? `${error.name}: ${error.message}` : String(error));
  sendWebhook(text);
}

/** 관리자 알림 (오류가 아닌 일 - 예: 충전 신청). 손님 이름·생년월일은 넣지 않는다. */
export function notifyAdmin(message: string): void {
  const text = `[${BRAND} 알림] ${message}`.slice(0, MAX_LEN);
  // eslint-disable-next-line no-console
  console.log(text);
  sendWebhook(text);
}

/**
 * 2026-11-14 유샘 시험에서 환불 신청 알림이 디스코드에 오지 않음 - 원인(지니 판단): 보내 놓고 기다리지 않아서
 * 베셀이 응답을 마친 뒤 작업을 멈추면 보내던 알림이 사라진다. 베셀의 "응답 뒤에도 마저 하기"(waitUntil)에 맡긴다.
 * (@vercel/functions 의 waitUntil 과 같은 방식 - 베셀 밖에서는 없어서 그냥 보낸다)
 */
function keepAlive(p: Promise<unknown>): void {
  try {
    const ctx = (globalThis as unknown as Record<symbol, { get?: () => { waitUntil?: (p: Promise<unknown>) => void } | undefined } | undefined>)[
      Symbol.for("@vercel/request-context")
    ];
    ctx?.get?.()?.waitUntil?.(p);
  } catch {
    /* 없으면 그냥 보낸다 */
  }
}

function sendWebhook(text: string): void {
  const url = process.env.ERROR_ALERT_WEBHOOK_URL?.trim();
  if (!url || !/^https:\/\//.test(url)) return;
  // 디스코드는 content, 슬랙은 text를 읽는다 - 둘 다 담아 보낸다
  const p = fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ text, content: text }),
    signal: AbortSignal.timeout(8000),
  })
    .then((r) => {
      // eslint-disable-next-line no-console
      if (!r.ok) console.error(`[알림 보내기 실패] HTTP ${r.status}`);
    })
    .catch((e) => {
      // eslint-disable-next-line no-console
      console.error(`[알림 보내기 실패] ${e instanceof Error ? e.message : String(e)}`);
    });
  keepAlive(p);
}
