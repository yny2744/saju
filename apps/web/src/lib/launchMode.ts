/**
 * 접수용(review) / 승인 후(live) 모드 스위치.
 *
 * Toss 가맹 심사 기간에는 "검증된 결제 흐름 + 법적 고지"만 보이게 하고, 승인 후에 열 기능
 * (로그인, 내 사주함, 한자이름 입력, 류결의사주 등)은 코드로는 배포해두되 화면·API에서 막는다.
 * 승인 후에는 배포 환경변수 NEXT_PUBLIC_LAUNCH_MODE=live 로 바꾸고 재배포하면 한꺼번에 열린다.
 *
 * ⚠️ 안전한 기본값: 환경변수가 없거나 이상한 값이면 항상 "review"다. 실수로 설정이 빠져도
 * 승인 전 기능이 노출되지 않는 쪽으로 동작한다. (NEXT_PUBLIC_ 값은 빌드 시점에 박히므로
 * 값을 바꾼 뒤에는 반드시 재배포해야 한다.)
 */
export type LaunchMode = "review" | "live";

export function getLaunchMode(): LaunchMode {
  return process.env.NEXT_PUBLIC_LAUNCH_MODE === "live" ? "live" : "review";
}

export function isLive(): boolean {
  return getLaunchMode() === "live";
}

/**
 * 수정안 3번(2026-10-05): 무료 사주부터 카카오 로그인을 기본으로 한다.
 *
 * DB(neon)·카카오 키가 준비되기 전에 이 기능을 켜면 아무도 사주를 볼 수 없게 되므로, 별도 스위치로 둔다.
 * 준비가 끝나면 배포 환경변수 NEXT_PUBLIC_LOGIN_REQUIRED=true 로 바꾸고 재배포한다.
 * (값이 없거나 다른 값이면 꺼짐 = 지금처럼 로그인 없이 이용)
 */
export function isLoginRequired(): boolean {
  return process.env.NEXT_PUBLIC_LOGIN_REQUIRED === "true";
}

/** 로그인·회원 화면/API를 열지 여부: 승인 후(live)이거나, 로그인 필수 스위치가 켜졌을 때 */
export function isAuthEnabled(): boolean {
  return isLive() || isLoginRequired();
}
