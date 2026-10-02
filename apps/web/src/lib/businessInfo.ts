/**
 * 전자상거래법상 쇼핑몰 하단에 반드시 노출해야 하는 사업자 정보, 그리고
 * 약관/개인정보처리방침에서 공통으로 참조하는 값들을 한 곳에 모아둔다.
 * 사업자등록증·통신판매업신고증 원본 그대로 옮긴 값이다 - 다른 값으로
 * 추측해서 채우지 않았다.
 */
export const BUSINESS_INFO = {
  serviceName: "류결사주",
  companyName: "엔와이(NY)",
  representative: "유남영",
  businessRegistrationNumber: "485-16-02724",
  mailOrderSalesNumber: "제2026-서울강남-00670호",
  address: "서울특별시 강남구 양재대로55길 10, 102동 1116호 (일원동, 수서1단지 에스에이치빌)",
  csEmail: "yny1967@gmail.com",
  /** 별도 지정된 개인정보 보호책임자가 없는 소규모 사업자라, 대표자가 겸임한다. */
  privacyOfficer: "유남영",
  privacyOfficerEmail: "yny1967@gmail.com",
} as const;
