/**
 * 대문 상품 카드 목록 (2026-10-06 대문 개편).
 *
 * ⚠️ 가격·공개 여부는 "결정 대기" 상태로 넣어 둔 임시값이다 (유샘: 구조·텍스트 먼저, 가격은 정해 가며 수정).
 *    여기 한 곳만 고치면 대문 카드가 바뀐다. 실제 결제 금액은 결제 쪽 상품 설정이 따로 정한다.
 *    soon: true 인 상품은 링크 없이 "곧 열려요"로만 보인다.
 */

export type ProductIcon = "manse" | "basic" | "report" | "face" | "match" | "today";

export interface LandingProduct {
  icon: ProductIcon;
  name: string;
  desc: string;
  price: string; // "무료" 또는 "990원" 같은 표시 문자열
  href?: string;
  soon?: boolean;
  pricePending?: boolean; // 가격 미확정 (화면엔 안 보임, 관리용 표시)
}

export const LANDING_PRODUCTS: LandingProduct[] = [
  { icon: "report", name: "평생 사주 리포트", desc: "평생의 흐름을 한 권에", price: "9,900원", soon: true, pricePending: true },
  { icon: "basic", name: "기본 사주풀이", desc: "7가지 주제 풀이 · 가입하면 첫 1회 무료", price: "990원", href: "/start", pricePending: true },
  { icon: "manse", name: "만세력", desc: "여덟 글자·오행·신강신약·대운", price: "무료", href: "/start" },
  { icon: "face", name: "관상", desc: "얼굴 사진으로 보는 타고난 기질", price: "무료", href: "/face", pricePending: true },
  { icon: "match", name: "궁합", desc: "두 사람의 사주로 보는 인연", price: "990원", soon: true, pricePending: true },
  { icon: "today", name: "오늘의 운세", desc: "오늘 하루의 기운과 조심할 일", price: "무료", href: "/start?next=fortune" },
];
