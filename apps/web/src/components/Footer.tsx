import { BUSINESS_INFO } from "@/lib/businessInfo";

/**
 * 전자상거래법상 통신판매업자가 쇼핑몰 화면에 상시 노출해야 하는 최소 고지
 * 정보(상호, 대표자, 사업자등록번호, 통신판매업신고번호, 주소, 연락처) +
 * 약관/개인정보처리방침 링크. Toss Payments 가맹 심사 체크리스트의 필수
 * 항목이기도 하다.
 */
export function Footer() {
  // 주소는 괄호 앞에서 줄을 나눠 보기 좋게 (괄호가 없으면 한 줄)
  const addr = BUSINESS_INFO.address;
  const cut = addr.indexOf(" (");
  const addrMain = cut > 0 ? addr.slice(0, cut) : addr;
  const addrSub = cut > 0 ? addr.slice(cut + 1) : "";
  const mail = `mailto:${BUSINESS_INFO.csEmail}?subject=${encodeURIComponent("[류결사주 문의]")}`;

  return (
    <footer className="mt-10 px-6 pb-10 pt-8 text-center text-xs leading-relaxed" style={{ color: "var(--color-ink-faint)" }}>
      <div className="mx-auto max-w-xl">
        {/* 금색 이중선 */}
        <div aria-hidden className="mx-auto mb-6 h-[4px] w-full" style={{ borderTop: "1px solid var(--color-gold-line)", borderBottom: "1px solid var(--color-gold-line)" }} />
        <nav className="mb-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[12.5px]">
          <a href="/terms" className="underline-offset-2 hover:underline">
            이용약관
          </a>
          <span aria-hidden style={{ color: "var(--color-line)" }}>
            |
          </span>
          <a href="/privacy" className="font-semibold underline-offset-2 hover:underline" style={{ color: "var(--color-ink-soft)" }}>
            개인정보처리방침
          </a>
          <span aria-hidden style={{ color: "var(--color-line)" }}>
            |
          </span>
          <a href={mail} className="font-semibold underline-offset-2 hover:underline" style={{ color: "var(--color-accent)" }}>
            문의하기
          </a>
        </nav>
        <p className="font-semibold" style={{ color: "var(--color-ink-soft)" }}>
          {BUSINESS_INFO.companyName} ({BUSINESS_INFO.serviceName}) · 대표 {BUSINESS_INFO.representative}
        </p>
        <p className="mt-1">
          <span className="inline-block">사업자등록번호 {BUSINESS_INFO.businessRegistrationNumber}</span>
          {/* 폰처럼 좁으면 두 줄로 나뉘므로 가운뎃점은 넓은 화면에서만 */}
          <span aria-hidden className="mx-1.5 hidden sm:inline">
            ·
          </span>
          <br className="sm:hidden" />
          <span className="inline-block">통신판매업신고 {BUSINESS_INFO.mailOrderSalesNumber}</span>
        </p>
        <p className="mt-1">
          <span className="inline-block">{addrMain}</span>
          {addrSub && (
            <>
              {" "}
              <span className="inline-block">{addrSub}</span>
            </>
          )}
        </p>
        <p className="mt-1">고객센터 {BUSINESS_INFO.csEmail}</p>
        <p className="mx-auto mt-5 max-w-[22rem] text-[11px]" style={{ color: "var(--color-ink-faint)" }}>
          모든 운세·사주·관상 콘텐츠는 전통 문화·오락 목적의 참고 정보이며, 성격·재물·건강·연애 등 미래를 과학적으로 확정하지 않습니다.
        </p>
        {/* 배경음악 출처 (수정안 19, 공유마당 자유이용 기증 저작물) */}
        <p className="mx-auto mt-3 max-w-[24rem] text-[10.5px] leading-relaxed" style={{ color: "var(--color-ink-faint)" }}>
          배경음악: 서예지 「Tong tong(통통) 가야금」 「How are you 가야금」 「빛의 세상으로(희망가) 가야금 버전」 ·{" "}
          <a href="https://gongu.copyright.or.kr/gongu/main/main.do" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
            공유마당(한국저작권위원회)
          </a>{" "}
          자유이용 기증 저작물
        </p>
      </div>
    </footer>
  );
}
