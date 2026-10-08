"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isAuthEnabled } from "@/lib/launchMode";
import { CURRENCY_NAME, PENDING_RESULT_KEY, PRICE, RESUME_RESULT_PATH, WELCOME_GIFT, formatNyang } from "@/lib/yeopjeon";
import { focusLabel, type Focus } from "@/lib/focus";
import { FOCUS_TOPICS, TOPICS, TOPIC_KEYS } from "@/lib/topics";
import { InviteCard } from "./InviteCard";
import { WritingOverlay } from "./WritingOverlay";
import { reportClientError, useYeopjeon } from "./useYeopjeon";

const GOLD = "#9a7a45";
const WRITING_STEPS = ["사주 여덟 글자를 다시 살피고 있어요", "타고난 성향과 큰 흐름을 보고 있어요", "연애·재물·일을 풀고 있어요", "건강과 사람 복을 보고 있어요", "마지막으로 다듬고 있어요"];

type Me = { nickname: string; termsAgreed: boolean } | null;

/**
 * 무료 결과 끝 "이어서 보기" (2026-10-08 12가지 운 구조).
 *  - 로그인 전: 가려진 12가지 운 + "카카오로 가입하고 무료로 맛보기"(가입 선물 엽전으로 첫 맛보기 무료)
 *  - 로그인 후: 엽전으로 맛보기(990냥) → AI 풀이 → /reading/[id]
 *               또는 바로 몰아보기·전부 보기를 고르러 /person/[id] 로
 *  - 엽전 부족: 친구 초대 안내 (결제는 결제사 승인 후 연다)
 */
export function ReadingCta({ resultId, nickname, focus }: { resultId: string; nickname: string; focus?: Focus }) {
  const router = useRouter();
  const [me, setMe] = useState<Me | "loading">("loading");
  const [busy, setBusy] = useState<"taste" | "person" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [short, setShort] = useState(false);
  const { data: wallet, loading: walletLoading } = useYeopjeon(me !== "loading" && me !== null && me.termsAgreed);

  useEffect(() => {
    if (!isAuthEnabled()) return setMe(null);
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : { user: null }))
      .then((d) => setMe(d.user ?? null))
      .catch(() => setMe(null));
  }, []);

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
  const highlighted: string[] = focus ? FOCUS_TOPICS[focus] : [];

  async function startTaste() {
    setBusy("taste");
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
      if (body?.error?.code === "INSUFFICIENT_YEOPJEON") setShort(true);
      else setError(body?.error?.message ?? "잠시 후 다시 시도해 주세요.");
    } catch (e) {
      reportClientError("결과 화면 맛보기", String(e));
      setError("연결이 끊겼어요. 잠시 후 다시 시도해 주세요.");
    }
    setBusy(null);
  }

  /** 맛보기 없이 바로 깊게 보기·몰아보기·전부 보기로 */
  async function goPerson(pick?: string) {
    setBusy("person");
    setError(null);
    try {
      const res = await fetch("/api/persons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resultId }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.id) {
        router.push(`/person/${body.id}${pick ? `?buy=${pick}` : ""}`);
        return;
      }
      setError(body?.error?.message ?? "잠시 후 다시 시도해 주세요.");
    } catch (e) {
      reportClientError("결과 화면 바로 가기", String(e));
      setError("연결이 끊겼어요. 잠시 후 다시 시도해 주세요.");
    }
    setBusy(null);
  }

  let action: React.ReactNode;
  if (me === "loading" || (me && me.termsAgreed && walletLoading)) {
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
          카카오로 가입하고 무료로 맛보기
        </a>
        <p className="mt-2 text-center text-[13px]" style={{ color: "var(--color-ink-soft)" }}>
          가입 선물 {CURRENCY_NAME} {formatNyang(WELCOME_GIFT)} · 첫 맛보기는 무료예요
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
  } else {
    const balance = wallet?.balance ?? 0;
    action = (
      <>
        {short || balance < PRICE.TASTE ? (
          <>
            <p className="mb-3 text-center text-[14px]" style={{ color: "var(--color-ink-soft)" }}>
              {CURRENCY_NAME}이 부족해요 (남은 {CURRENCY_NAME} {formatNyang(balance)}). 결제는 곧 열려요.
              <br />
              친구를 초대하면 {CURRENCY_NAME}을 받을 수 있어요.
            </p>
            {wallet && <InviteCard refCode={wallet.refCode} invited={wallet.invited} />}
            <button type="button" onClick={startTaste} disabled={busy !== null} className="mt-3 block w-full text-center text-[13px] underline underline-offset-4" style={{ color: "var(--color-ink-soft)" }}>
              이 사람 맛보기를 이미 보셨다면 다시 열기
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={startTaste}
              disabled={busy !== null}
              className="block w-full rounded-xl py-4 text-[17px] font-bold text-white disabled:opacity-60"
              style={{ backgroundColor: "var(--color-accent)" }}
            >
              {CURRENCY_NAME} {formatNyang(PRICE.TASTE)}으로 맛보기
            </button>
            <p className="mt-2 text-center text-[13px]" style={{ color: "var(--color-ink-soft)" }}>
              남은 {CURRENCY_NAME} {formatNyang(balance)} · 이미 본 맛보기는 다시 차감되지 않아요
            </p>
          </>
        )}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button type="button" disabled={busy !== null} onClick={() => goPerson("bundle3")} className="rounded-xl px-2 py-3 text-[13px] font-semibold disabled:opacity-60" style={{ border: "1px solid #d8c49a" }}>
            3가지 몰아보기
            <span className="block text-[12px] font-normal" style={{ color: GOLD }}>
              {formatNyang(PRICE.BUNDLE3)}
            </span>
          </button>
          <button type="button" disabled={busy !== null} onClick={() => goPerson("bundle12")} className="rounded-xl px-2 py-3 text-[13px] font-semibold disabled:opacity-60" style={{ border: "1px solid #d8c49a" }}>
            12가지 전부 보기
            <span className="block text-[12px] font-normal" style={{ color: GOLD }}>
              {formatNyang(PRICE.BUNDLE12)}
            </span>
          </button>
        </div>
      </>
    );
  }

  return (
    <section className="mb-8 rounded-2xl p-5" style={{ border: "1px solid #d8c49a", backgroundColor: "#fffdf8" }}>
      <p className="text-center text-[13px]" style={{ color: GOLD }}>
        이어서 보기 · 맛보기 {formatNyang(PRICE.TASTE)}
      </p>
      <h2 className="mt-1 text-center text-[20px] font-bold leading-snug" style={{ fontFamily: "var(--font-serif)" }}>
        {nickname}님의 12가지 운
      </h2>
      <p className="mt-1 text-center text-[13px]" style={{ color: "var(--color-ink-faint)" }}>
        지금 {TOPIC_KEYS.length}가지 운이 가려져 있어요
        {focus && ` · 관심 분야(${focusLabel(focus)})는 가장 자세히 풀어 드려요`}
      </p>

      <ul className="mt-4 grid grid-cols-3 gap-1.5">
        {TOPIC_KEYS.map((k) => {
          const hot = highlighted.includes(k);
          return (
            <li
              key={k}
              className="flex items-center justify-between gap-1 rounded-lg px-2 py-2 text-[12.5px] leading-tight"
              style={{ backgroundColor: hot ? "var(--color-accent-soft)" : "var(--color-paper-soft)", fontWeight: hot ? 700 : 500 }}
            >
              <span>{TOPICS[k].title}</span>
              <span aria-hidden="true" className="text-[11px]" style={{ color: "var(--color-ink-faint)" }}>
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

      {busy === "taste" && <WritingOverlay title={`${nickname}님의 맛보기 풀이를 쓰고 있어요`} steps={WRITING_STEPS} />}
    </section>
  );
}
