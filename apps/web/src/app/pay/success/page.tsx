"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { LoadingState } from "@/components/StatusScreens";
import { notifyYeopjeonChanged } from "@/components/yeopjeon/useYeopjeon";
import { PAY_BACK_KEY } from "@/lib/pay";

/** 결제를 마치고 돌아온 화면 - 승인 요청 후 바로 그 운세로 (수정안 31) */
function SuccessBody() {
  const q = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    fetch("/api/pay/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentKey: q.get("paymentKey"), orderId: q.get("orderId"), amount: Number(q.get("amount")) }),
    })
      .then(async (r) => {
        const body = await r.json().catch(() => ({}));
        if (r.ok && typeof body.redirect === "string" && body.redirect.startsWith("/")) {
          notifyYeopjeonChanged();
          try {
            sessionStorage.removeItem(PAY_BACK_KEY);
          } catch {
            /* 무시 */
          }
          window.location.replace(body.redirect);
          return;
        }
        setError(body?.error?.message ?? "결제를 확인하지 못했어요.");
      })
      .catch(() => setError("연결이 끊겼어요. 이 화면을 새로 고침해 주세요. 결제가 두 번 되지는 않아요."));
  }, [q]);

  if (!error) return <LoadingState message="결제를 확인하고 있어요..." />;
  let back = "/mypage";
  try {
    back = sessionStorage.getItem(PAY_BACK_KEY) || back;
  } catch {
    /* 무시 */
  }
  return (
    <main className="mx-auto max-w-xl px-5 py-16 text-center">
      <p className="text-[15px]" style={{ color: "var(--color-danger)" }}>
        {error}
      </p>
      <p className="mt-3 text-[13px]" style={{ color: "var(--color-ink-soft)" }}>
        돈이 빠졌는데 운세가 열리지 않았다면 고객센터로 알려 주세요. 바로 처리해 드려요.
      </p>
      <a href={back.startsWith("/") ? back : "/mypage"} className="btn-primary mx-auto mt-6 block max-w-xs">
        돌아가기
      </a>
    </main>
  );
}

export default function PaySuccessPage() {
  return (
    <Suspense fallback={<LoadingState message="결제를 확인하고 있어요..." />}>
      <SuccessBody />
    </Suspense>
  );
}
