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
 * 2026-10-06 유샘 확정(용사주 방식): 무료(만세력·오늘의 운세·관상)는 로그인 없이 본다.
 * 로그인은 가입 선물 복채·990원 사주보기·친구 초대·내 사주함에서만 쓴다.
 * (이전 수정안 3번 "무료부터 로그인 필수"를 대체 - 무료 화면을 막는 곳은 이제 없다)
 */
export function isLoginRequired(): boolean {
  return false;
}

/**
 * 회원 기능 스위치. 배포 환경변수 NEXT_PUBLIC_LOGIN_REQUIRED=true 는 이제 "회원 기능(로그인·복채·내 사주함) 켜기"
 * 뜻으로 쓴다 - Vercel 설정은 그대로 두면 된다. (DB·카카오 키가 없는 환경에서는 꺼 둔다)
 */
export function isMemberFeatureOn(): boolean {
  return process.env.NEXT_PUBLIC_LOGIN_REQUIRED === "true";
}

/** 로그인·회원 화면/API를 열지 여부: 승인 후(live)이거나, 회원 기능 스위치가 켜졌을 때 */
export function isAuthEnabled(): boolean {
  return isLive() || isMemberFeatureOn();
}
