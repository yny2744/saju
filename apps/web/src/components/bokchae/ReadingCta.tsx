"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isAuthEnabled } from "@/lib/launchMode";
import { BOKCHAE_NAME, PENDING_RESULT_KEY, RESUME_RESULT_PATH, SAJU_READING_PRICE, WELCOME_GIFT, formatWon } from "@/lib/bokchae";
import { focusLabel, type Focus } from "@/lib/focus";
import { InviteCard } from "./InviteCard";
import { useBokchae } from "./useBokchae";

const GOLD = "#9a7a45";
const TOPICS = ["타고난 성향", "연애·결혼", "재물", "직업·일", "건강", "인간관계", "올해의 흐름"];
const FOCUS_TOPICS: Record<Focus, string[]> = {
  love: ["연애·결혼"],
  work: ["직업·일", "재물"],
  health: ["건강"],
  relationship: ["인간관계"],
};
const WRITING_STEPS = ["사주 여덟 글자를 다시 살피고 있어요", "타고난 성향을 풀고 있어요", "연애·재물·직업을 풀고 있어요", "올해의 흐름을 정리하고 있어요", "마지막으로 다듬고 있어요"];

type Me = { nickname: string; termsAgreed: boolean } | null;

/**
 * 무료 결과 끝 "이어서 보기" (2026-10-06 상용화 구조).
 *  - 로그인 전: 가려진 주제 목록 + "카카오로 가입하고 무료로 보기"(가입 선물 복채로 첫 풀이 무료)
 *  - 로그인 후: 복채로 990원 사주보기 → AI 풀이 생성 → /reading/[id]
 *  - 복채 부족: 친구 초대 안내 (결제는 결제사 승인 후 연다)
 */
export function ReadingCta({ resultId, nickname, focus }: { resultId: string; nickname: string; focus?: Focus }) {
  const router = useRouter();
  const [me, setMe] = useState<Me | "loading">("loading");
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [short, setShort] = useState(false);
  const { data: bokchae, loading: bokchaeLoading } = useBokchae(me !== "loading" && me !== null && me.termsAgreed);

  useEffect(() => {
    if (!isAuthEnabled()) return setMe(null);
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : { user: null }))
      .then((d) => setMe(d.user ?? null))
      .catch(() => setMe(null));
  }, []);

  useEffect(() => {
    if (!busy) return;
    const t = setInterval(() => setStep((s) => Math.min(WRITING_STEPS.length - 1, s + 1)), 8000);
    return () => clearInterval(t);
  }, [busy]);

  if (!isAuthEnabled()) return null;

  // 결과 토큰이 길어서 로그인 후 돌아올 주소에 못 싣는다 → 브라우저에 잠깐 기억해 두고 짧은 주소로 돌아온다
  const here = RESUME_RESULT_PATH;
  const remember = () => {
    try {
      localStorage.setItem(PENDING_RESULT_KEY, resultId);
    } catch {
      /* 저장 못 해도 가입은 진행 - 돌아와서 다시 입력하면 됨 */
    }
  };
  const highlighted = focus ? FOCUS_TOPICS[focus] : [];

  async function start() {
    setBusy(true);
    setStep(0);
    setError(null);
    try {
      const res = await fetch("/api/readings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resultId }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.id) {
        router.push(`/reading/${body.id}`);
        return;
      }
      if (body?.error?.code === "INSUFFICIENT_BOKCHAE") setShort(true);
      else setError(body?.error?.message ?? "잠시 후 다시 시도해 주세요.");
    } catch {
      setError("연결이 끊겼어요. 잠시 후 다시 시도해 주세요.");
    }
    setBusy(false);
  }

  let action: React.ReactNode;
  if (me === "loading" || (me && me.termsAgreed && bokchaeLoading)) {
    action = <div className="h-[56px]" />;
  } else if (!me) {
    action = (
      <>
        <a
          href={`/api/auth/kakao/start?next=${encodeURIComponent(here)}`}
          onClick={remember}
          className="block rounded-xl py-4 text-center text-[17px] font-bold"
          style={{ backgroundColor: "#fee500", color: "#191600" }}
        >
          카카오로 가입하고 무료로 보기
        </a>
        <p className="mt-2 text-center text-[13px]" style={{ color: "var(--color-ink-soft)" }}>
          가입 선물 {BOKCHAE_NAME} {formatWon(WELCOME_GIFT)} · 첫 사주보기는 무료예요
        </p>
        <a href={`/login?next=${encodeURIComponent(here)}`} onClick={remember} className="mt-1 block text-center text-[12px] underline underline-offset-4" style={{ color: "var(--color-ink-faint)" }}>
          이메일로 가입하기
        </a>
      </>
    );
  } else if (!me.termsAgreed) {
    action = (
      <a href={`/consent?next=${encodeURIComponent(here)}`} onClick={remember} className="btn-primary block text-center">
        약관 동의하고 이어서 보기
      </a>
    );
  } else if (short || (bokchae && bokchae.balance < SAJU_READING_PRICE)) {
    action = (
      <>
        <p className="mb-3 text-center text-[14px]" style={{ color: "var(--color-ink-soft)" }}>
          {BOKCHAE_NAME}가 부족해요 (남은 {BOKCHAE_NAME} {formatWon(bokchae?.balance ?? 0)}). 결제는 곧 열려요.
          <br />
          친구를 초대하면 {BOKCHAE_NAME}를 받을 수 있어요.
        </p>
        {bokchae && <InviteCard refCode={bokchae.refCode} invited={bokchae.invited} />}
        <button type="button" onClick={start} disabled={busy} className="mt-3 block w-full text-center text-[13px] underline underline-offset-4" style={{ color: "var(--color-ink-soft)" }}>
          이 사람 풀이를 이미 보셨다면 다시 열기
        </button>
      </>
    );
  } else {
    action = (
      <>
        <button
          type="button"
          onClick={start}
          disabled={busy}
          className="block w-full rounded-xl py-4 text-[17px] font-bold text-white disabled:opacity-60"
          style={{ backgroundColor: "var(--color-accent)" }}
        >
          {BOKCHAE_NAME} {formatWon(SAJU_READING_PRICE)}으로 이어서 보기
        </button>
        <p className="mt-2 text-center text-[13px]" style={{ color: "var(--color-ink-soft)" }}>
          남은 {BOKCHAE_NAME} {formatWon(bokchae?.balance ?? 0)} · 이미 본 풀이는 다시 차감되지 않아요
        </p>
      </>
    );
  }

  return (
    <section className="mb-8 rounded-2xl p-5" style={{ border: "1px solid #d8c49a", backgroundColor: "#fffdf8" }}>
      <p className="text-center text-[13px]" style={{ color: GOLD }}>
        이어서 보기 · {formatWon(SAJU_READING_PRICE)}
      </p>
      <h2 className="mt-1 text-center text-[20px] font-bold leading-snug" style={{ fontFamily: "var(--font-serif)" }}>
        {nickname}님의 사주풀이
      </h2>
      <p className="mt-1 text-center text-[13px]" style={{ color: "var(--color-ink-faint)" }}>
        지금 {TOPICS.length}개 주제가 가려져 있어요
        {focus && ` · 관심 분야(${focusLabel(focus)})는 가장 자세히 풀어 드려요`}
      </p>

      <ul className="mt-4 grid grid-cols-2 gap-2">
        {TOPICS.map((t) => {
          const hot = highlighted.includes(t);
          return (
            <li
              key={t}
              className="flex items-center justify-between rounded-lg px-3 py-2.5 text-[14px]"
              style={{ backgroundColor: hot ? "var(--color-accent-soft)" : "var(--color-paper-soft)", fontWeight: hot ? 700 : 500 }}
            >
              {t}
              <span aria-hidden="true" style={{ color: "var(--color-ink-faint)" }}>
                🔒
              </span>
            </li>
          );
        })}
      </ul>

      <div className="mt-5">{action}</div>
      {error && (
        <p className="mt-3 text-center text-[13px]" style={{ color: "var(--color-accent)" }}>
          {error}
        </p>
      )}

      {busy && (
        <div className="fixed inset-0 z-40 flex flex-col items-center justify-center px-6" style={{ backgroundColor: "var(--color-paper)" }}>
          <div className="h-14 w-14 animate-spin rounded-full" style={{ border: "4px solid var(--color-line)", borderTopColor: "var(--color-accent)" }} />
          <p className="mt-6 text-center text-[17px] font-semibold">{nickname}님의 사주풀이를 쓰고 있어요</p>
          <p className="mt-2 text-center text-sm" style={{ color: "var(--color-ink-soft)" }}>
            {WRITING_STEPS[step]}
          </p>
          <p className="mt-6 text-center text-[12px]" style={{ color: "var(--color-ink-faint)" }}>
            30초~1분 정도 걸려요. 화면을 닫지 말아 주세요.
          </p>
        </div>
      )}
    </section>
  );
}
