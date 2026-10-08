"use client";

import { useEffect } from "react";
import { BUSINESS_INFO } from "@/lib/businessInfo";
import { reportClientError } from "@/components/yeopjeon/useYeopjeon";

/**
 * 화면에서 예상 못 한 오류가 났을 때 (수정안 9번). 손님에게는 다시 시도·문의 안내를 보여 주고,
 * 오류 내용(화면 주소와 오류 문구만, 손님 정보 없이)은 서버 알림으로 보낸다.
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    reportClientError(typeof window !== "undefined" ? window.location.pathname : "알 수 없음", `${error.name}: ${error.message}${error.digest ? ` (${error.digest})` : ""}`);
  }, [error]);

  return (
    <main className="mx-auto min-h-[60vh] max-w-sm px-5 pt-24 text-center">
      <p className="text-[18px] font-bold" style={{ fontFamily: "var(--font-serif)" }}>
        잠시 문제가 생겼어요
      </p>
      <p className="mt-2 text-[14px]" style={{ color: "var(--color-ink-soft)" }}>
        불편을 드려 죄송합니다. 다시 시도해 주시고, 계속되면 알려 주세요.
      </p>
      <button type="button" onClick={reset} className="btn-primary mx-auto mt-6 block w-full">
        다시 시도
      </button>
      <a href="/" className="btn-secondary mt-2.5 block">
        처음으로
      </a>
      <a href={`mailto:${BUSINESS_INFO.csEmail}?subject=${encodeURIComponent("[류결사주 문의] 오류")}`} className="mt-4 inline-block text-[13px] underline underline-offset-4" style={{ color: "var(--color-ink-soft)" }}>
        문의하기
      </a>
    </main>
  );
}
