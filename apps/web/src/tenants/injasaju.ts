import type { TenantConfig } from "./types";

/**
 * 2번 고객사: 인자사주 (仁慈, 대표 이인자) - 2026-10-24 브랜드명만 바꾼 시험판.
 * ⚠️ 사업자 정보·정식 주소는 아직 받지 않아 "미정"으로 둔다. 실제 공개 전에 반드시 고객사 원본 서류 값으로 채운다.
 *    (류결사주 사업자 정보를 그대로 쓰면 남의 사업자로 표시되므로 복사하지 않았다)
 * 가격·문구는 류결사주와 같게 시작 - 고객사와 정하면 바꾼다. "류결의 명견만리"(유샘 채널)는 넣지 않는다.
 */
const injasaju: TenantConfig = {
  id: "injasaju",
  brand: {
    name: "인자사주",
    logoText: "인자",
    logoSub: "사주",
    persona: "인자",
    channelName: "",
    slogan: "숨막혔던 나의 운명, 숨을 쉬다",
    heroTagline: "나를 알고, 인연과 복을 잇다",
    description: "인자사주 — 생년월일시를 입력하고 사주·오늘의 운세·관상 해석을 받아보세요.",
    casualName: "인자사주",
  },
  business: {
    companyName: "(미정)",
    representative: "이인자",
    businessRegistrationNumber: "(미정)",
    mailOrderSalesNumber: "(미정)",
    address: "(미정)",
    csEmail: "(미정)",
    csPhone: "(미정)",
    privacyOfficer: "이인자",
    privacyOfficerEmail: "(미정)",
  },
  siteUrl: "https://injasaju.vercel.app",
  prices: {
    BASIC: 990,
    TASTE: 990,
    DEEP: 4900,
    BUNDLE3: 9900,
    BUNDLE12: 29900,
    RENAME: 29900,
    NAMING: 29900,
    FACE: 4900,
    BUSINESS: 29900,
    CORP: 29900,
    BRAND: 29900,
    COUPLE: 19900,
    PREMIUM_NAME: 39900,
    PREMIUM_BIZ: 39900,
    WALLPAPER: 990,
    EXAM: 990,
    EXAM_DEEP: 4900,
  },
  features: {
    premiumNaming: false,
  },
  // 2026-10-26 유샘: 쿠팡 굿즈 링크는 류결사주에만 - 인자사주는 비워 둔다 (굿즈 칸이 보이지 않음)
  goods: { coupang: {} },
};

export default injasaju;
