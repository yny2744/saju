"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

// 서버에서 그릴 때 경고가 나지 않게
const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;
import type { GateRoom } from "@/tenants/types";
import { RoomCard } from "./RoomCard";

/**
 * 세 길 → 일곱 운 → 관, 세 단계 접기 (2026-11-01 유샘 지시서) - 첫 화면에 보이는 선택지를 세 개로 줄인다.
 *   1단계: 세 길(이름 + 한 줄 설명 + 그 길의 운 이름 칩 + "펼쳐 보기") / 2단계: 길을 누르면 그 길의 운 카드만 (다른 길은 접힘)
 *   3단계: 운을 누르면 그 운의 관 카드 (같은 길의 다른 운은 접힘)
 *   칩 (같은 날 통합 지시서): 길 카드의 운 칩을 누르면 그 운까지 바로 펼쳐지고, 운 카드의 관 칩("관" 뺀 이름)을 누르면 그 관으로 바로 들어간다.
 *   길 카드 칩이 두 줄을 넘으면 "+N".
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
type Target = Open & { scroll?: string };
type HistState = { gw?: string | null; gu?: string | null; gd?: number } | null;

function readHist(): Open & { d: number } {
  const s = (typeof window !== "undefined" ? (window.history.state as HistState) : null) ?? {};
  return { gw: s.gw ?? null, gu: s.gu ?? null, d: s.gd ?? 0 };
}

function smooth(id: string) {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  // 펼친 내용이 그려진 다음에 이동
  setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" }), 30);
}

const roomId = (unKey: string, i: number) => `room-${unKey}-${i}`;
const chipName = (name: string) => name.replace(/관$/, "");

const CHIP: React.CSSProperties = {
  border: "1px solid rgba(217,178,90,.7)",
  backgroundColor: "rgba(244,226,184,.08)",
  color: "#f4e2b8",
};
const CHIP_CLS = "inline-flex h-[28px] items-center rounded-full px-2.5 text-[13px] leading-none";
/** 운 카드(밝은 바탕) 안의 관 칩 */
const ROOM_CHIP: React.CSSProperties = { border: "1px solid var(--color-gold-line)", backgroundColor: "var(--color-paper-soft)", color: "var(--color-ink)" };
const ROOM_CHIP_CLS = "inline-flex h-[26px] items-center rounded-full px-2.5 text-[12.5px] leading-none";

/** 길 카드의 관 칩 - 실제로 두 줄에 들어가는 만큼만 보이고 나머지는 "+N" */
function ChipRow({ chips, onPick }: { chips: Array<{ label: string; key: string }>; onPick: (key: string) => void }) {
  const measure = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(Math.min(7, chips.length));

  useIsoLayoutEffect(() => {
    const calc = () => {
      const box = measure.current;
      if (!box) return;
      const kids = Array.from(box.children) as HTMLElement[]; // 칩들 + 맨 끝 "+99"
      const tops = [...new Set(kids.map((k) => k.offsetTop))].sort((a, b) => a - b);
      const second = tops[1] ?? tops[0];
      const fit = kids.slice(0, chips.length).filter((k) => k.offsetTop <= second).length;
      if (fit >= chips.length) return setShown(chips.length);
      // "+N" 칩이 들어갈 자리를 남긴다
      setShown(Math.max(1, fit - 1));
    };
    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, [chips.length]);

  const rest = chips.length - shown;
  return (
    <div className="relative mt-3">
      {/* 재기용 (보이지 않음) */}
      <div ref={measure} aria-hidden className="pointer-events-none invisible absolute inset-x-0 top-0 flex flex-wrap justify-center gap-1.5">
        {chips.map((c) => (
          <span key={`m-${c.key}`} className={CHIP_CLS} style={CHIP}>
            {c.label}
          </span>
        ))}
        <span className={CHIP_CLS} style={CHIP}>
          +99
        </span>
      </div>
      <div className="flex min-h-[62px] flex-wrap content-center justify-center gap-1.5">
        {chips.slice(0, shown).map((c) => (
          <button key={c.key} type="button" onClick={() => onPick(c.key)} className={CHIP_CLS} style={CHIP}>
            {c.label}
          </button>
        ))}
        {rest > 0 && (
          <span className={CHIP_CLS} style={{ ...CHIP, color: "var(--color-gold-light)" }} aria-label={`${rest}개 더`}>
            +{rest}
          </span>
        )}
      </div>
    </div>
  );
}

export function GateWays({ ways }: { ways: WayView[] }) {
  const [open, setOpen] = useState<Open>({ gw: null, gu: null });
  // 다른 길·운으로 옮길 때: 맞지 않는 기록 칸을 뒤로 걷은 다음(popstate) 새로 쌓는다 - 뒤로가기가 늘 한 단계씩 맞게
  const pending = useRef<Target | null>(null);

  function pushLevels(t: Target) {
    const base = window.history.state ?? {};
    if (t.gw && readHist().d < 1) window.history.pushState({ ...base, gw: t.gw, gu: null, gd: 1 }, "");
    if (t.gw && t.gu && readHist().d < 2) window.history.pushState({ ...base, gw: t.gw, gu: t.gu, gd: 2 }, "");
    setOpen({ gw: t.gw, gu: t.gu });
    if (t.scroll) smooth(t.scroll);
  }

  function goTo(t: Target) {
    const cur = readHist();
    const targetD = t.gu ? 2 : t.gw ? 1 : 0;
    let keep = 0;
    if (cur.d >= 1 && cur.gw === t.gw) keep = cur.d >= 2 && t.gu && cur.gu === t.gu ? 2 : 1;
    keep = Math.min(keep, targetD);
    if (cur.d > keep) {
      pending.current = t;
      window.history.go(keep - cur.d);
      return;
    }
    pushLevels(t);
  }

  useEffect(() => {
    const h = readHist();
    if (h.gw) setOpen({ gw: h.gw, gu: h.gu });
    const onPop = () => {
      const t = pending.current;
      if (t) {
        pending.current = null;
        pushLevels(t);
        return;
      }
      const s = readHist();
      setOpen({ gw: s.gw, gu: s.gu });
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const onWay = (k: string) => (open.gw === k ? goTo({ gw: null, gu: null }) : goTo({ gw: k, gu: null, scroll: `way-${k}` }));
  const onUn = (k: string) => (open.gu === k ? goTo({ gw: open.gw, gu: null }) : goTo({ gw: open.gw, gu: k, scroll: `un-${k}` }));
  const onUnChip = (wayKey: string, unKey: string) => goTo({ gw: wayKey, gu: unKey, scroll: `un-${unKey}` });

  return (
    <div className="space-y-4">
      {ways.map((way) => {
        const wayOpen = open.gw === way.key;
        const chips = way.uns.map((u) => ({ label: u.name, key: u.key }));
        return (
          <div key={way.key} id={`way-${way.key}`} className="scroll-mt-3">
            <div className="band-bg rounded-2xl px-4 pb-2 pt-4 text-center" style={{ color: "#f6ecd2", border: "1px solid var(--color-gold-line)" }}>
              <button type="button" onClick={() => onWay(way.key)} aria-expanded={wayOpen} aria-controls={`way-body-${way.key}`} className="block w-full">
                <span className="block text-[19px] font-bold" style={{ fontFamily: "var(--font-serif)", color: "#f4e2b8" }}>
                  {way.name}
                </span>
                <span className="mt-0.5 block text-[13.5px]" style={{ color: "#d8d2c4" }}>
                  {way.question}
                </span>
              </button>
              <ChipRow chips={chips} onPick={(unKey) => onUnChip(way.key, unKey)} />
              <button
                type="button"
                onClick={() => onWay(way.key)}
                aria-expanded={wayOpen}
                className="mx-auto mt-1.5 block px-4 py-1.5 text-[12.5px] font-semibold"
                style={{ color: "var(--color-gold-light)" }}
              >
                {wayOpen ? "접기 ⌃" : "펼쳐 보기 ⌄"}
              </button>
            </div>

            {wayOpen && (
              <div id={`way-body-${way.key}`} className="gw-in mt-3 space-y-2.5">
                {way.uns.map((un) => {
                  const unOpen = open.gu === un.key;
                  return (
                    <div key={un.key} id={`un-${un.key}`} className="scroll-mt-3">
                      <div className="rounded-xl px-3.5 pb-3 pt-2.5" style={{ backgroundColor: "var(--color-card)", border: "1px solid var(--color-gold-line)" }}>
                        <button type="button" onClick={() => onUn(un.key)} aria-expanded={unOpen} className="flex w-full items-center gap-3 text-left">
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
                          <span aria-hidden className="text-[14px]" style={{ color: "var(--color-accent)" }}>
                            {unOpen ? "⌃" : "⌄"}
                          </span>
                        </button>
                        {/* 관 칩 - 누르면 그 관으로 바로 */}
                        <div className="mt-2 flex flex-wrap gap-1.5 pl-14">
                          {un.rooms.map((room) => (
                            <a key={room.name} href={room.href} className={ROOM_CHIP_CLS} style={ROOM_CHIP}>
                              {chipName(room.name)}
                            </a>
                          ))}
                        </div>
                      </div>
                      {unOpen && (
                        <ul className="gw-in mt-2.5 grid grid-cols-2 gap-2">
                          {un.rooms.map((room, i) => (
                            <li key={room.name} id={roomId(un.key, i)} className="scroll-mt-20">
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
