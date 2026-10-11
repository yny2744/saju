"use client";

import { useState } from "react";
import { useBgmScene } from "@/components/bgm/bgm";
import { TOPICS, isAnyTopicKey } from "@/lib/topics";
import { reportClientError } from "./useYeopjeon";

/**
 * 사주 책자 PDF 받기 (2026-10-12 수정안 38).
 * 깊게 보기가 열린 운세를 모두 담는다. 아직 안 열어 본(안 써진) 운세는 받기 전에 하나씩 마저 쓴다 - 유샘: "열어 보지 않은 것도 다 보내 줘야지".
 */
function Progress({ done, total, current }: { done: number; total: number; current: string }) {
  useBgmScene("all");
  const pct = total ? Math.round((done / total) * 100) : 0;
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center px-8" style={{ backgroundColor: "var(--color-paper)" }}>
      <p className="text-[18px] font-bold" style={{ fontFamily: "var(--font-serif)" }}>
        사주 책자를 만들고 있어요
      </p>
      <p className="mt-2 text-center text-[14px]" style={{ color: "var(--color-ink-soft)" }}>
        {current}
      </p>
      <div className="mt-6 h-3 w-full max-w-xs overflow-hidden rounded-full" style={{ backgroundColor: "var(--color-line)" }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${Math.max(4, pct)}%`, backgroundColor: "var(--color-gold)" }} />
      </div>
      <p className="mt-2 text-[13px] tabular-nums" style={{ color: "var(--color-ink-faint)" }}>
        {done} / {total}
      </p>
      <p className="mt-6 text-center text-[12px]" style={{ color: "var(--color-ink-faint)" }}>
        아직 열어 보지 않은 운세도 모두 써서 담고 있어요. 화면을 닫지 말아 주세요.
      </p>
    </div>
  );
}

export function PdfButton({ personId, className = "" }: { personId: string; className?: string }) {
  const [state, setState] = useState<{ done: number; total: number; current: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const base = `/api/persons/${encodeURIComponent(personId)}`;

  async function download(): Promise<boolean | string[]> {
    const r = await fetch(`${base}/pdf`);
    if (r.status === 409) {
      const body = await r.json().catch(() => ({}));
      return Array.isArray(body.missing) ? (body.missing as string[]) : [];
    }
    if (!r.ok) {
      const body = await r.json().catch(() => ({}));
      throw new Error(body?.error?.message ?? "책자를 만들지 못했어요.");
    }
    const blob = await r.blob();
    const cd = r.headers.get("Content-Disposition") ?? "";
    const m = cd.match(/filename\*=UTF-8''([^;]+)/);
    const name = m ? decodeURIComponent(m[1]) : "류결사주.pdf";
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
    return true;
  }

  async function onClick() {
    setError(null);
    setState({ done: 0, total: 1, current: "책자를 준비하고 있어요" });
    try {
      let res = await download();
      if (Array.isArray(res)) {
        const missing = res.filter(isAnyTopicKey);
        const total = missing.length + 1;
        for (let i = 0; i < missing.length; i++) {
          const t = missing[i];
          setState({ done: i, total, current: `${TOPICS[t].title} 운세를 쓰고 있어요` });
          const w = await fetch(`${base}/topics/${t}`, { method: "POST" });
          if (!w.ok) throw new Error(`${TOPICS[t].title} 운세를 쓰지 못했어요. 다시 눌러 주세요. 이미 쓴 운세는 그대로 남아요.`);
        }
        setState({ done: missing.length, total, current: "책으로 묶고 있어요" });
        res = await download();
        if (Array.isArray(res)) throw new Error("아직 쓰지 못한 운세가 있어요. 다시 눌러 주세요.");
      }
      setState(null);
    } catch (e) {
      reportClientError("PDF 받기", String(e));
      setState(null);
      setError(e instanceof Error ? e.message : "책자를 만들지 못했어요.");
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={onClick}
        disabled={state !== null}
        className={`block w-full rounded-xl py-3.5 text-[16px] font-bold disabled:opacity-60 ${className}`}
        style={{ border: "1px solid var(--color-gold-line)", backgroundColor: "var(--color-gold-soft)", fontFamily: "var(--font-serif)" }}
      >
        사주 책자 PDF로 받기
      </button>
      <p className="mt-1 text-center text-[12px]" style={{ color: "var(--color-ink-faint)" }}>
        표지·원국·깊게 본 운세·나를 채우는 기운까지 한 권으로 · 가족에게 보내거나 출력해 두세요
      </p>
      {error && (
        <p className="mt-2 rounded-lg px-3 py-2 text-center text-[13px]" style={{ backgroundColor: "var(--color-danger-soft)", color: "var(--color-danger)" }}>
          {error}
        </p>
      )}
      {state && <Progress {...state} />}
    </>
  );
}
