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
  return `[류결사주 오류] ${where}\n${msg}`.slice(0, MAX_LEN);
}

export function notifyError(where: string, error: unknown): void {
  const text = formatAlert(where, error);
  // eslint-disable-next-line no-console
  console.error(text);
  const url = process.env.ERROR_ALERT_WEBHOOK_URL;
  if (!url || !/^https:\/\//.test(url)) return;
  // 디스코드는 content, 슬랙은 text를 읽는다 - 둘 다 담아 보낸다
  fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ text, content: text }),
  }).catch(() => {});
}
