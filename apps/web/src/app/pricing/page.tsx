import { BUSINESS_INFO } from "@/lib/businessInfo";
import { FREE_ITEMS, formatWon, paidProducts } from "@/lib/pricingList";

export const metadata = { title: `상품·가격 안내 | ${BUSINESS_INFO.serviceName}` };

/**
 * 상품·가격 안내 (2026-10-19, 결제 심사용). 로그인 없이 누구나 볼 수 있다.
 * 판매하는 상품·가격·제공 방식·환불을 한 곳에 모았다 - 가격은 lib/yeopjeon.ts 의 PRICE 에서 읽어 와
 * 결제 금액과 항상 같다 (lib/pricingList.ts).
 */
export default function PricingPage() {
  const rows = paidProducts();
  return (
    <main className="mx-auto min-h-screen max-w-xl px-5 pb-10 pt-12 sm:pt-16">
      <p className="section-label mb-1.5">상품 안내</p>
      <h1 className="mb-3 text-[26px] font-bold leading-snug">상품·가격 안내</h1>
      <p className="mb-8 text-sm leading-relaxed" style={{ color: "var(--color-ink-soft)" }}>
        {BUSINESS_INFO.serviceName}은 입력하신 생년월일·출생시간·성별을 바탕으로 사주·운세·관상·이름 풀이 결과를 웹사이트에서 보여 드리는 디지털 콘텐츠 서비스입니다. 오락·참고 목적의 서비스입니다.
      </p>

      <section className="mb-9">
        <h2 className="mb-3 text-lg font-bold">무료로 볼 수 있는 것</h2>
        <ul className="space-y-2">
          {FREE_ITEMS.map((f) => (
            <li key={f.name} className="rounded-xl px-4 py-3 text-sm" style={{ border: "1px solid var(--color-gold-line)", backgroundColor: "var(--color-card)" }}>
              <span className="font-bold">{f.name}</span>
              <span className="block text-[13px]" style={{ color: "var(--color-ink-soft)" }}>
                {f.desc}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mb-9">
        <h2 className="mb-1 text-lg font-bold">유료 상품</h2>
        <p className="mb-3 text-[13px]" style={{ color: "var(--color-ink-faint)" }}>
          가격은 부가세 포함입니다. 결제하면 바로 웹사이트에서 열람할 수 있어요.
        </p>
        <ul className="space-y-2">
          {rows.map((p) => (
            <li key={p.name} className="flex items-start justify-between gap-3 rounded-xl px-4 py-3" style={{ border: "1px solid var(--color-gold-line)", backgroundColor: "var(--color-card)" }}>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-bold">{p.name}</span>
                <span className="mt-0.5 block text-[13px]" style={{ color: "var(--color-ink-soft)" }}>
                  {p.desc}
                </span>
              </span>
              <span className="shrink-0 text-[15px] font-bold tabular-nums" style={{ color: "var(--color-accent)" }}>
                {formatWon(p.price)}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mb-9 space-y-2 text-sm leading-relaxed" style={{ color: "var(--color-ink-soft)" }}>
        <h2 className="mb-1 text-lg font-bold" style={{ color: "var(--color-ink)" }}>
          제공 방식과 환불
        </h2>
        <p>· 실물 배송은 없으며, 결제가 승인되면 웹사이트에서 바로 열람합니다. (작명서·사주 책자는 PDF로 내려받습니다.)</p>
        <p>· 일부 풀이 문장은 AI가 작성하며, 사주 계산은 자체 계산 엔진이 합니다.</p>
        <p>· 풀이를 열어 보기 전이면 결제일로부터 7일 이내 전액 환불됩니다. 열람한 디지털 콘텐츠의 환불은 이용약관에 따라 제한될 수 있습니다.</p>
        <p>
          · 자세한 내용은{" "}
          <a href="/terms" className="underline underline-offset-2">
            이용약관
          </a>
          과{" "}
          <a href="/privacy" className="underline underline-offset-2">
            개인정보처리방침
          </a>
          을 확인해 주세요.
        </p>
      </section>

      <section className="rounded-xl px-4 py-4 text-sm leading-relaxed" style={{ backgroundColor: "var(--color-paper-soft)", color: "var(--color-ink-soft)" }}>
        <p className="font-bold" style={{ color: "var(--color-ink)" }}>
          문의
        </p>
        <p className="mt-1">
          {BUSINESS_INFO.companyName} ({BUSINESS_INFO.serviceName}) · 대표 {BUSINESS_INFO.representative}
        </p>
        <p>
          고객센터{" "}
          <a href={`tel:${BUSINESS_INFO.csPhone.replace(/-/g, "")}`} className="underline underline-offset-2">
            {BUSINESS_INFO.csPhone}
          </a>{" "}
          · {BUSINESS_INFO.csEmail}
        </p>
      </section>

      <p className="mt-8 text-center">
        <a href="/" className="text-sm underline underline-offset-4" style={{ color: "var(--color-ink-soft)" }}>
          처음으로
        </a>
      </p>
    </main>
  );
}
