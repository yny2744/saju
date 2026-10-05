"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { isAuthEnabled } from "@/lib/launchMode";
import { safeNext } from "@/lib/safeNext";
import { ComingSoon } from "@/components/ComingSoon";
import { ConsentChecks, EMPTY_CONSENT, requiredConsentDone, type ConsentState } from "@/components/ConsentChecks";

/** 카카오로 처음 로그인한 사람이 거치는 약관 동의 화면 (수정안 3번) */
function ConsentBody() {
  const searchParams = useSearchParams();
  const next = safeNext(searchParams.get("next")) ?? "/";
  const [consent, setConsent] = useState<ConsentState>(EMPTY_CONSENT);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!requiredConsentDone(consent) || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(consent),
      });
      if (res.status === 401) {
        window.location.href = `/login?next=${encodeURIComponent(next)}`;
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error?.message ?? "저장에 실패했어요. 다시 시도해주세요.");
        setSubmitting(false);
        return;
      }
      window.location.href = next;
    } catch {
      setError("네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto min-h-screen max-w-sm px-5 pb-16 pt-14 sm:pt-20">
      <p className="mb-1 text-sm font-semibold" style={{ fontFamily: "var(--font-serif)", color: "var(--color-accent)" }}>
        류결사주
      </p>
      <h1 className="mb-2 text-[24px] font-bold">반가워요!</h1>
      <p className="mb-6 text-sm leading-relaxed" style={{ color: "var(--color-ink-soft)" }}>
        시작하기 전에 약관을 확인해주세요. 한 번만 하면 다음부터는 바로 이용할 수 있어요.
      </p>
      <ConsentChecks value={consent} onChange={setConsent} />
      {error && (
        <p className="mt-4 rounded-lg px-3.5 py-2.5 text-sm" style={{ backgroundColor: "var(--color-accent-soft)", color: "var(--color-accent)" }}>
          {error}
        </p>
      )}
      <button type="button" disabled={!requiredConsentDone(consent) || submitting} onClick={handleSubmit} className="btn-primary mt-6">
        {submitting ? "처리 중..." : "동의하고 시작하기"}
      </button>
    </main>
  );
}

export default function ConsentPage() {
  if (!isAuthEnabled()) return <ComingSoon title="약관 동의" />;
  return (
    <Suspense fallback={<div className="py-24 text-center text-sm">불러오는 중...</div>}>
      <ConsentBody />
    </Suspense>
  );
}
