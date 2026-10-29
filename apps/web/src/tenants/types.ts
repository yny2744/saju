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

/**
 * 대문(gate) - 2026-10-28 류결의 명견만리(mgml)에서 시작한 "세 길·일곱 운" 대문.
 * 설정이 있는 고객사만 이 대문을 쓰고, 없으면 기존 대문 그대로다 (류결사주·인자사주는 없음).
 * 글자·그림·방(관) 목록은 모두 여기서 정한다 - 고객사마다 자기 이름과 문구로 바꿔 쓸 수 있게.
 */
export interface GateRoom {
  /** 방 이름 (예: "사주관") */
  name: string;
  /** 한 줄 설명 */
  desc: string;
  /** 누르면 갈 곳 - 없으면 "곧 열려요" */
  href?: string;
}

export interface GateUn {
  /** 주소에 쓰는 이름 (영문 소문자) - #un-<key>, /l/<key> */
  key: string;
  /** 동그라미 안 한자 (예: "命") */
  glyph: string;
  /** 대문에 보이는 짧은 이름 (예: "타고난 나") */
  short: string;
  /** 정식 이름 (예: "타고난 나의 운") */
  name: string;
  rooms: GateRoom[];
  /** 광고 랜딩(/l/<key>) 머리글 */
  landing: { headline: string; lead: string };
}

export interface GateWay {
  key: string;
  /** 예: "나를 아는 길" */
  name: string;
  /** 이 길이 답하는 물음 */
  question: string;
  uns: GateUn[];
}

export interface TenantGate {
  /** 대문 큰 제목 (예: "류결의 명견만리") */
  title: string;
  /** 엠블럼 양옆 글자 (예: "三道", "七運") */
  sideLeft: string;
  sideRight: string;
  /** 엠블럼 그림 (투명 배경 PNG) */
  emblem: string;
  /** 배경 영상·대체 그림 - 가로 화면(PC)·세로 화면(휴대폰) */
  media: { landscape: string; portrait: string; posterLandscape: string; posterPortrait: string };
  /** 소개글 - 엠블럼·제목을 누르면 창으로, 대문 아래에도 같은 글 */
  intro: { heading: string; tagline: string; paragraphs: string[]; bridge: string; credential: string; closing: string };
  ways: GateWay[];
  /** 모든 길이 맺히는 자리 (채움) */
  fruit: { glyph: string; title: string; sub: string; desc: string };
  /** 계절 랜딩 (/l/<key>) - 예: 신년운세 */
  seasonal: Array<{ key: string; glyph: string; name: string; headline: string; lead: string; rooms: GateRoom[] }>;
}

/**
 * 오픈 특가 (2026-10-29 유샘) - 지금 가격(prices)은 오픈 특가이고, 행사가 끝나면 after 의 가격으로 올린다.
 * 화면에는 줄 그은 "정가"를 쓰지 않고 "오픈 특가 · 행사 후 ○원" 으로만 보여 준다 (그 값에 판 적이 없는 정가 표시는 허위 할인이 될 수 있어서).
 * after 값이 null 이면 "오픈 특가" 표시만 붙인다. 행사가 끝나면 prices 를 after 값으로 바꾸고 openSale 을 지운다.
 */
export interface TenantOpenSale {
  label: string;
  after: Partial<Record<keyof TenantPrices, number | null>>;
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
  /** 오픈 특가 - 없으면 표시 없음 */
  openSale?: TenantOpenSale;
  /** 세 길·일곱 운 대문 - 없으면 기존 대문 */
  gate?: TenantGate;
}
