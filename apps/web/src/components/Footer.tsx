import { BUSINESS_INFO } from "@/lib/businessInfo";

/**
 * 전자상거래법상 통신판매업자가 쇼핑몰 화면에 상시 노출해야 하는 최소 고지
 * 정보(상호, 대표자, 사업자등록번호, 통신판매업신고번호, 주소, 연락처) +
 * 약관/개인정보처리방침 링크. Toss Payments 가맹 심사 체크리스트의 필수
 * 항목이기도 하다.
 */
export function Footer() {
  return (
    <footer className="mt-10 border-t px-5 py-8 text-xs leading-relaxed" style={{ borderColor: "var(--color-line)", color: "var(--color-ink-faint)" }}>
      <div className="mx-auto max-w-xl">
        <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1">
          <a href="/terms" className="underline underline-offset-2">
            이용약관
          </a>
          <a href="/privacy" className="underline underline-offset-2">
            개인정보처리방침
          </a>
        </div>
        <p>
          {BUSINESS_INFO.companyName} ({BUSINESS_INFO.serviceName}) · 대표 {BUSINESS_INFO.representative}
        </p>
        <p>사업자등록번호 {BUSINESS_INFO.businessRegistrationNumber}</p>
        <p>통신판매업신고 {BUSINESS_INFO.mailOrderSalesNumber}</p>
        <p>{BUSINESS_INFO.address}</p>
        <p>고객센터 {BUSINESS_INFO.csEmail}</p>
        <p className="mt-3" style={{ color: "var(--color-ink-faint)" }}>
          모든 운세·사주·관상 콘텐츠는 전통 문화·오락 목적의 참고 정보이며, 성격·재물·건강·연애 등 미래를 과학적으로 확정하지 않습니다.
        </p>
      </div>
    </footer>
  );
}
