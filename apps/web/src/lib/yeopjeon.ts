import { TENANT } from "@/tenants";
import type { TenantPrices } from "@/tenants/types";
/**
 * 엽전(서비스 안 화폐) 설정 - 2026-10-08 유샘 확정.
 *
 *   무료(만세력·오늘의 운세·띠별 운세·이름 풀이·관상)는 로그인 없이
 *   → 카카오 가입 선물 엽전 → 990냥 맛보기 → 4,900냥 깊게 보기 / 9,900냥 3개 몰아보기 / 29,500냥 12개 전부 보기
 *   → 친구 초대로 엽전 모으기.
 *
 * 단위는 "냥" (1냥 = 1원). 엽전은 "선물·보상"으로만 지급한다(돈을 받고 충전하지 않는다 - 선불 충전금은
 * 전자금융거래법 검토가 필요). 결제사 승인 후에는 상품을 바로 결제하는 방식으로 붙인다.
 *
 * 숫자는 운영하면서 이 파일만 고치면 화면과 서버가 함께 바뀐다.
 * (DB 장부 테이블 이름은 예전 이름 bokchae_ledger 그대로 쓴다 - 이미 쌓인 기록을 옮기지 않기 위해)
 */

export const CURRENCY_NAME = "엽전";
export const CURRENCY_UNIT = "냥";

/** 가격 (냥) - 2026-10-23 베이직: 값은 고객사 설정(src/tenants/<id>.ts)의 prices.
 *  BASIC 운세 보기 · DEEP 깊게 보기 · BUNDLE3 몰아보기 · BUNDLE12 전부 보기 · RENAME/NAMING 개명·신생아 작명 · FACE 관상 심층
 *  BUSINESS/CORP/BRAND 상호·기업·브랜딩 작명 · COUPLE 연인 궁합 · PREMIUM_* 프리미엄 작명 · WALLPAPER 배경화면 · EXAM/EXAM_DEEP 수능운
 *  TASTE 예전 맛보기(더 이상 팔지 않음, 이미 산 풀이 다시 보기용) */
export const PRICE: Readonly<TenantPrices> = TENANT.prices;

/**
 * 프리미엄 작명(작명 + 12가지 운세 전부 보기) 판매 여부 (2026-10-17 유샘: 포트원 심사 기간에는 단추 자체를 숨김).
 * 심사가 끝나면 true로 바꾸면 화면 단추·안내와 서버 구매가 함께 열린다.
 */
export const PREMIUM_ON: boolean = TENANT.features.premiumNaming;

/** 묶음의 정가(깊게 보기 따로 산 값)·할인액·할인율 - 화면 표시용 */
export function bundleDiscount(count: number, price: number): { list: number; off: number; percent: number } {
  const list = PRICE.DEEP * count;
  const off = Math.max(0, list - price);
  return { list, off, percent: list > 0 ? Math.round((off / list) * 100) : 0 };
}

/**
 * 가입(로그인) 선물 (2026-10-17 유샘 확정): 990냥 - 수능운 가볍게 보기(990)를 바로 무료로 볼 수 있는 금액.
 * 회원마다 한 번만 (장부 kind "welcome"). 2026-10-23: 12가지 운세 보기(990냥) 하나를 이 선물로 무료로 본다.
 */
export const WELCOME_GIFT = 990;

/**
 * 친구 초대 (2026-10-17 유샘 확정): 단계 없이 한 명마다 초대한 사람 990냥 · 초대받은 친구 990냥.
 * 990냥이면 수능운 가볍게 보기·행운 배경화면 등 990냥 상품 하나를 바로 볼 수 있다.
 */
export const INVITE_REWARD = 990;
export const INVITEE_GIFT = 990;

/** n번째(1부터) 친구가 가입했을 때 초대한 사람이 받는 엽전 - 늘 같은 금액 */
export function inviteRewardFor(nth: number): number {
  return Number.isInteger(nth) && nth >= 1 ? INVITE_REWARD : 0;
}

/** 초대 코드 쿠키 (친구가 초대 링크로 들어오면 30일 기억) */
export const REF_COOKIE_NAME = "ryugyeol_ref";
export const REF_CODE_RE = /^[A-Z0-9]{6,10}$/;

/** 가입하러 카카오에 다녀오는 동안 보던 무료 결과를 기억하는 키 (결과 토큰이 길어 주소로 못 넘긴다) */
export const PENDING_RESULT_KEY = "ryugyeol_pending_result";
export const RESUME_RESULT_PATH = "/result?resume=1";

/** 1,234냥 */
export function formatNyang(n: number): string {
  return `${n.toLocaleString("ko-KR")}${CURRENCY_UNIT}`;
}

/** 장부의 예전 기록 이름(복채)을 지금 이름(엽전)으로 바꿔 보여준다 */
export function displayLedgerLabel(label: string): string {
  return label.replace(/복채/g, CURRENCY_NAME);
}
