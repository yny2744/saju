"use client";

import { isAuthEnabled } from "@/lib/launchMode";
import { CURRENCY_NAME, WELCOME_GIFT, formatNyang } from "@/lib/yeopjeon";
import { safeNext } from "@/lib/safeNext";
import { ConsentChecks, EMPTY_CONSENT, requiredConsentDone, type ConsentState } from "@/components/ConsentChecks";
import { ComingSoon } from "@/components/ComingSoon";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const ERROR_MESSAGES: Record<string, string> = {
  kakao_not_configured: "카카오 로그인은 아직 준비 중이에요.",
  kakao_denied: "카카오 로그인이 취소됐어요.",
  kakao_failed: "카카오 로그인 중 오류가 발생했어요. 다시 시도해주세요.",
};

function LoginPageBody() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlError = searchParams.get("error");
  // 로그인 후 돌아갈 화면 (예: 무료 사주 입력 화면). 우리 사이트 안의 경로만 허용.
  const next = safeNext(searchParams.get("next")) ?? "/";
  const [consent, setConsent] = useState<ConsentState>(EMPTY_CONSENT);

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(urlError ? ERROR_MESSAGES[urlError] ?? null : null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    if (mode === "signup" && !requiredConsentDone(consent)) {
      setError("필수 약관에 모두 동의해주세요.");
      return;
    }
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mode === "signup" ? { email, password, nickname, ...consent } : { email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error?.message ?? "요청에 실패했습니다.");
        setSubmitting(false);
        return;
      }
      // 이메일 로그인인데 아직 약관 동의 기록이 없는 예전 계정이면 동의 화면을 먼저 거친다
      if (mode === "login" && data?.user && !data.user.termsAgreed) {
        router.push(`/consent?next=${encodeURIComponent(next)}`);
        return;
      }
      router.push(next);
      router.refresh();
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
      <h1 className={`${isAuthEnabled() ? "mb-2" : "mb-7"} text-[24px] font-bold`}>{mode === "login" ? "로그인" : "회원가입"}</h1>
      {isAuthEnabled() && (
        <p className="mb-7 text-sm leading-relaxed" style={{ color: "var(--color-ink-soft)" }}>
          카카오로 가입하면 <b>{CURRENCY_NAME} {formatNyang(WELCOME_GIFT)}</b>을 선물로 드려요. 12가지 운세 중 하나를 무료로 보실 수 있어요.
        </p>
      )}

      <button
        type="button"
        onClick={() => {
          window.location.href = `/api/auth/kakao/start?next=${encodeURIComponent(next)}`;
        }}
        className="mb-5 block w-full rounded-full py-3 text-center text-sm font-medium"
        style={{ backgroundColor: "#fee500", color: "#191600" }}
      >
        카카오로 시작하기
      </button>

      <div className="mb-5 flex items-center gap-3">
        <div className="h-px flex-1" style={{ backgroundColor: "var(--color-line)" }} />
        <span className="text-xs" style={{ color: "var(--color-ink-faint)" }}>
          또는 이메일로
        </span>
        <div className="h-px flex-1" style={{ backgroundColor: "var(--color-line)" }} />
      </div>

      <form onSubmit={handleSubmit} className="space-y-3.5">
        {mode === "signup" && (
          <div>
            <label htmlFor="nickname" className="mb-1.5 block text-sm font-medium">
              닉네임
            </label>
            <input
              id="nickname"
              type="text"
              required
              maxLength={20}
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="field-input"
            />
          </div>
        )}
        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm font-medium">
            이메일
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="field-input"
          />
        </div>
        <div>
          <label htmlFor="password" className="mb-1.5 block text-sm font-medium">
            비밀번호
          </label>
          <input
            id="password"
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="field-input"
            placeholder="8자 이상"
          />
        </div>

        {mode === "signup" && <ConsentChecks value={consent} onChange={setConsent} />}

        {error && (
          <p className="rounded-lg px-3.5 py-2.5 text-sm" style={{ backgroundColor: "var(--color-danger-soft)", color: "var(--color-danger)" }}>
            {error}
          </p>
        )}

        <button type="submit" disabled={submitting} className="btn-primary">
          {submitting ? "처리 중..." : mode === "login" ? "로그인" : "회원가입"}
        </button>
      </form>

      <button
        type="button"
        onClick={() => {
          setMode(mode === "login" ? "signup" : "login");
          setError(null);
        }}
        className="mt-4 block w-full text-center text-sm underline underline-offset-4"
        style={{ color: "var(--color-ink-soft)" }}
      >
        {mode === "login" ? "계정이 없으신가요? 회원가입" : "이미 계정이 있으신가요? 로그인"}
      </button>
    </main>
  );
}

export default function LoginPage() {
  if (!isAuthEnabled()) return <ComingSoon title="로그인" />;
  return (
    <Suspense fallback={<div className="py-24 text-center text-sm">불러오는 중...</div>}>
      <LoginPageBody />
    </Suspense>
  );
}
