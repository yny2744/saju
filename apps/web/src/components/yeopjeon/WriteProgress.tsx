"use client";

import { useBgmScene } from "@/components/bgm/bgm";
import { TOPICS, type AnyTopicKey } from "@/lib/topics";

/**
 * 운세 여러 개를 한꺼번에 쓰는 동안의 화면 (수정안 42·43).
 * 운세 칸이 다 쓰일 때마다 금색으로 채워진다.
 */
export function WriteProgress({
  title,
  topics,
  done,
  failed = [],
  note,
}: {
  title: string;
  topics: AnyTopicKey[];
  done: AnyTopicKey[];
  failed?: AnyTopicKey[];
  note: string;
}) {
  useBgmScene("all");
  const total = topics.length;
  const n = done.length;
  const pct = total ? Math.round((n / total) * 100) : 0;
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-y-auto px-6 py-10" style={{ backgroundColor: "var(--color-paper)" }}>
      <p className="text-center text-[19px] font-bold" style={{ fontFamily: "var(--font-serif)" }}>
        {title}
      </p>
      <p className="mt-2 text-[14px] tabular-nums" style={{ color: "var(--color-ink-soft)" }}>
        {n} / {total} · {pct}%
      </p>
      <div className="mt-4 h-3 w-full max-w-xs overflow-hidden rounded-full" style={{ backgroundColor: "var(--color-line)" }}>
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.max(4, pct)}%`, backgroundColor: "var(--color-gold)" }} />
      </div>
      <div className="mt-6 grid w-full max-w-sm grid-cols-2 gap-2">
        {topics.map((t) => {
          const ok = done.includes(t);
          const bad = failed.includes(t);
          return (
            <div
              key={t}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] transition-colors duration-500"
              style={{
                border: `1px solid ${ok ? "var(--color-gold-line)" : "var(--color-line)"}`,
                backgroundColor: ok ? "var(--color-gold-soft)" : "var(--color-card)",
                color: ok ? "var(--color-ink)" : "var(--color-ink-faint)",
              }}
            >
              <span aria-hidden style={{ color: ok ? "var(--color-gold)" : bad ? "var(--color-danger)" : "var(--color-ink-faint)" }}>
                {ok ? "◆" : bad ? "◇" : "…"}
              </span>
              {TOPICS[t].title}
            </div>
          );
        })}
      </div>
      <p className="mt-6 max-w-xs text-center text-[12px] leading-relaxed" style={{ color: "var(--color-ink-faint)" }}>
        {note}
      </p>
    </div>
  );
}
