/**
 * 고객사(테넌트) 설정의 모양 - 2026-10-23 "베이직" 구조.
 *
 * 베이직 = 엔진과 모든 기능이 들어 있는 원본 코드. 브랜드가 없다.
 * 고객사 설정 = 이 모양을 채운 파일 하나 (src/tenants/<id>.ts). 브랜드명·로고 글자·문구·사업자 정보·
 *              정식 주소·가격·기능 켜기/끄기만 담는다. 류결사주도 그중 하나(ryugyeol.ts)다.
 *
 * 어떤 고객사로 빌드할지는 Vercel 환경변수 NEXT_PUBLIC_TENANT 로 고른다 (src/tenants/index.ts).
 * 기능을 고칠 때는 베이직만 고치고, 고객사마다 다른 값은 반드시 이 설정으로 뺀다.
 */

export interface TenantBrand {
  /** 서비스 이름 - 화면 머리줄·제목·PDF·알림 등 (예: "류결사주") */
  name: string;
  /** 로고 물결 위 큰 글자 (예: "류결") - 아래 작은 글자는 logoSub */
  logoText: string;
  /** 로고 아래 작은 글자 (예: "사주") */
  logoSub: string;
  /** AI 관상 해석가로 내세우는 이름 (예: "류결") */
  persona: string;
  /** 문양 위에 얹는 채널·운영자 이름 (예: "류결의 명견만리") - 없으면 빈 문자열 */
  channelName: string;
  /** 대표 슬로건 (예: "숨막혔던 나의 운명, 숨을 쉬다") */
  slogan: string;
  /** 대문 영상 한 줄 (예: "나를 알고, 인연과 복을 잇다") */
  heroTagline: string;
  /** 검색·공유에 쓰는 사이트 설명 */
  description: string;
  /** 2030 서브 브랜드 이름 (예: "류결의사주") - 없으면 name 그대로 */
  casualName: string;
}

/** 전자상거래법상 모든 화면 하단에 상시 노출하는 사업자 정보 + 약관·개인정보처리방침 공통 값 */
export interface TenantBusiness {
  companyName: string;
  representative: string;
  businessRegistrationNumber: string;
  mailOrderSalesNumber: string;
  address: string;
  csEmail: string;
  csPhone: string;
  privacyOfficer: string;
  privacyOfficerEmail: string;
}

/** 가격 (냥 = 원). 결제사 심사 중에는 바꾸지 않는다. */
export interface TenantPrices {
  BASIC: number;
  TASTE: number;
  DEEP: number;
  BUNDLE3: number;
  BUNDLE12: number;
  RENAME: number;
  NAMING: number;
  FACE: number;
  BUSINESS: number;
  CORP: number;
  BRAND: number;
  COUPLE: number;
  PREMIUM_NAME: number;
  PREMIUM_BIZ: number;
  WALLPAPER: number;
  EXAM: number;
  EXAM_DEEP: number;
}

/** 기능 켜기·끄기 - 베이직에 새 기능을 붙여도 준비 안 된 고객사는 꺼 둔다 */
export interface TenantFeatures {
  /** 프리미엄 작명(작명 + 12가지 운세 전부 보기) 판매 */
  premiumNaming: boolean;
}

/** 오행 이름 (목·화·토·금·수) */
export type GoodsElement = "목" | "화" | "토" | "금" | "수";

/** 굿즈 추천 링크 하나 - label 은 화면에 보이는 짧은 이름 (예: "초록 원목 화분") */
export interface GoodsLink {
  label: string;
  url: string;
}

/**
 * 굿즈 추천 (2026-10-26) - "나를 채우는 기운" 아래에 부족한 오행의 물건을 은근하게 보여 준다.
 * coupang: 오행별 쿠팡 파트너스 링크. 비어 있는 오행·고객사는 칸 자체가 보이지 않는다.
 * 2026-10-26 유샘: 쿠팡 링크는 유샘 링크로, 류결사주에만 넣는다 (다른 고객사는 비워 둔다).
 */
export interface TenantGoods {
  coupang: Partial<Record<GoodsElement, GoodsLink[]>>;
}

export interface TenantConfig {
  /** 설정 이름 (NEXT_PUBLIC_TENANT 값) - 영문 소문자 */
  id: string;
  brand: TenantBrand;
  business: TenantBusiness;
  /** 정식 주소 - Vercel 환경변수 SITE_URL 이 있으면 그쪽이 먼저 */
  siteUrl: string;
  prices: TenantPrices;
  features: TenantFeatures;
  goods: TenantGoods;
}
