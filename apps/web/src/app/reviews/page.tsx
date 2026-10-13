"use client";

import { useEffect, useState } from "react";
import type { PublicReview } from "@/server/reviews/reviews";
import { REVIEW_TITLE } from "@/lib/reviews";
import { ReviewCard } from "@/components/reviews/ReviewCard";

/** 1004 천사의 한마디 전체 (수정안 47) - 관리자가 올린 후기만, 최신순 */
const TABS = [
  { key: "all", label: "전체", test: () => true },
  { key: "basic", label: "운세 보기", test: (r: PublicReview) => r.product.startsWith("basic:") },
  { key: "deep", label: "깊게 보기", test: (r: PublicReview) => r.product.startsWith("deep:") },
  { key: "name", label: "작명·개명", test: (r: PublicReview) => r.product === "naming" || r.product === "rename" || r.product === "business" },
  { key: "face", label: "관상", test: (r: PublicReview) => r.product === "face" },
] as const;

export default function ReviewsPage() {
  const [list, setList] = useState<PublicReview[] | null>(null);
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("all");
  useEffect(() => {
    fetch("/api/reviews?limit=100")
      .then((r) => (r.ok ? r.json() : { reviews: [] }))
      .then((d: { reviews?: PublicReview[] }) => setList(d.reviews ?? []))
      .catch(() => setList([]));
  }, []);
  const t = TABS.find((x) => x.key === tab)!;
  const shown = (list ?? []).filter(t.test);
  return (
    <main className="mx-auto min-h-screen max-w-xl px-5 pb-20 pt-12 sm:pt-16">
      <header className="mb-6 text-center">
        <div className="gold-ornament" aria-hidden>
          <i />
        </div>
        <h1 className="mt-3 text-[26px] font-bold" style={{ fontFamily: "var(--font-serif)" }}>
          ✦ {REVIEW_TITLE}
        </h1>
        <p className="mt-2 text-[13.5px]" style={{ color: "var(--color-ink-soft)" }}>
          풀이를 받아 보신 분들이 남겨 주신 한마디예요.
        </p>
      </header>
      <div className="mb-5 grid grid-cols-5 gap-1.5">
        {TABS.map((x) => (
          <button
            key={x.key}
            type="button"
            onClick={() => setTab(x.key)}
            className="rounded-xl px-1 py-2 text-[12px] font-semibold"
            style={{ border: tab === x.key ? "2px solid var(--color-accent)" : "1px solid var(--color-line)", backgroundColor: tab === x.key ? "var(--color-accent-soft)" : "var(--color-card)" }}
          >
            {x.label}
          </button>
        ))}
      </div>
      {list === null ? null : shown.length === 0 ? (
        <p className="py-10 text-center text-[14px]" style={{ color: "var(--color-ink-faint)" }}>
          아직 이곳에 걸린 한마디가 없어요.
        </p>
      ) : (
        <div className="space-y-3">
          {shown.map((r) => (
            <ReviewCard key={r.id} r={r} />
          ))}
        </div>
      )}
      <a href="/" className="btn-secondary mt-8 block text-center">
        처음으로
      </a>
    </main>
  );
}
