import { PREMIUM_ON, PRICE } from "@/lib/yeopjeon";
import type { TenantPrices } from "@/tenants/types";
import { isSuneungOn } from "@/lib/launchMode";

/**
 * 상품·가격 안내 페이지(/pricing)에 보여 줄 목록 (2026-10-19, 결제 심사용 - 로그인 없이 볼 수 있는 가격표).
 * 가격은 lib/yeopjeon.ts 의 PRICE 에서 그대로 읽는다 - 화면에 보이는 금액과 결제 금액이 늘 같다.
 * "지금 사이트에서 실제로 살 수 있는 것"만 담는다: 프리미엄 작명은 PREMIUM_ON, 수능대박운은 NEXT_PUBLIC_SUNEUNG=on 일 때만 나온다.
 */

export interface PriceRow {
  /** 오픈 특가 표시용 가격 이름 */
  key?: keyof TenantPrices;
  name: string;
  desc: string;
  /** 원 (1냥 = 1원) */
  price: number;
}

export const FREE_ITEMS: Array<{ name: string; desc: string }> = [
  { name: "만세력", desc: "여덟 글자·오행·신강신약·대운" },
  { name: "오늘·내일의 운세", desc: "내 사주와 그날 기운으로 보는 하루 운세" },
  { name: "띠별 운세", desc: "생년월일 없이 띠만 골라 보는 오늘·내일 운세" },
  { name: "이름 풀이", desc: "내 이름의 수리·오행이 사주와 맞는지 보기" },
  { name: "관상", desc: "얼굴 특징으로 보는 기본 관상 풀이" },
  { name: "연인 궁합 미리보기", desc: "두 사람의 사주로 보는 궁합 점수 미리보기" },
];

export function paidProducts(): PriceRow[] {
  const rows: PriceRow[] = [
    { key: "BASIC", name: "운세 보기 (1가지)", desc: "12가지 주제 중 고른 한 가지의 기본 풀이 (회원 가입 시 선물 엽전으로 1회 무료)", price: PRICE.BASIC },
    { key: "DEEP", name: "운세 깊게 보기 (1가지)", desc: "12가지 주제(성향·연애·결혼·재물·취업·승진·사업·건강·인간관계·자녀가족·올해·평생대운) 중 고른 한 가지를 길게 풀이", price: PRICE.DEEP },
    { name: "3가지 운세 몰아보기", desc: "고른 운세 3가지를 한꺼번에 깊게 보기", price: PRICE.BUNDLE3 },
    { key: "BUNDLE12", name: "12가지 운세 전부 보기", desc: "12가지 운세 전체 깊게 보기 + 월별 운세·개운법, 내려받는 사주 책자(PDF)", price: PRICE.BUNDLE12 },
    { key: "FACE", name: "관상 심층 풀이", desc: "얼굴 비율과 (동의한 경우) 사진으로 보는 관상 심층 풀이", price: PRICE.FACE },
    { name: "연인 궁합", desc: "실제 두 사람의 사주로 보는 궁합 긴 풀이", price: PRICE.COUPLE },
    { key: "RENAME", name: "개명 추천", desc: "지금 이름 진단 + 새 이름 후보 5개, 작명서(PDF)", price: PRICE.RENAME },
    { key: "NAMING", name: "아이 작명", desc: "이름 후보 7개(돌림자 반영) + 이름 이야기, 작명서(PDF)", price: PRICE.NAMING },
    { key: "BUSINESS", name: "상호 작명", desc: "대표자 사주와 업종 오행에 맞춘 가게·회사 이름 후보 7개, 작명서(PDF)", price: PRICE.BUSINESS },
    { key: "CORP", name: "기업 작명", desc: "회사·법인 이름 후보 7개(한자·한글·영문 표기), 작명서(PDF)", price: PRICE.CORP },
    { key: "BRAND", name: "브랜드 작명", desc: "제품·서비스 브랜드 이름 후보 7개, 작명서(PDF)", price: PRICE.BRAND },
  ];
  if (PREMIUM_ON) {
    rows.push(
      { name: "프리미엄 작명 (아이·상호)", desc: "12가지 운세 전부 보기와 함께 작명 1건", price: PRICE.PREMIUM_NAME },
      { name: "프리미엄 작명 (기업·브랜드)", desc: "12가지 운세 전부 보기와 함께 작명 1건", price: PRICE.PREMIUM_BIZ }
    );
  }
  if (isSuneungOn()) {
    rows.push(
      { name: "수능대박운 가볍게 보기", desc: "내 사주로 보는 수능 시즌 운세", price: PRICE.EXAM },
      { key: "EXAM_DEEP", name: "수능대박운 깊게 보기", desc: "수능 시즌 운세 긴 풀이", price: PRICE.EXAM_DEEP }
    );
  }
  return rows;
}

export function formatWon(n: number): string {
  return `${n.toLocaleString("ko-KR")}원`;
}
