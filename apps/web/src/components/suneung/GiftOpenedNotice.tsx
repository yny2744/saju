"use client";

import { useEffect, useState } from "react";

/** 받침 여부로 이/가 */
const iGa = (w: string) => {
  const c = w.charCodeAt(w.length - 1);
  return c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 !== 0 ? "이" : "가";
};

type Item = { token: string; nickname: string; title: string; href: string };

/**
 * 보호자(지인)가 결제해 준 풀이가 열렸을 때, 학생이 사이트에 들어오면 위에 한 번 띄우는 알림 띠 (2026-11-14 유샘).
 *   [보러 가기]나 닫기를 누르면 다시 뜨지 않는다. 로그인하지 않았으면 아무것도 하지 않는다.
 */
export function GiftOpenedNotice() {
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    fetch("/api/gift/exam/mine")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => setItems(Array.isArray(j?.items) ? j.items : []))
      .catch(() => {});
  }, []);

  const it = items[0];
  if (!it) return null;

  const seen = (go?: string) => {
    const tokens = [it.token];
    setItems((xs) => xs.slice(1));
    fetch("/api/gift/exam/mine", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ tokens }), keepalive: true }).catch(() => {});
    if (go) window.location.href = go;
  };

  return (
    <div className="fixed inset-x-0 top-0 z-[60] px-3 pt-3" role="status">
      <div className="mx-auto flex max-w-xl items-center gap-3 rounded-2xl px-4 py-3 shadow-lg" style={{ backgroundColor: "#13203f", border: "1.5px solid #d4b265", color: "#f3e7c6" }}>
        <span aria-hidden className="text-[22px]">
          🎁
        </span>
        <p className="min-w-0 flex-1 text-[13.5px] leading-snug" style={{ wordBreak: "keep-all" }}>
          <b style={{ color: "#f6dfa0" }}>{it.nickname}님</b> {it.title}
          {iGa(it.title)} 열렸어요
          <span className="mt-0.5 block text-[11.5px]" style={{ color: "#d9cfae" }}>
            보호자(지인)께서 결제해 주셨어요
          </span>
        </p>
        <button type="button" onClick={() => seen(it.href)} className="shrink-0 rounded-full px-3 py-1.5 text-[13px] font-bold" style={{ backgroundColor: "#d4b265", color: "#13203f" }}>
          보러 가기
        </button>
        <button type="button" aria-label="닫기" onClick={() => seen()} className="shrink-0 px-1 text-[18px] leading-none" style={{ color: "#f3e7c6" }}>
          ×
        </button>
      </div>
    </div>
  );
}
