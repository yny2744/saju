import { NextResponse } from "next/server";
import { isAuthEnabled, isLive } from "@/lib/launchMode";

/**
 * 접수용(review) 모드에서는 승인 후 기능의 API를 막는다. 화면에서 버튼을 숨기는 것만으로는
 * 주소를 직접 쳐서 호출하는 걸 못 막기 때문에, 서버에서도 한 번 더 막는다.
 */
export function blockIfNotLive(): NextResponse | null {
  if (isLive()) return null;
  return notAvailable();
}

/** 로그인·회원 API용: live 모드이거나 로그인 필수 스위치(NEXT_PUBLIC_LOGIN_REQUIRED)가 켜졌으면 연다 */
export function blockIfAuthOff(): NextResponse | null {
  if (isAuthEnabled()) return null;
  return notAvailable();
}

function notAvailable(): NextResponse {
  return NextResponse.json(
    { error: { code: "NOT_AVAILABLE", message: "아직 준비 중인 기능입니다." } },
    { status: 404 }
  );
}
