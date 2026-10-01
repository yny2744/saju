"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { loadTossPayments, ANONYMOUS } from "@tosspayments/tosspayments-sdk";

interface ProductDefinition {
  productType: "FREE_BASIC" | "BASIC" | "PREMIUM" | "FACE_PREMIUM";
  name: string;
  priceKRW: number;
  features: string[];
}

/**
 * /products/page.tsx(사주 유료 상품)와 거의 동일한 Toss 결제 흐름이지만,
 * 관상 전용(FACE_PREMIUM)으로 분리된 화면이다. 로직을 공유 컴포넌트로
 * 추출하지 않고 독립 파일로 둔 이유는 이 프로젝트에 이미 반복된 원칙과 같다
 * (resultStore.ts/paymentTokenCodec.ts 주석 참고) - 기존 /products/page.tsx를
 * 전혀 건드리지 않기 위해서다. 결제 자체는 기존 /api/payments/orders,
 * /api/payments/confirm을 그대로 재사용한다(신규 결제 API 없음).
 */
function FaceProductsBody() {
  const searchParams = useSearchParams();
  const resultId = searchParams.get("resultId");

  const [product, setProduct] = useState<ProductDefinition | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/products")
      .then((res) => res.json())
      .then((data: { products: ProductDefinition[] }) => {
        setProduct(data.products?.find((p) => p.productType === "FACE_PREMIUM") ?? null);
      });
  }, []);

  async function handlePurchase() {
    if (!resultId) {
      setError("먼저 무료 관상 분석을 진행한 뒤 구매해주세요.");
      return;
    }
    setPurchasing(true);
    setError(null);

    try {
      const res = await fetch("/api/payments/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productType: "FACE_PREMIUM", resultId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error?.message ?? "주문 생성에 실패했습니다.");
        setPurchasing(false);
        return;
      }

      // /payment/success/page.tsx가 읽는 키와 동일하게 맞춘다 (그 페이지를 최소
      // 수정으로만 확장하기 위해 - 아래 handleConfirmPayment 응답의 productType으로
      // 사주/관상 중 어디로 리다이렉트할지만 그 페이지에서 분기한다).
      sessionStorage.setItem("phase5_orderToken", data.orderToken);

      const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY;
      if (!clientKey) {
        setError("결제 모듈을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.");
        setPurchasing(false);
        return;
      }

      const tossPayments = await loadTossPayments(clientKey);
      const payment = tossPayments.payment({ customerKey: ANONYMOUS });
      await payment.requestPayment({
        method: "CARD",
        amount: { currency: "KRW", value: data.amountKRW },
        orderId: data.orderId,
        orderName: data.productName,
        successUrl: `${window.location.origin}/payment/success`,
        failUrl: `${window.location.origin}/payment/fail`,
      });
    } catch (err) {
      const tossCode = (err as { code?: string })?.code;
      const tossMessage = (err as { message?: string })?.message;
      // eslint-disable-next-line no-console
      console.error("[관상 결제 시작 오류]", { code: tossCode, message: tossMessage, raw: err });
      setError(`결제 시작 중 오류가 발생했습니다.${tossCode ? ` (code: ${tossCode})` : ""}`);
      setPurchasing(false);
    }
  }

  return (
    <main className="mx-auto min-h-screen max-w-xl px-5 pb-20 pt-12 sm:pt-16">
      <header className="mb-8">
        <p className="section-label mb-1.5">관상 심층 해석</p>
        <h1 className="text-[26px] font-bold leading-snug">인연 관상까지, 더 깊은 해석</h1>
        <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--color-ink-soft)" }}>
          본인 관상 상세 분석과, 어울리는 인연의 관상적 특징까지 전통 관상학 관점에서 풀어드려요.
        </p>
      </header>

      {error && (
        <p className="mb-4 rounded-lg px-3.5 py-3 text-sm" style={{ backgroundColor: "var(--color-accent-soft)", color: "var(--color-accent)" }}>
          {error}
        </p>
      )}

      {product && (
        <div className="rounded-xl p-4" style={{ border: "1px solid var(--color-line)" }}>
          <div className="mb-2 flex items-baseline justify-between">
            <h2 className="font-semibold">{product.name}</h2>
            <span className="text-lg font-bold">{product.priceKRW.toLocaleString()}원</span>
          </div>
          <ul className="mb-4 space-y-1 text-sm" style={{ color: "var(--color-ink-soft)" }}>
            {product.features.map((f) => (
              <li key={f}>· {f}</li>
            ))}
          </ul>
          <button type="button" disabled={purchasing} onClick={handlePurchase} className="btn-primary">
            {purchasing ? "결제 준비 중..." : `${product.priceKRW.toLocaleString()}원 결제하기`}
          </button>
        </div>
      )}

      <p className="mt-6 text-xs leading-relaxed" style={{ color: "var(--color-ink-faint)" }}>
        모든 관상 해석은 전통 문화 콘텐츠이며, 성격·운명·재산·건강·연애를 과학적으로 확정하지 않습니다. 인연의
        관상적 특징은 실제 상대방을 분석한 것이 아닌 일반적인 전통 해석입니다.
      </p>
    </main>
  );
}

export default function FaceProductsPage() {
  return (
    <Suspense fallback={<div className="py-24 text-center text-sm">불러오는 중...</div>}>
      <FaceProductsBody />
    </Suspense>
  );
}
