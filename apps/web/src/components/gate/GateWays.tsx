"use client";

import { useEffect, useRef, useState } from "react";
import type { GateRoom } from "@/tenants/types";
import { RoomCard } from "./RoomCard";

/**
 * 세 길 → 일곱 운 → 관, 세 단계 접기 (2026-11-01 유샘 지시서) - 첫 화면에 보이는 선택지를 세 개로 줄인다.
 *   1단계: 세 길(이름 + 한 줄 설명)만 / 2단계: 길을 누르면 그 길의 운만 (다른 길은 접힘)
 *   3단계: 운을 누르면 그 운의 관 카드 (같은 길의 다른 운은 접힘)
 *   펼칠 때마다 그 자리로 부드럽게 이동. 뒤로가기(브라우저·안드로이드)를 누르면 한 단계씩 접힌다 (펼칠 때 기록을 한 칸씩 쌓는다).
 *   관에 들어갔다가 돌아오면 열어 둔 길·운이 그대로 열려 있다 (기록에 남긴 상태를 다시 읽는다).
 */

export interface WayView {
  key: string;
  name: string;
  question: string;
  uns: Array<{ key: string; glyph: string; name: string; rooms: GateRoom[] }>;
}

type Open = { gw: string | null; gu: string | null };
type HistState = { gw?: string | null; gu?: string | null; gd?: number } | null;

function readHist(): Open & { d: number } {
  const s = (typeof window !== "undefined" ? (window.history.state as HistState) : null) ?? {};
  return { gw: s.gw ?? null, gu: s.gu ?? null, d: s.gd ?? 0 };
}

function smooth(id: string) {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" }));
}

export function GateWays({ ways }: { ways: WayView[] }) {
  const [open, setOpen] = useState<Open>({ gw: null, gu: null });
  // 운이 열린 채 다른 길을 누르면: 운 칸을 뒤로 걷은 다음(popstate) 그 길로 바꾼다 - 기록이 한 단계씩 맞게 남도록
  const switchTo = useRef<string | null>(null);

  useEffect(() => {
    const h = readHist();
    if (h.gw) setOpen({ gw: h.gw, gu: h.gu });
    const onPop = () => {
      const s = readHist();
      const k = switchTo.current;
      if (k) {
        switchTo.current = null;
        window.history.replaceState({ ...(window.history.state ?? {}), gw: k, gu: null, gd: 1 }, "");
        setOpen({ gw: k, gu: null });
        smooth(`way-${k}`);
        return;
      }
      setOpen({ gw: s.gw, gu: s.gu });
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  /** 기록에 남기기: 한 단계 더 펼치면 한 칸 쌓고, 같은 단계에서 바꾸면 그 칸을 고친다 */
  function record(next: Open) {
    const d = next.gu ? 2 : next.gw ? 1 : 0;
    const cur = readHist().d;
    const state = { ...(window.history.state ?? {}), gw: next.gw, gu: next.gu, gd: d };
    if (d > cur) window.history.pushState(state, "");
    else window.history.replaceState(state, "");
    setOpen(next);
  }

  /** 접기: 쌓아 둔 칸만큼 뒤로 (뒤로가기와 같은 결과) */
  function collapseTo(level: 0 | 1) {
    const cur = readHist().d;
    if (cur > level) window.history.go(level - cur);
    else setOpen(level === 0 ? { gw: null, gu: null } : { gw: open.gw, gu: null });
  }

  function onWay(k: string) {
    if (open.gw === k) return collapseTo(0);
    const cur = readHist().d;
    if (cur >= 2) {
      // 운 칸을 먼저 걷고(뒤로 한 칸) 길을 바꾼다 - onPop 에서 마무리
      switchTo.current = k;
      window.history.go(1 - cur);
      return;
    }
    record({ gw: k, gu: null });
    smooth(`way-${k}`);
  }

  function onUn(k: string) {
    if (open.gu === k) return collapseTo(1);
    record({ gw: open.gw, gu: k });
    smooth(`un-${k}`);
  }

  return (
    <div className="space-y-3">
      {ways.map((way) => {
        const wayOpen = open.gw === way.key;
        return (
          <div key={way.key} id={`way-${way.key}`} className="scroll-mt-3">
            <button
              type="button"
              onClick={() => onWay(way.key)}
              aria-expanded={wayOpen}
              aria-controls={`way-body-${way.key}`}
              className="band-bg block w-full rounded-2xl px-5 py-4 text-center"
              style={{ color: "#f6ecd2", border: "1px solid var(--color-gold-line)" }}
            >
              <span className="block text-[19px] font-bold" style={{ fontFamily: "var(--font-serif)", color: "#f4e2b8" }}>
                {way.name}
              </span>
              <span className="mt-0.5 block text-[13.5px]" style={{ color: "#d8d2c4" }}>
                {way.question}
              </span>
              <span aria-hidden className="mt-1 block text-[13px] leading-none" style={{ color: "var(--color-gold-light)", transform: wayOpen ? "rotate(180deg)" : undefined }}>
                ▾
              </span>
            </button>

            {wayOpen && (
              <div id={`way-body-${way.key}`} className="gw-in mt-3 space-y-2.5">
                {way.uns.map((un) => {
                  const unOpen = open.gu === un.key;
                  return (
                    <div key={un.key} id={`un-${un.key}`} className="scroll-mt-3">
                      <button
                        type="button"
                        onClick={() => onUn(un.key)}
                        aria-expanded={unOpen}
                        className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-left"
                        style={{ backgroundColor: "var(--color-card)", border: "1px solid var(--color-gold-line)" }}
                      >
                        <span
                          aria-hidden
                          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[20px] font-bold"
                          style={{ backgroundColor: "var(--color-band)", color: "var(--color-gold-light)", boxShadow: "0 0 0 1px var(--color-gold)", fontFamily: "var(--font-serif)" }}
                        >
                          {un.glyph}
                        </span>
                        <span className="min-w-0 flex-1 text-[18px] font-bold" style={{ fontFamily: "var(--font-serif)" }}>
                          {un.name}
                        </span>
                        <span aria-hidden className="text-[14px]" style={{ color: "var(--color-accent)", transform: unOpen ? "rotate(180deg)" : undefined }}>
                          ▾
                        </span>
                      </button>
                      {unOpen && (
                        <ul className="gw-in mt-2.5 grid grid-cols-2 gap-2">
                          {un.rooms.map((room) => (
                            <li key={room.name}>
                              <RoomCard room={room} />
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
      <style
        dangerouslySetInnerHTML={{
          __html: `.gw-in{animation:gw-in .28s ease-out}@keyframes gw-in{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:none}}@media (prefers-reduced-motion:reduce){.gw-in{animation:none}}`,
        }}
      />
    </div>
  );
}
