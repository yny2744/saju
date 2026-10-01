"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { loadTossPayments, ANONYMOUS } from "@tosspayments/tosspayments-sdk";

interface ProductDefinition {
  // Phase 9: 서버 카탈로그에 FACE_PREMIUM이 추가되어 GET /api/products 응답에
  // 섞여 들어올 수 있으므로, 필터링을 위해 타입에도 포함해둔다 (아래에서 걸러냄).
  productType: "FREE_BASIC" | "BASIC" | "PREMIUM" | "FACE_PREMIUM";
  name: string;
  priceKRW: number;
  features: string[];
}

/**
 * 지시서 18조: 상품 선택 / BASIC·PREMIUM 설명 / 결제 진행 화면.
 * 지시서 4조: 가격/기능은 이 컴포넌트에 하드코딩하지 않고 GET /api/products(서버
 * 카탈로그)에서 그대로 받아온다.
 *
 * ⚠️ 2026-10 수정: 기존에 쓰던 `<script src="https://js.tosspayments.com/v1">` +
 * `window.TossPayments(key).requestPayment("카드", {...})` 방식(Toss 구버전
 * API)이 실제 테스트 키로 결제창을 열 때 `COMMON_ERROR`("처리 중 오류가
 * 발생했습니다")를 반환하는 것을 실제 배포 환경에서 확인했다. Toss의 현재
 * 권장 연동 방식인 `@tosspayments/tosspayments-sdk` npm 패키지(`loadTossPayments`
 * + `payment.requestPayment({ method, amount: {currency, value}, ... })`)로
 * 교체한다. 결제 승인(confirm) 서버 로직은 그대로다 - 바뀌는 건 "결제창을 여는
 * 브라우저 쪽 호출 방식"뿐이다.
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
      if (!clientKey) {
        setError("결제 모듈을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.");
        setPurchasing(null);
        return;
      }

      // 아직 회원 시스템이 없는 단계라 customerKey는 비회원 결제용 ANONYMOUS를 쓴다
      // (지시서상 로그인/회원 시스템은 다음 Phase에서 도입 예정).
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
      // requestPayment가 성공하면 브라우저가 Toss 결제창으로 리다이렉트되므로
      // 이 아래 코드는 보통 실행되지 않는다.
    } catch (err) {
      // 원인 파악을 위해 콘솔에 실제 에러를 남긴다 (사용자에게 노출되는 문구는 그대로 안전하게 유지).
      // eslint-disable-next-line no-console
      console.error("[결제 시작 오류]", err);
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
