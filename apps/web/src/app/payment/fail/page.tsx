"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

/**
 * 지시서 14조: 결제 취소/실패/사용자 이탈을 정상적으로 처리한다.
 * PG가 돌려주는 code/message는 사용자에게 그대로 노출해도 되는 수준의 안내
 * 문구이지만(카드사 거절, 사용자 취소 등), 서버 내부 상세는 애초에 이 리다이렉트
 * 값에 담기지 않으므로 별도 필터링이 필요 없다.
 */
function PaymentFailBody() {
  const searchParams = useSearchParams();
  const message = searchParams.get("message") ?? "결제가 완료되지 않았습니다.";

  return (
    <div>
      <p className="text-red-600">{message}</p>
      <a href="/products" className="mt-4 inline-block text-sm underline">
        다시 시도하기
      </a>
    </div>
  );
}

export default function PaymentFailPage() {
  return (
    <main className="mx-auto max-w-md px-4 py-20 text-center">
      <Suspense fallback={<p className="text-slate-500">불러오는 중...</p>}>
        <PaymentFailBody />
      </Suspense>
    </main>
  );
}
