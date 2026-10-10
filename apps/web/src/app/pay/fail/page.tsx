"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { PAY_BACK_KEY } from "@/lib/pay";

/** 결제창에서 실패·취소하고 돌아온 화면 - 돈은 빠지지 않았다 */
function FailBody() {
  const q = useSearchParams();
  const canceled = /CANCEL/i.test(q.get("code") ?? "");
  let back = "/mypage";
  try {
    const v = sessionStorage.getItem(PAY_BACK_KEY);
    if (v && v.startsWith("/") && !v.startsWith("//")) back = v;
  } catch {
    /* 무시 */
  }
  return (
    <main className="mx-auto max-w-xl px-5 py-16 text-center">
      <p className="text-[18px] font-bold">{canceled ? "결제를 취소했어요" : "결제가 되지 않았어요"}</p>
      <p className="mt-3 text-[14px]" style={{ color: "var(--color-ink-soft)" }}>
        돈은 빠지지 않았어요. {canceled ? "" : "잠시 후 다시 시도해 주세요."}
      </p>
      <a href={back} className="btn-primary mx-auto mt-6 block max-w-xs">
        돌아가기
      </a>
    </main>
  );
}

export default function PayFailPage() {
  return (
    <Suspense fallback={null}>
      <FailBody />
    </Suspense>
  );
}
