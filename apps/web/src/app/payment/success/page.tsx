"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type State = { status: "confirming" } | { status: "error"; message: string };

/**
 * 지시서 8조: "결제 성공 화면만 보고 상품을 지급하면 안 된다. 반드시 서버에서
 * PG 결제 결과를 검증한다." - Toss가 이 페이지로 리다이렉트하는 것 자체는
 * "결제가 끝났다"는 뜻이 아니라 "서버에 승인을 요청할 차례"라는 뜻이다.
 * 실제 상품 권한(entitlement)은 이 페이지가 아니라 서버의
 * POST /api/payments/confirm 응답으로만 발급된다.
 */
function PaymentSuccessBody() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [state, setState] = useState<State>({ status: "confirming" });

  useEffect(() => {
    const paymentKey = searchParams.get("paymentKey");
    const orderId = searchParams.get("orderId");
    const amountStr = searchParams.get("amount");
    const orderToken = sessionStorage.getItem("phase5_orderToken");

    if (!paymentKey || !orderId || !amountStr || !orderToken) {
      setState({ status: "error", message: "결제 정보가 올바르지 않습니다." });
      return;
    }

    (async () => {
      try {
        const res = await fetch("/api/payments/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderToken, paymentKey, orderId, amount: Number(amountStr) }),
        });
        const data = await res.json();

        if (!res.ok) {
          setState({ status: "error", message: data?.error?.message ?? "결제 승인에 실패했습니다." });
          return;
        }

        sessionStorage.removeItem("phase5_orderToken");
        // Phase 9: 관상 상품(FACE_PREMIUM) 결제도 이 성공 페이지를 함께 쓰므로,
        // 서버가 돌려준 productType으로 어느 결과 화면으로 보낼지만 분기한다
        // (결제 승인 로직 자체는 위에서 그대로 - 이 분기는 순수 라우팅 결정일 뿐이다).
        const entitlement = encodeURIComponent(data.entitlementToken);
        router.replace(
          data.productType === "FACE_PREMIUM" ? `/face/result/paid?entitlement=${entitlement}` : `/result/paid?entitlement=${entitlement}`
        );
      } catch {
        setState({ status: "error", message: "네트워크 오류가 발생했습니다." });
      }
    })();
  }, [router, searchParams]);

  if (state.status === "confirming") {
    return <p className="text-slate-500">결제를 확인하고 있습니다...</p>;
  }

  return (
    <div>
      <p className="text-red-600">{state.message}</p>
      <a href="/products" className="mt-4 inline-block text-sm underline">
        상품 선택으로 돌아가기
      </a>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <main className="mx-auto max-w-md px-4 py-20 text-center">
      <Suspense fallback={<p className="text-slate-500">불러오는 중...</p>}>
        <PaymentSuccessBody />
      </Suspense>
    </main>
  );
}
