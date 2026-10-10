"use client";

import { useEffect, useState } from "react";

function toTop() {
  const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
}

/** 맨 위로 가기 버튼 (2026-10-09 수정안 25) - 대문 맨 아래에 놓는 큰 버튼 */
export function ScrollTopButton({ className = "", label = "맨 위로" }: { className?: string; label?: string }) {
  return (
    <button type="button" onClick={toTop} className={className}>
      <span aria-hidden>▲</span> {label}
    </button>
  );
}

/**
 * 화면을 어느 정도 내리면 오른쪽 아래에 떠 있는 "맨 위로" 버튼 (모든 화면 공통).
 * 액자(.site-frame) 안쪽 오른쪽에 붙고, 아래 고정 바(z-30)·팝업보다 아래(z-25)에 놓인다.
 */
export function FloatingScrollTop() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 700);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  if (!show) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-5 z-[25] mx-auto max-w-[640px] px-5">
      <button
        type="button"
        onClick={toTop}
        aria-label="맨 위로"
        className="btn-band pointer-events-auto ml-auto flex h-12 w-12 flex-col items-center justify-center rounded-full text-[11px] font-bold leading-none"
      >
        <span aria-hidden className="text-[14px]">
          ▲
        </span>
        <span className="mt-0.5">위로</span>
      </button>
    </div>
  );
}
