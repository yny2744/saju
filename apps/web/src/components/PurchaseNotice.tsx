import { BUSINESS_INFO } from "@/lib/businessInfo";

/**
 * 구매(결제) 화면 하단 안내 - 환불·청약철회·열람 가능 기간.
 * 서비스 구조(비회원 결제, 열람권한 24시간: server/entitlement.ts ENTITLEMENT_TTL_MS)와
 * 이용약관 제5조·제8조 내용을 그대로 옮긴 것이다. 셋 중 하나를 바꾸면 나머지도 같이 바꿔야 한다.
 */
export function PurchaseNotice() {
  return (
    <section
      className="mt-6 rounded-xl p-4 text-xs leading-relaxed"
      style={{ backgroundColor: "var(--color-paper-soft)", color: "var(--color-ink-soft)" }}
    >
      <h3 className="mb-2 text-[13px] font-semibold" style={{ color: "var(--color-ink)" }}>
        구매 전 꼭 확인해주세요
      </h3>
      <ul className="space-y-1.5">
        <li>
          · <b>열람 기간:</b> 결제 후 심층 해석은 결제 승인 시점부터 <b>24시간 동안</b> 열람할 수 있고, 이후에는 다시 볼 수
          없어요. 필요하시면 결과 화면을 캡처해 직접 보관해주세요.
        </li>
        <li>
          · <b>청약철회:</b> 결제 즉시 디지털 콘텐츠(해석 결과)가 제공돼요. 결제 후 7일 이내에 철회를 요청할 수 있지만,
          결과를 열람한 경우에는 「전자상거래법」 제17조 제2항에 따라 철회가 제한될 수 있어요.
        </li>
        <li>
          · <b>환불:</b> 결제는 됐지만 시스템 오류 등으로 결과를 열람하지 못한 경우, 고객센터({BUSINESS_INFO.csEmail})로
          문의하시면 전액 환불해드려요.
        </li>
        <li>
          · 모든 해석은 전통 명리학·관상학을 바탕으로 한 문화·오락 콘텐츠이며, 실제 성격·재물·연애·미래를 과학적으로
          확정하지 않아요.
        </li>
      </ul>
      <p className="mt-2">
        자세한 내용은{" "}
        <a href="/terms" className="underline underline-offset-2">
          이용약관
        </a>
        을 확인해주세요.
      </p>
    </section>
  );
}
