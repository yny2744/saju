"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Script from "next/script";

interface ProductDefinition {
  // Phase 9: 서버 카탈로그에 FACE_PREMIUM이 추가되어 GET /api/products 응답에
  // 섞여 들어올 수 있으므로, 필터링을 위해 타입에도 포함해둔다 (아래에서 걸러냄).
  productType: "FREE_BASIC" | "BASIC" | "PREMIUM" | "FACE_PREMIUM";
  name: string;
  priceKRW: number;
  features: string[];
}

declare global {
  interface Window {
    TossPayments?: (clientKey: string) => {
      requestPayment: (
        method: string,
        options: { amount: number; orderId: string; orderName: string; successUrl: string; failUrl: string }
      ) => Promise<void>;
    };
  }
}

/**
 * 지시서 18조: 상품 선택 / BASIC·PREMIUM 설명 / 결제 진행 화면.
 * 지시서 4조: 가격/기능은 이 컴포넌트에 하드코딩하지 않고 GET /api/products(서버
 * 카탈로그)에서 그대로 받아온다.
 *
 * ⚠️ 투명성 고지: 이 실행 환경에는 실제 브라우저와 Toss 테스트 키가 없어
 * `TossPayments(...).requestPayment(...)` 실제 리다이렉트 흐름 자체를 이 세션에서
 * 직접 실행해보지는 못했다. 아래 코드는 Toss v1 결제창 SDK의 공개 문서 사용법을
 * 그대로 따른 것이며, 배포 전 실제 테스트 키로 한 번은 직접 확인이 필요하다.
 */
function ProductsBody() {
  const searchParams = useSearchParams();
  const resultId = searchParams.get("resultId");

  const [products, setProducts] = useState<ProductDefinition[]>([]);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/products")
      .then((res) => res.json())
      .then((data) => setProducts(data.products ?? []));
  }, []);

  async function handlePurchase(productType: "BASIC" | "PREMIUM") {
    if (!resultId) {
      setError("먼저 무료 사주 분석을 진행한 뒤 구매해주세요.");
      return;
    }
    setPurchasing(productType);
    setError(null);

    try {
      const res = await fetch("/api/payments/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productType, resultId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error?.message ?? "주문 생성에 실패했습니다.");
        setPurchasing(null);
        return;
      }

      // PG 리다이렉트 왕복 후에도 orderToken이 필요하므로 브라우저에 잠깐 보관한다.
      // (서버 메모리가 아니라 브라우저 sessionStorage - 개인정보 아닌 주문 토큰만 저장)
      sessionStorage.setItem("phase5_orderToken", data.orderToken);

      const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY;
      if (!clientKey || !window.TossPayments) {
        setError("결제 모듈을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.");
        setPurchasing(null);
        return;
      }

      const tossPayments = window.TossPayments(clientKey);
      await tossPayments.requestPayment("카드", {
        amount: data.amountKRW,
        orderId: data.orderId,
        orderName: data.productName,
        successUrl: `${window.location.origin}/payment/success`,
        failUrl: `${window.location.origin}/payment/fail`,
      });
      // requestPayment가 성공하면 브라우저가 Toss 결제창으로 리다이렉트되므로
      // 이 아래 코드는 보통 실행되지 않는다.
    } catch {
      setError("결제 시작 중 오류가 발생했습니다.");
      setPurchasing(null);
    }
  }

  // Phase 9: 관상 전용 상품(FACE_PREMIUM)은 이 사주 결과 기반 체크아웃 화면에는
  // 표시하지 않는다 - 여기 resultId는 사주 결과이므로 관상 상품 결제를 시도하면
  // orders.ts에서 RESULT_NOT_FOUND로 막힌다. 관상 상품 결제는 /face/products에서 한다.
  const paidProducts = products.filter((p) => p.productType !== "FREE_BASIC" && p.productType !== "FACE_PREMIUM");

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <Script src="https://js.tosspayments.com/v1" strategy="afterInteractive" />
      <h1 className="mb-1 text-2xl font-bold">더 깊은 사주 해석 받아보기</h1>
      <p className="mb-6 text-sm text-slate-500">무료 분석에 이어 원하는 상품을 선택해주세요.</p>

      {error && <p className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <div className="space-y-4">
        {paidProducts.map((p) => (
          <div key={p.productType} className="rounded-md border border-slate-200 p-4">
            <div className="mb-2 flex items-baseline justify-between">
              <h2 className="font-semibold">{p.name}</h2>
              <span className="text-lg font-bold">{p.priceKRW.toLocaleString()}원</span>
            </div>
            <ul className="mb-4 list-disc pl-5 text-sm text-slate-600">
              {p.features.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
            <button
              type="button"
              disabled={purchasing !== null}
              onClick={() => handlePurchase(p.productType as "BASIC" | "PREMIUM")}
              className="w-full rounded-md bg-slate-900 px-4 py-2 font-medium text-white disabled:opacity-50"
            >
              {purchasing === p.productType ? "결제 준비 중..." : `${p.priceKRW.toLocaleString()}원 결제하기`}
            </button>
          </div>
        ))}
      </div>
    </main>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-slate-500">불러오는 중...</div>}>
      <ProductsBody />
    </Suspense>
  );
}
