import type { PublicReview } from "@/server/reviews/reviews";

/** 후기 카드 한 장 - 금테, 별점, 가린 이름 · 상품 (수정안 47) */
export function ReviewCard({ r, className = "" }: { r: PublicReview; className?: string }) {
  return (
    <figure
      className={`rounded-2xl p-4 ${className}`}
      style={{
        border: "1px solid var(--color-gold-line)",
        backgroundColor: "var(--color-card)",
        boxShadow: "inset 0 0 0 3px var(--color-card), inset 0 0 0 4px var(--color-gold-soft)",
      }}
    >
      <p aria-label={`별 ${r.rating}개`} className="text-[15px] tracking-[0.15em]" style={{ color: "var(--color-gold)" }}>
        {"★".repeat(r.rating)}
        <span style={{ color: "var(--color-line)" }}>{"★".repeat(5 - r.rating)}</span>
      </p>
      <blockquote className="mt-2 text-[14.5px] leading-[1.75]" style={{ fontFamily: "var(--font-serif)" }}>
        “{r.body}”
      </blockquote>
      <figcaption className="mt-3 text-[12px]" style={{ color: "var(--color-ink-faint)" }}>
        {r.name} · {r.productLabel}
        {r.gifted && <span className="block">후기 선물을 받았어요</span>}
      </figcaption>
    </figure>
  );
}
