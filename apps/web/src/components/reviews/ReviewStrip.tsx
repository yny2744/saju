"use client";

import { useEffect, useState } from "react";
import type { PublicReview } from "@/server/reviews/reviews";
import { REVIEW_TITLE } from "@/lib/reviews";
import { ReviewCard } from "./ReviewCard";

/**
 * 1004 천사의 한마디 보여 주기 (수정안 47) - 관리자가 올린 후기만. 하나도 없으면 아무것도 그리지 않는다.
 *   variant "strip": 대문 - 옆으로 넘겨 보는 카드 + 더 보기
 *   variant "mini" : 구매 창 아래 - 1~2장
 */
export function ReviewStrip({
  topic,
  naming,
  face,
  variant = "strip",
  title,
}: {
  topic?: string;
  naming?: boolean;
  face?: boolean;
  variant?: "strip" | "mini";
  title?: string;
}) {
  const [list, setList] = useState<PublicReview[]>([]);
  useEffect(() => {
    const q = new URLSearchParams({ limit: variant === "mini" ? "2" : "8" });
    if (topic) q.set("topic", topic);
    if (naming) q.set("naming", "1");
    if (face) q.set("face", "1");
    fetch(`/api/reviews?${q}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { reviews: [] }))
      .then((d: { reviews?: PublicReview[] }) => setList(d.reviews ?? []))
      .catch(() => setList([]));
  }, [topic, naming, face, variant]);

  if (list.length === 0) return null;

  if (variant === "mini") {
    return (
      <section className="mt-6">
        <p className="mb-2 text-center text-[13px] font-semibold" style={{ color: "var(--color-gold)" }}>
          {title ?? REVIEW_TITLE}
        </p>
        <div className="space-y-2.5">
          {list.map((r) => (
            <ReviewCard key={r.id} r={r} />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="my-10" aria-label={REVIEW_TITLE}>
      <div className="mb-3 text-center">
        <div className="gold-ornament" aria-hidden>
          <i />
        </div>
        <h2 className="mt-2 text-[20px] font-bold" style={{ fontFamily: "var(--font-serif)" }}>
          {title ?? `✦ ${REVIEW_TITLE}`}
        </h2>
      </div>
      <div className="-mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-2">
        {list.map((r) => (
          <ReviewCard key={r.id} r={r} className="w-[78%] max-w-[300px] shrink-0 snap-center" />
        ))}
      </div>
      <a href="/reviews" className="mt-3 block text-center text-[13px] underline underline-offset-4" style={{ color: "var(--color-ink-soft)" }}>
        한마디 더 보기 →
      </a>
    </section>
  );
}
