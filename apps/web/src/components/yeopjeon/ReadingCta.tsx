"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isAuthEnabled } from "@/lib/launchMode";
import { CURRENCY_NAME, PENDING_RESULT_KEY, PRICE, WELCOME_GIFT, formatNyang } from "@/lib/yeopjeon";
import { focusLabel, type Focus } from "@/lib/focus";
import { FOCUS_TOPICS, TOPICS, TOPIC_KEYS, type TopicKey } from "@/lib/topics";
import { CONTINUE_PATH, savePendingIntent } from "@/lib/intent";
import { reportClientError } from "./useYeopjeon";

const GOLD = "var(--color-gold)";

type Me = { nickname: string; termsAgreed: boolean } | null;

/**
 * 무료 결과 끝 "이어서 보기" (2026-10-09 수정안 20: 맛보기 대신 운세 하나 990냥).
 *  - 12가지 운세 중 하나를 고른다 (관심 분야가 있으면 그 운세들을 앞에 강조)
 *  - 로그인 전: [카카오로 가입하고 ○○ 운세 보기] → 가입 → /continue → 그 운세 화면 (가입 선물 990냥으로 결제)
 *  - 로그인 후: [○○ 운세 보기 · 990냥] → 그 운세 화면(구매 창). 몰아보기·전부 보기도 바로 갈 수 있다.
 */
export function ReadingCta({ resultId, nickname, focus }: { resultId: string; nickname: string; focus?: Focus }) {
  const router = useRouter();
  const [me, setMe] = useState<Me | "loading">("loading");
  const highlighted: TopicKey[] = focus ? FOCUS_TOPICS[focus] : [];
  const [picked, setPicked] = useState<TopicKey>(highlighted[0] ?? "nature");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthEnabled()) return setMe(null);
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : { user: null }))
      .then((d) => setMe(d.user ?? null))
      .catch(() => setMe(null));
  }, []);

  if (!isAuthEnabled()) return null;

  const order: TopicKey[] = [...highlighted, ...TOPIC_KEYS.filter((k) => !highlighted.includes(k))];
  const title = TOPICS[picked].title;

  /** 로그인 전 / 약관 동의 전: 고른 운세를 기억해 두고 가입하러 간다 */
  const rememberPick = () => {
    savePendingIntent(resultId, { kind: "topic", topic: picked });
    try {
      localStorage.setItem(PENDING_RESULT_KEY, resultId);
    } catch {
      /* 무시 */
    }
  };

  /** 로그인 후: 풀이 대상(사람)을 만들고 그 운세·묶음 화면으로 */
  async function go(dest: (personId: string) => string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/persons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resultId }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.id) {
        router.push(dest(body.id));
        return;
      }
      setError(body?.error?.message ?? "잠시 후 다시 시도해 주세요.");
    } catch (e) {
      reportClientError("결과 화면 이어서 보기", String(e));
      setError("연결이 끊겼어요. 잠시 후 다시 시도해 주세요.");
    }
    setBusy(false);
  }

  const next = encodeURIComponent(CONTINUE_PATH);
  let action: React.ReactNode;
  if (me === "loading") {
    action = <div className="h-[56px]" />;
  } else if (!me) {
    action = (
      <>
        <a
          href={`/api/auth/kakao/start?next=${next}`}
          onClick={rememberPick}
          className="block rounded-xl py-4 text-center text-[17px] font-bold"
          style={{ backgroundColor: "#fee500", color: "#191600" }}
        >
          카카오로 가입하고 {title} 운세 보기
        </a>
        <p className="mt-2 text-center text-[13px]" style={{ color: "var(--color-ink-soft)" }}>
          가입 선물 {CURRENCY_NAME} {formatNyang(WELCOME_GIFT)} · 운세 하나를 무료로 볼 수 있어요
        </p>
        <a href={`/login?next=${next}`} onClick={rememberPick} className="mt-1 block text-center text-[12px] underline underline-offset-4" style={{ color: "var(--color-ink-faint)" }}>
          이메일로 가입하기
        </a>
      </>
    );
  } else if (!me.termsAgreed) {
    action = (
      <a href={`/consent?next=${next}`} onClick={rememberPick} className="btn-primary block text-center">
        약관 동의하고 {title} 운세 보기
      </a>
    );
  } else {
    action = (
      <>
        <button
          type="button"
          onClick={() => go((id) => `/person/${id}/${picked}`)}
          disabled={busy}
          className="btn-band block w-full rounded-xl py-4 text-[17px] font-bold disabled:opacity-60"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          {title} 운세 보기 · {formatNyang(PRICE.BASIC)}
        </button>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button type="button" disabled={busy} onClick={() => go((id) => `/person/${id}?buy=bundle3`)} className="rounded-xl px-2 py-3 text-[13px] font-semibold disabled:opacity-60" style={{ border: "1px solid var(--color-gold-line)" }}>
            3가지 운세 몰아보기
            <span className="block text-[12px] font-normal" style={{ color: GOLD }}>
              {formatNyang(PRICE.BUNDLE3)}
            </span>
          </button>
          <button type="button" disabled={busy} onClick={() => go((id) => `/person/${id}?buy=bundle12`)} className="rounded-xl px-2 py-3 text-[13px] font-semibold disabled:opacity-60" style={{ border: "1px solid var(--color-gold-line)" }}>
            12가지 운세 전부 보기
            <span className="block text-[12px] font-normal" style={{ color: GOLD }}>
              {formatNyang(PRICE.BUNDLE12)}
            </span>
          </button>
        </div>
      </>
    );
  }

  return (
    <section className="gold-card mb-8 rounded-2xl p-5">
      <p className="text-center text-[13px]" style={{ color: GOLD }}>
        이어서 보기 · 운세 하나 {formatNyang(PRICE.BASIC)}
      </p>
      <h2 className="mt-1 text-center text-[20px] font-bold leading-snug" style={{ fontFamily: "var(--font-serif)" }}>
        {nickname}님의 12가지 운세
      </h2>
      <p className="mt-1 text-center text-[13px]" style={{ color: "var(--color-ink-faint)" }}>
        보고 싶은 운세를 하나 골라 주세요
        {focus && ` · 관심 분야(${focusLabel(focus)})를 앞에 두었어요`}
      </p>

      <ul className="mt-4 grid grid-cols-3 gap-1.5">
        {order.map((k) => {
          const on = picked === k;
          return (
            <li key={k}>
              <button
                type="button"
                onClick={() => setPicked(k)}
                aria-pressed={on}
                className="flex w-full items-center justify-center gap-1 rounded-lg px-1.5 py-2 text-[12.5px] leading-tight"
                style={{
                  border: on ? "2px solid var(--color-accent)" : "1px solid var(--color-line)",
                  backgroundColor: on ? "var(--color-accent-soft)" : highlighted.includes(k) ? "var(--color-gold-soft)" : "var(--color-paper-soft)",
                  fontWeight: on ? 700 : 500,
                }}
              >
                <span aria-hidden className="text-[13px] font-bold" style={{ fontFamily: "var(--font-serif)", color: "var(--color-gold)" }}>
                  {TOPICS[k].hanja}
                </span>
                <span>{TOPICS[k].title}</span>
              </button>
            </li>
          );
        })}
      </ul>

      <div className="mt-5">{action}</div>
      {error && (
        <p className="mt-3 text-center text-[13px]" style={{ color: "var(--color-danger)" }}>
          {error}
        </p>
      )}
    </section>
  );
}
