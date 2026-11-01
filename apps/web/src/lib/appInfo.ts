import { TENANT } from "@/tenants";

/**
 * 휴대폰 앱(PWA) 정보 (2026-11-01 유샘: 사이트를 앱처럼 홈 화면에 설치해 매일 오늘의 운세로 하루를 시작하게).
 * 앱스토어 앱이 아니라 지금 사이트를 그대로 설치하는 방식 - 사이트를 고치면 앱도 바로 바뀐다.
 */
export const APP_NAME = TENANT.app?.name ?? TENANT.brand.name;
export const APP_SHORT_NAME = TENANT.app?.shortName ?? TENANT.brand.name;
export const APP_ICON_DIR = `/icons/${TENANT.id}`;
/** 상단 상태 표시줄·스플래시 색 - 대문이 있는 고객사(명견만리)는 옻칠 검정, 나머지는 감청 */
export const APP_THEME_COLOR = TENANT.gate ? "#0b0908" : "#16294a";
/** 앱으로 열었을 때 첫 화면 - 꼬리표로 "앱에서 들어왔다"를 방문 집계에 남긴다 */
export const APP_START_URL = "/?utm_source=app&utm_medium=pwa";

/**
 * "앱으로 열었다" 표시 쿠키 (2026-11-01 유샘: 가입 선물 990냥은 앱으로 열었을 때만).
 * 앱(홈 화면 아이콘)으로 열면 화면이 1년짜리 쿠키를 남기고, 가입·동의·복주머니 요청에 함께 실려 서버가 확인한다.
 * 안드로이드는 앱과 크롬이 쿠키를 함께 쓰므로 카카오 로그인 창이 크롬으로 잠깐 넘어가도 그대로 실린다.
 */
export const APP_COOKIE = "ryugyeol_app";

/** 서버: 요청 쿠키 값으로 "앱에서 왔나" */
export function isAppCookie(value: string | undefined): boolean {
  return value === "1";
}
