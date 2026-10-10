"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isAuthEnabled } from "@/lib/launchMode";
import { CONTINUE_PATH, clearPendingIntent, intentDestination, intentLabel, intentQuery, readPendingIntent, type Intent } from "@/lib/intent";
import { CURRENCY_NAME, PRICE, WELCOME_GIFT, formatNyang } from "@/lib/yeopjeon";
import { LoadingState, ErrorState } from "@/components/StatusScreens";

/**
 * 생년월일 입력 뒤 이어 가기 (2026-10-09 수정안 20·24).
 *   기억해 둔 "무엇을 보려 했는지" → 로그인 안 했으면 가입 안내 → 로그인했으면 풀이 대상(사람)을 만들고
 *   그 운세 화면 / 몰아보기 / 전부 보기 구매 창으로 보낸다. 카카오·이메일 로그인 뒤 이 주소로 돌아온다.
 */

type State =
  | { status: "loading" }
  | { status: "login"; intent: Intent }
  | { status: "error"; message: string; retry: string };

export default function ContinuePage() {
  const router = useRouter();
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    const pending = readPendingIntent();
    if (!pending) {
      setState({ status: "error", message: "이어서 볼 정보가 없어요. 처음부터 다시 골라 주세요.", retry: "/" });
      return;
    }
    const { resultId, intent } = pending;
    if (!isAuthEnabled()) {
      setState({ status: "error", message: "지금은 회원 기능을 준비 중이에요.", retry: "/" });
      return;
    }
    (async () => {
      const me = await fetch("/api/auth/me")
        .then((r) => (r.ok ? r.json() : { user: null }))
        .catch(() => ({ user: null }));
      if (!me.user) return setState({ status: "login", intent });
      if (!me.user.termsAgreed) {
        window.location.replace(`/consent?next=${encodeURIComponent(CONTINUE_PATH)}`);
        return;
      }
      const res = await fetch("/api/persons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resultId }),
      }).catch(() => null);
      const body = res ? await res.json().catch(() => ({})) : {};
      if (res?.ok && body.id) {
        clearPendingIntent();
        router.replace(intentDestination(body.id, intent));
        return;
      }
      if (res?.status === 410) clearPendingIntent();
      setState({
        status: "error",
        message: body?.error?.message ?? "잠시 후 다시 시도해 주세요.",
        retry: `/start?${intentQuery(intent)}`,
      });
    })();
  }, [router]);

  if (state.status === "loading") return <LoadingState message="이어서 준비하고 있어요..." />;
  if (state.status === "error") return <ErrorState message={state.message} linkHref={state.retry} linkLabel="다시 하기" />;

  const label = intentLabel(state.intent);
  const price = state.intent.kind === "topic" ? PRICE.BASIC : state.intent.kind === "bundle" ? PRICE.BUNDLE3 : PRICE.BUNDLE12;
  const next = encodeURIComponent(CONTINUE_PATH);
  return (
    <main className="mx-auto min-h-screen max-w-md px-5 pb-16 pt-14 text-center">
      <div className="gold-ornament" aria-hidden>
        <i />
      </div>
      <h1 className="mt-3 text-[24px] font-bold leading-snug" style={{ fontFamily: "var(--font-serif)" }}>
        {label}
      </h1>
      <p className="mt-2 text-[15px]" style={{ color: "var(--color-ink-soft)" }}>
        {CURRENCY_NAME} {formatNyang(price)} · 가입하면 바로 이어서 볼 수 있어요
      </p>
      <a
        href={`/api/auth/kakao/start?next=${next}`}
        className="mt-8 block rounded-xl py-4 text-[17px] font-bold"
        style={{ backgroundColor: "#fee500", color: "#191600" }}
      >
        카카오로 가입하고 이어서 보기
      </a>
      <p className="mt-3 text-[14px]" style={{ color: "var(--color-ink-soft)" }}>
        가입 선물 {CURRENCY_NAME} {formatNyang(WELCOME_GIFT)} · 12가지 운세 중 하나를 무료로 볼 수 있어요
      </p>
      <a href={`/login?next=${next}`} className="mt-4 inline-block text-[13px] underline underline-offset-4" style={{ color: "var(--color-ink-faint)" }}>
        이메일로 가입·로그인하기
      </a>
    </main>
  );
}
