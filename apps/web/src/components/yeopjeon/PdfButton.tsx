"use client";

import { useState } from "react";
import { TOPICS, isAnyTopicKey, type AnyTopicKey } from "@/lib/topics";
import { writeTopics } from "@/lib/writeTopics";
import { reportClientError } from "./useYeopjeon";
import { WriteProgress } from "./WriteProgress";

/**
 * 사주 책자 PDF 받기 (2026-10-12 수정안 38).
 * 깊게 보기가 열린 운세를 모두 담는다. 아직 안 열어 본(안 써진) 운세는 받기 전에 한꺼번에 마저 쓴다 - 유샘: "열어 보지 않은 것도 다 보내 줘야지".
 * 수정안 42: 하나가 실패해도 멈추지 않고, 끝까지 못 쓴 것이 있으면 쓴 것까지로 책자를 먼저 내려 준다.
 */
export function PdfButton({ personId, className = "" }: { personId: string; className?: string }) {
  const [writing, setWriting] = useState<{ topics: AnyTopicKey[]; done: AnyTopicKey[]; failed: AnyTopicKey[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const base = `/api/persons/${encodeURIComponent(personId)}`;

  /** 책자를 받는다. 안 써진 운세가 있으면 그 목록을 돌려준다 (partial이면 쓴 것까지로 묶어 받는다) */
  async function download(partial: boolean): Promise<{ missing: AnyTopicKey[]; got: boolean }> {
    const r = await fetch(`${base}/pdf${partial ? "?partial=1" : ""}`);
    if (r.status === 409) {
      const body = await r.json().catch(() => ({}));
      return { missing: Array.isArray(body.missing) ? (body.missing as string[]).filter(isAnyTopicKey) : [], got: false };
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
    const left = (r.headers.get("X-Missing-Topics") ?? "").split(",").filter(isAnyTopicKey);
    return { missing: left, got: true };
  }

  async function onClick() {
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      let res = await download(false);
      if (!res.got) {
        // 수정안 42·43: 안 써진 운세를 한꺼번에 쓴다 - 하나가 실패해도 멈추지 않는다
        const topics = res.missing;
        const done: AnyTopicKey[] = [];
        const failed: AnyTopicKey[] = [];
        setWriting({ topics, done: [], failed: [] });
        await writeTopics(personId, topics, (t, ok) => {
          (ok ? done : failed).push(t);
          setWriting({ topics, done: [...done], failed: [...failed] });
        });
        setWriting(null);
        res = await download(true);
        if (!res.got) throw new Error("운세를 쓰는 곳이 붐벼요. 1~2분 뒤 다시 눌러 주세요. 엽전은 빠지지 않아요.");
      }
      if (res.missing.length > 0) {
        setInfo(`${res.missing.map((t) => TOPICS[t].title).join(", ")} 운세는 아직 담지 못했어요. 잠시 뒤 다시 받기를 누르면 함께 담겨요.`);
      }
    } catch (e) {
      reportClientError("PDF 받기", String(e));
      setError(e instanceof Error ? e.message : "책자를 만들지 못했어요.");
    }
    setWriting(null);
    setBusy(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={onClick}
        disabled={busy}
        className={`block w-full rounded-xl py-3.5 text-[16px] font-bold disabled:opacity-60 ${className}`}
        style={{ border: "1px solid var(--color-gold-line)", backgroundColor: "var(--color-gold-soft)", fontFamily: "var(--font-serif)" }}
      >
        {busy && !writing ? "책으로 묶고 있어요..." : "사주 책자 PDF로 받기"}
      </button>
      <p className="mt-1 text-center text-[12px]" style={{ color: "var(--color-ink-faint)" }}>
        표지·원국·깊게 본 운세·나를 채우는 기운까지 한 권으로 · 가족에게 보내거나 출력해 두세요
      </p>
      {error && (
        <p className="mt-2 rounded-lg px-3 py-2 text-center text-[13px]" style={{ backgroundColor: "var(--color-danger-soft)", color: "var(--color-danger)" }}>
          {error}
        </p>
      )}
      {info && (
        <p className="mt-2 rounded-lg px-3 py-2 text-center text-[13px]" style={{ backgroundColor: "var(--color-gold-soft)", color: "var(--color-ink)" }}>
          {info}
        </p>
      )}
      {writing && (
        <WriteProgress
          title="사주 책자를 만들고 있어요"
          topics={writing.topics}
          done={writing.done}
          failed={writing.failed}
          note="아직 열어 보지 않은 운세도 모두 써서 담고 있어요. 화면을 닫지 말아 주세요."
        />
      )}
    </>
  );
}
