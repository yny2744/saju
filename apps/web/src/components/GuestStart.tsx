"use client";

import { useState } from "react";
import { ConsentChecks, EMPTY_CONSENT, requiredConsentDone, type ConsentState } from "@/components/ConsentChecks";

/**
 * 비회원으로 바로 이용 (2026-10-23, 카드사 심사 "결제창 확인 불가" 반려 대응).
 * 회원가입·로그인 없이 필수 약관 동의만 받고 바로 다음 화면(결제창)으로 간다.
 * 로그인 화면 · 이어서 보기 화면 · 무료 결과 끝 버튼에서 함께 쓴다.
 */
export function GuestStart({ next, label = "비회원으로 바로 결제하기", onBeforeStart }: { next: string; label?: string; onBeforeStart?: () => void }) {
  const [consent, setConsent] = useState<ConsentState>(EMPTY_CONSENT);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    if (busy) return;
    if (!requiredConsentDone(consent)) {
      setError("필수 약관에 모두 동의해주세요.");
      return;
    }
    setBusy(true);
    setError(null);
    onBeforeStart?.();
    try {
      const res = await fetch("/api/auth/guest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(consent),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error?.message ?? "잠시 후 다시 시도해주세요.");
        setBusy(false);
        return;
      }
      window.location.href = next;
    } catch {
      setError("네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
      setBusy(false);
    }
  }

  return (
    <div className="text-left">
      <ConsentChecks value={consent} onChange={setConsent} />
      {error && (
        <p className="mt-3 rounded-lg px-3.5 py-2.5 text-sm" style={{ backgroundColor: "var(--color-danger-soft)", color: "var(--color-danger)" }}>
          {error}
        </p>
      )}
      <button type="button" onClick={start} disabled={busy} className="btn-primary mt-3 block w-full">
        {busy ? "준비 중..." : label}
      </button>
      <p className="mt-2 text-center text-[12px] leading-relaxed" style={{ color: "var(--color-ink-faint)" }}>
        회원가입 없이 결제할 수 있어요. 비회원으로 산 풀이는 이 기기·브라우저에서 30일 동안 다시 볼 수 있어요.
      </p>
    </div>
  );
}
