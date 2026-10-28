"use client";

import { useEffect, useRef } from "react";
import type { TenantGate } from "@/tenants/types";

/**
 * 소개글 (2026-10-28 mgml 2번 작업) - "천 년의 지혜와 오늘이 만나는 곳".
 * 같은 글을 두 곳에 쓴다: 엠블럼·제목을 누르면 뜨는 창, 그리고 대문 바로 아래 소개 칸.
 */
function IntroBody({ gate, headingId }: { gate: TenantGate; headingId: string }) {
  const { intro, ways, fruit } = gate;
  const serif = { fontFamily: "var(--gh-serif, var(--font-serif))" } as const;
  return (
    <div style={{ wordBreak: "keep-all" }}>
      <p className="text-center text-[13px] tracking-[0.35em]" style={{ color: "#d6bc8a", ...serif }}>
        {gate.title}
      </p>
      <h2 id={headingId} className="mt-3 text-center text-[25px] font-bold leading-snug" style={{ color: "#f4e2b8", textWrap: "balance", ...serif }}>
        {intro.heading}
      </h2>
      <p className="mt-2 text-center text-[14.5px]" style={{ color: "#c9c2b2" }}>
        {intro.tagline}
      </p>
      <div aria-hidden className="mx-auto my-6 h-px w-16" style={{ backgroundColor: "rgba(214,188,138,.6)" }} />
      <div className="space-y-4 text-[15.5px] leading-[1.85]" style={{ color: "#e7e1d3" }}>
        {intro.paragraphs.map((p) => (
          <p key={p.slice(0, 12)}>{p}</p>
        ))}
        <p className="text-[16.5px] font-bold" style={{ color: "#f4e2b8", ...serif }}>
          {intro.bridge}
        </p>
      </div>

      <div className="mt-7 space-y-5 rounded-2xl px-5 py-5" style={{ border: "1px solid rgba(214,188,138,.35)", backgroundColor: "rgba(7,11,22,.35)" }}>
        <div>
          <p className="text-[15px] font-bold" style={{ color: "#f4e2b8", ...serif }}>
            세 개의 길 · 삶에 던지는 세 가지 물음
          </p>
          <ul className="mt-2 space-y-1 text-[14.5px]" style={{ color: "#e7e1d3" }}>
            {ways.map((w) => (
              <li key={w.key}>
                <b style={{ color: "#f4e2b8" }}>{w.name}</b> · {w.question}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-[15px] font-bold" style={{ color: "#f4e2b8", ...serif }}>
            일곱 개의 운 · 물음에 답하는 삶의 일곱 자리
          </p>
          <p className="mt-2 text-[14.5px] leading-relaxed" style={{ color: "#e7e1d3" }}>
            {ways.flatMap((w) => w.uns.map((u) => `${u.glyph} ${u.short}`)).join(" · ")}
          </p>
        </div>
        <div>
          <p className="text-[15px] font-bold" style={{ color: "#f4e2b8", ...serif }}>
            {fruit.glyph} {fruit.title} · {fruit.sub}
          </p>
          <p className="mt-2 text-[14.5px] leading-relaxed" style={{ color: "#e7e1d3" }}>
            {fruit.desc}
          </p>
        </div>
      </div>

      <p className="mt-7 text-center text-[16px] font-bold leading-relaxed" style={{ color: "#f4e2b8", ...serif }}>
        {intro.closing}
      </p>
      <p className="mt-4 text-center text-[12.5px]" style={{ color: "#a9a293" }}>
        류결 · {intro.credential}
      </p>
    </div>
  );
}

/** 대문 바로 아래 소개 칸 */
export function GateIntroSection({ gate }: { gate: TenantGate }) {
  return (
    <section id="intro" className="scroll-mt-2 px-6 py-14" style={{ background: "linear-gradient(#070b16,#0e1830)" }} aria-labelledby="gh-intro-h">
      <div className="mx-auto max-w-xl">
        <IntroBody gate={gate} headingId="gh-intro-h" />
      </div>
    </section>
  );
}

/** 엠블럼·제목을 누르면 뜨는 창 */
export function GateIntroDialog({ gate, open, onClose }: { gate: TenantGate; open: boolean; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    closeRef.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="gh-dialog" role="dialog" aria-modal="true" aria-labelledby="gh-dialog-h" onClick={onClose}>
      <div className="gh-dialog-box" onClick={(e) => e.stopPropagation()}>
        <button ref={closeRef} type="button" className="gh-dialog-close" onClick={onClose} aria-label="닫기">
          ×
        </button>
        <IntroBody gate={gate} headingId="gh-dialog-h" />
        <button type="button" onClick={onClose} className="mx-auto mt-6 block rounded-xl px-8 py-3 text-[15px] font-bold" style={{ background: "linear-gradient(180deg,#e2c47e,#c9a55a)", color: "#16213a" }}>
          세 길 둘러보기
        </button>
      </div>
    </div>
  );
}
