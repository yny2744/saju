import type { TenantConfig } from "./types";

/**
 * 1번 고객사: 류결사주 (엔와이(NY) · 대표 유남영).
 * 새 고객사는 이 파일을 복사해 src/tenants/<id>.ts 로 만들고, Vercel 환경변수 NEXT_PUBLIC_TENANT=<id> 로 빌드한다.
 * 2026-10-23 베이직 분리 때 코드 곳곳에 있던 값을 그대로 옮겼다 - 값을 바꾸면 류결사주 화면이 바뀐다.
 * ⚠️ 카드사 심사 중(2026-10-24~)에는 사업자 정보·가격·주소를 바꾸지 않는다.
 */
export const ryugyeol: TenantConfig = {
  id: "ryugyeol",
  brand: {
    name: "류결사주",
    logoText: "류결",
    logoSub: "사주",
    persona: "류결",
    channelName: "류결의 명견만리",
    slogan: "숨막혔던 나의 운명, 숨을 쉬다",
    heroTagline: "나를 알고, 인연과 복을 잇다",
    description: "류결사주 — 생년월일시를 입력하고 사주·오늘의 운세·관상 해석을 받아보세요.",
    casualName: "류결의사주",
  },
  // 사업자등록증·통신판매업신고증 원본 그대로 옮긴 값 - 추측해서 채우지 않는다
  business: {
    companyName: "엔와이(NY)",
    representative: "유남영",
    businessRegistrationNumber: "485-16-02724",
    mailOrderSalesNumber: "제2026-서울강남-00670호",
    address: "서울특별시 강남구 양재대로55길 10, 102동 1116호 (일원동, 수서1단지 에스에이치빌)",
    csEmail: "yny1967@gmail.com",
    /** 고객센터 전화 (2026-10-19 유샘 제공, 결제 심사 필수 항목) */
    csPhone: "010-2620-2744",
    /** 별도 지정된 개인정보 보호책임자가 없는 소규모 사업자라, 대표자가 겸임한다. */
    privacyOfficer: "유남영",
    privacyOfficerEmail: "yny1967@gmail.com",
  },
  siteUrl: "https://saju-web-khaki.vercel.app",
  /** 2026-10-14 유샘 확정: 만 원 위 상품도 900으로 끝냄. 2026-10-17 포트원 심사용: 작명 29,900, 프리미엄 39,900 */
  /** 2026-10-29 유샘 확정 (오픈 가격): 부가세가 딱 떨어지는 값(11로 나누어 떨어짐)으로 맞춤.
   *  4,900 → 5,500(행사 후 11,000) · 전부 보기 19,800(행사 후 29,700) · 개명·아이 작명 22,000(행사 후 33,000)
   *  상호 38,500(행사 후 55,000) · 기업·브랜드 55,000(행사 후 77,000). 990·9,900 은 그대로. */
  prices: {
    BASIC: 990,
    TASTE: 990,
    DEEP: 5500,
    BUNDLE3: 9900,
    BUNDLE12: 19800,
    RENAME: 22000,
    NAMING: 22000,
    FACE: 5500,
    BUSINESS: 38500,
    CORP: 55000,
    BRAND: 55000,
    COUPLE: 19900,
    PREMIUM_NAME: 39900,
    PREMIUM_BIZ: 39900,
    WALLPAPER: 990,
    EXAM: 990,
    EXAM_DEEP: 5500,
  },
  openSale: {
    label: "오픈 특가",
    after: { BASIC: null, DEEP: 11000, FACE: 11000, EXAM_DEEP: 11000, BUNDLE12: 29700, RENAME: 33000, NAMING: 33000, BUSINESS: 55000, CORP: 77000, BRAND: 77000 },
  },
  features: {
    // 2026-10-17 유샘: 포트원 심사 기간에는 프리미엄 작명 단추 자체를 숨김
    premiumNaming: false,
  },
  /**
   * 2026-10-26 굿즈 추천 - 유샘의 쿠팡 파트너스 링크 (류결사주에만).
   * 오행마다 { label: "화면에 보일 이름", url: "https://link.coupang.com/a/..." } 를 2~3개씩 넣는다.
   * 비어 있는 오행은 굿즈 칸이 보이지 않는다 (쿠팡 파트너스 승인 전에도 배포해도 된다).
   * 예) 목: [{ label: "원목 화분", url: "https://link.coupang.com/a/xxxx" }],
   */
  goods: {
    coupang: {
      목: [],
      화: [],
      토: [],
      금: [],
      수: [],
    },
  },
};

export default ryugyeol;
