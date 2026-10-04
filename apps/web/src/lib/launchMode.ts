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
