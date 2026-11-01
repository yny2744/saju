/**
 * 알림 공개 열쇠 (2026-11-01) - 화면(알림 단추)에서도 쓰므로 엔진을 끌어오지 않게 따로 둔다. 설명은 lib/push.ts.
 * NEXT_PUBLIC_ 값은 빌드할 때 박히므로, Vercel 에 넣은 뒤에는 다시 배포해야 단추가 보인다.
 */
export const PUSH_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
export const PUSH_ON = PUSH_PUBLIC_KEY.length > 0;
