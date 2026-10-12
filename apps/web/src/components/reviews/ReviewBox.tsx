"use client";

import { useEffect, useState } from "react";
import type { PublicReview } from "@/server/reviews/reviews";
import { REVIEW_GIFT, REVIEW_MIN_CHARS, REVIEW_TITLE } from "@/lib/reviews";
import { CURRENCY_NAME, formatNyang } from "@/lib/yeopjeon";
import { notifyYeopjeonChanged, reportClientError } from "@/components/yeopjeon/useYeopjeon";
import { ReviewCard } from "./ReviewCard";

/**
 * 결과 화면 맨 아래 "1004 천사의 한마디를 남겨 주세요" (수정안 47).
 * 이 사람·이 상품에 한 번. 계정의 첫 한마디에는 엽전 990냥이 바로 들어간다.
 */
export function ReviewBox({ personId, product }: { personId: string; product: string }) {
  const [state, setState] = useState<{ review: PublicReview | null; giftLeft: boolean } | null>(null);
  const [rating, setRating] = useState(0);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    fetch(`/api/reviews/mine?personId=${encodeURIComponent(personId)}&product=${encodeURIComponent(product)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setState({ review: d.review, giftLeft: d.giftLeft }))
      .catch(() => {});
  }, [personId, product]);

  if (!state) return null;

  if (state.review) {
    return (
      <section className="mt-10">
        <p className="mb-2 text-center text-[13px] font-semibold" style={{ color: "var(--color-gold)" }}>
          남겨 주신 한마디
        </p>
        <ReviewCard r={state.review} />
        {msg && (
          <p className="mt-2 text-center text-[13px]" style={{ color: "var(--color-element-wood)" }}>
            {msg.text}
          </p>
        )}
      </section>
    );
  }

  const len = [...body.trim()].length;
  async function submit() {
    setBusy(true);
    setMsg(null);
    try {
      const r = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personId, product, rating, body }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        setMsg({ ok: false, text: d?.error?.message ?? "잠시 후 다시 시도해 주세요." });
      } else {
        if (d.gift || d.angel) notifyYeopjeonChanged();
        setState({ review: d.review, giftLeft: false });
        setMsg({
          ok: true,
          text: d.angel
            ? "축하드려요! 1,004번째 천사로 뽑히셨어요. 12가지 운세 전부 보기 엽전이 들어왔어요."
            : d.gift
              ? `고맙습니다. ${CURRENCY_NAME} ${formatNyang(d.gift)}이 들어왔어요.`
              : "고맙습니다. 소중한 한마디로 남겨 둘게요.",
        });
      }
    } catch (e) {
      reportClientError("후기 남기기", String(e));
      setMsg({ ok: false, text: "연결이 끊겼어요. 잠시 후 다시 시도해 주세요." });
    }
    setBusy(false);
  }

  return (
    <section className="mt-10 rounded-2xl p-5" style={{ border: "1px solid var(--color-gold-line)", backgroundColor: "var(--color-card)" }}>
      <h2 className="text-[17px] font-bold" style={{ fontFamily: "var(--font-serif)" }}>
        ✦ {REVIEW_TITLE}를 남겨 주세요
      </h2>
      <div className="mt-3 flex gap-1.5" role="radiogroup" aria-label="별점">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={rating === n}
            aria-label={`별 ${n}개`}
            onClick={() => setRating(n)}
            className="text-[30px] leading-none"
            style={{ color: n <= rating ? "var(--color-gold)" : "var(--color-line)" }}
          >
            ★
          </button>
        ))}
      </div>
      <textarea
        aria-label="한마디"
        value={body}
        maxLength={500}
        onChange={(e) => setBody(e.target.value)}
        rows={4}
        className="field-input mt-3"
        placeholder="풀이를 보고 느낀 점을 적어 주세요"
      />
      <p className="mt-1 text-right text-[12px] tabular-nums" style={{ color: len >= REVIEW_MIN_CHARS ? "var(--color-ink-faint)" : "var(--color-danger)" }}>
        {len}자 / {REVIEW_MIN_CHARS}자 이상
      </p>
      {state.giftLeft && (
        <p className="mt-1 text-[13px]" style={{ color: "var(--color-ink-soft)" }}>
          첫 한마디에는 {CURRENCY_NAME} {formatNyang(REVIEW_GIFT)}을 바로 드려요.
        </p>
      )}
      {msg && (
        <p className="mt-2 text-[13px]" style={{ color: msg.ok ? "var(--color-element-wood)" : "var(--color-danger)" }}>
          {msg.text}
        </p>
      )}
      <button type="button" disabled={busy || rating === 0 || len < REVIEW_MIN_CHARS} onClick={submit} className="btn-primary mt-3 disabled:opacity-50">
        {busy ? "남기는 중..." : "남기기"}
      </button>
    </section>
  );
}
