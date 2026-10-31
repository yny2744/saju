"use client";

import { useEffect, useRef, useState } from "react";
import { TENANT } from "@/tenants";
import { TAROT_CARDS, REEL_SLOTS, SPREAD_POSITIONS, slotUnderPointer } from "@/lib/fun/tarot";

/**
 * 수레바퀴 · 세 줄 두루마리 (2026-10-31 유샘) - 슬롯머신처럼 돌아가다가 "고객이 누른 순간" 멈춘다.
 * 신뢰 원칙: 바퀴·줄에 새겨진 카드는 처음부터 다 보이고(섞인 순서 그대로), 멈춘 칸의 카드가 그대로 결과가 된다.
 *   멈출 때는 지금 지나는 칸에서 두세 칸 더 미끄러지며 칸 가운데에 맞춰 선다 - 그 칸이 곧 결과 (화면과 결과가 늘 같다).
 * 움직임은 requestAnimationFrame 으로 각도·위치만 바꾼다 (다시 그리기 최소).
 */

const N = TAROT_CARDS.length;
const SEG = 360 / N;

export const SPIN_CSS = `
.tw-wrap{position:relative;width:min(100%,320px);margin:0 auto;aspect-ratio:1}
.tw-wrap svg{width:100%;height:100%;display:block}
.tw-pointer{position:absolute;left:50%;top:-2%;width:9%;transform:translateX(-50%);filter:drop-shadow(0 2px 3px rgba(0,0,0,.5))}
.tr-row{display:flex;justify-content:center;gap:8px}
.tr-col{display:flex;flex-direction:column;align-items:center;width:31%}
.tr-lab{font-size:13px;letter-spacing:.3em;padding-left:.3em;margin-bottom:6px}
.tr-reel{position:relative;width:100%;aspect-ratio:96/250;overflow:hidden;border-radius:12px;background:#080706;box-shadow:inset 0 0 0 1.5px #c9a04a,inset 0 0 0 5px #080706,inset 0 0 0 6px rgba(200,204,210,.5)}
.tr-cell{position:absolute;left:9%;right:9%;height:29.6%;border-radius:8px;background:radial-gradient(circle at 50% 35%,#2b2622,#0d0b0a);box-shadow:inset 0 0 0 1px #c9a04a;display:flex;flex-direction:column;align-items:center;justify-content:center;will-change:transform}
.tr-cell b{font-family:var(--font-serif);font-size:clamp(26px,9vw,38px);line-height:1}
.tr-cell small{margin-top:3px;font-size:10.5px;color:#cfd3d9;white-space:nowrap}
.tr-shade{position:absolute;inset:0;pointer-events:none;background:linear-gradient(#080706 0%,transparent 30%,transparent 70%,#080706 100%)}
.tr-win{position:absolute;left:3%;right:3%;top:35.2%;height:29.6%;border-radius:9px;pointer-events:none;box-shadow:0 0 0 1.5px #f3dc9a,0 0 16px rgba(243,220,154,.5)}
.tr-stop{margin-top:9px;width:92%;padding:8px 0;border-radius:999px;font-weight:700;font-size:14px}
`;

function easeOut(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

function useReducedMotion() {
  const [r, setR] = useState(false);
  useEffect(() => setR(window.matchMedia("(prefers-reduced-motion: reduce)").matches), []);
  return r;
}

/* ───────────── 수레바퀴 ───────────── */


export function TarotWheel({
  deck,
  spinning,
  stopSignal,
  stoppedSlot,
  onStopped,
}: {
  /** 섞인 22장 (칸 → 카드 번호) */
  deck: number[];
  spinning: boolean;
  /** 멈춤 버튼을 누를 때마다 1씩 커진다 */
  stopSignal: number;
  /** 이미 멈춘 칸 (오늘 다시 왔을 때) */
  stoppedSlot: number | null;
  onStopped: (slot: number) => void;
}) {
  const cb = useRef(onStopped);
  cb.current = onStopped;
  const gRef = useRef<SVGGElement>(null);
  const theta = useRef(stoppedSlot === null ? -SEG * 0.3 : -stoppedSlot * SEG);
  const raf = useRef(0);
  const stopping = useRef<{ from: number; to: number; t0: number; dur: number } | null>(null);
  const reduced = useReducedMotion();
  const [landed, setLanded] = useState<number | null>(stoppedSlot);

  const apply = () => gRef.current?.setAttribute("transform", `rotate(${theta.current} 170 170)`);

  useEffect(() => {
    apply();
    if (!spinning) return;
    setLanded(null);
    let last = performance.now();
    const speed = reduced ? 0.12 : 0.42; // 도/ms
    const tick = (now: number) => {
      const dt = now - last;
      last = now;
      const st = stopping.current;
      if (st) {
        const k = Math.min(1, (now - st.t0) / st.dur);
        theta.current = st.from + (st.to - st.from) * easeOut(k);
        apply();
        if (k >= 1) {
          stopping.current = null;
          const slot = slotUnderPointer(theta.current);
          setLanded(slot);
          cb.current(slot);
          return;
        }
      } else {
        theta.current += speed * dt;
        apply();
      }
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spinning]);

  /** 멈춤 - 지금 각도에서 칸 가운데에 맞춰 2~3칸 더 미끄러지며 선다 */
  useEffect(() => {
    if (stopSignal === 0 || stopping.current || !spinning) return;
    const from = theta.current;
    const to = Math.ceil(from / SEG) * SEG + SEG * 2;
    stopping.current = { from, to, t0: performance.now(), dur: reduced ? 500 : 1500 };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stopSignal]);

  const emblem = TENANT.gate?.emblem;
  return (
    <div className="tw-wrap">
      <svg viewBox="0 0 340 340" aria-label="운명의 수레바퀴">
        <defs>
          <linearGradient id="twGold" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#fbeec1" />
            <stop offset=".35" stopColor="#d9b25a" />
            <stop offset=".6" stopColor="#a77b25" />
            <stop offset="1" stopColor="#f3dc9a" />
          </linearGradient>
          <linearGradient id="twSilver" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset=".5" stopColor="#b9bdc4" />
            <stop offset="1" stopColor="#eef0f3" />
          </linearGradient>
          <linearGradient id="twPearl" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#f4fbff" />
            <stop offset=".35" stopColor="#cfe9f2" />
            <stop offset=".6" stopColor="#ead7f2" />
            <stop offset="1" stopColor="#ffffff" />
          </linearGradient>
          <radialGradient id="twLac" cx="50%" cy="50%" r="60%">
            <stop offset="0" stopColor="#2a2420" />
            <stop offset="1" stopColor="#0c0a09" />
          </radialGradient>
        </defs>
        <circle cx="170" cy="170" r="166" fill="#080706" stroke="url(#twGold)" strokeWidth="3" />
        <circle cx="170" cy="170" r="159" fill="none" stroke="url(#twSilver)" strokeWidth="1" />
        <g ref={gRef}>
          {deck.map((no, i) => {
            const a0 = ((i * SEG - SEG / 2 - 90) * Math.PI) / 180;
            const a1 = ((i * SEG + SEG / 2 - 90) * Math.PI) / 180;
            const r = 152;
            const am = (i * SEG - 90) * (Math.PI / 180);
            const tx = 170 + 124 * Math.cos(am);
            const ty = 170 + 124 * Math.sin(am);
            const hit = landed === i;
            return (
              <g key={i}>
                <path
                  d={`M170 170 L${170 + r * Math.cos(a0)} ${170 + r * Math.sin(a0)} A${r} ${r} 0 0 1 ${170 + r * Math.cos(a1)} ${170 + r * Math.sin(a1)} Z`}
                  fill={hit ? "#3a2d14" : i % 2 ? "#120f0d" : "url(#twLac)"}
                  stroke="url(#twGold)"
                  strokeWidth="1"
                />
                <text
                  x={tx}
                  y={ty}
                  transform={`rotate(${i * SEG} ${tx} ${ty})`}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize="18"
                  fontWeight={700}
                  fill="url(#twGold)"
                  style={{ fontFamily: "var(--font-serif)" }}
                >
                  {TAROT_CARDS[no].hanja}
                </text>
                <circle cx={170 + 145 * Math.cos(a0)} cy={170 + 145 * Math.sin(a0)} r="2.4" fill="url(#twPearl)" />
              </g>
            );
          })}
        </g>
        <circle cx="170" cy="170" r="64" fill="url(#twLac)" stroke="url(#twGold)" strokeWidth="2.2" />
        <circle cx="170" cy="170" r="58" fill="none" stroke="url(#twPearl)" strokeWidth="1.2" strokeDasharray="3 3" />
        {emblem ? (
          <image href={emblem} x="124" y="124" width="92" height="92" />
        ) : (
          <text x="170" y="172" textAnchor="middle" dominantBaseline="middle" fontSize="26" fontWeight={700} fill="url(#twGold)">
            {TENANT.brand.logoText}
          </text>
        )}
      </svg>
      <svg className="tw-pointer" viewBox="0 0 28 34" aria-hidden>
        <defs>
          <linearGradient id="twPt" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#fff1c4" />
            <stop offset=".5" stopColor="#d9b25a" />
            <stop offset="1" stopColor="#a77b25" />
          </linearGradient>
        </defs>
        <path d="M14 34 L27 6 L1 6 Z" fill="url(#twPt)" stroke="#6b4a14" strokeWidth="1" />
        <circle cx="14" cy="6" r="5" fill="#f4fbff" stroke="#c9a04a" />
      </svg>
    </div>
  );
}

/* ───────────── 세 줄 두루마리 ───────────── */

const CELL = 0.296; // 줄 높이 대비 칸 높이 (CSS .tr-cell height 와 같게)
const GAP = 0.04;

function Reel({
  slots,
  deck,
  label,
  spinning,
  stoppedAt,
  speed,
  onStopped,
  canStop,
}: {
  /** 이 줄에 담긴 deck 자리들 */
  slots: number[];
  deck: number[];
  label: string;
  spinning: boolean;
  stoppedAt: number | null;
  speed: number;
  onStopped: (slot: number) => void;
  canStop: boolean;
}) {
  const M = slots.length;
  const cb = useRef(onStopped);
  cb.current = onStopped;
  const pos = useRef(stoppedAt === null ? 0 : slots.indexOf(stoppedAt)); // 칸 단위 위치 (가운데 칸 = pos)
  const [, force] = useState(0);
  const raf = useRef(0);
  const stopping = useRef<{ from: number; to: number; t0: number; dur: number } | null>(null);
  const [done, setDone] = useState(stoppedAt !== null);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (!spinning || done) return;
    let last = performance.now();
    const v = (reduced ? 0.0025 : 0.011) * speed; // 칸/ms
    const tick = (now: number) => {
      const dt = now - last;
      last = now;
      const st = stopping.current;
      if (st) {
        const k = Math.min(1, (now - st.t0) / st.dur);
        pos.current = st.from + (st.to - st.from) * easeOut(k);
        force((n) => n + 1);
        if (k >= 1) {
          stopping.current = null;
          setDone(true);
          cb.current(slots[((Math.round(pos.current) % M) + M) % M]);
          return;
        }
      } else {
        pos.current += v * dt;
        force((n) => n + 1);
      }
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spinning, done]);

  const stop = () => {
    if (stopping.current || done || !spinning) return;
    const from = pos.current;
    stopping.current = { from, to: Math.ceil(from) + 2, t0: performance.now(), dur: reduced ? 400 : 1100 };
  };

  // 가운데 칸(창)이 pos 인 상태로, 위아래 두 칸씩 그린다
  const base = Math.floor(pos.current);
  const frac = pos.current - base;
  const cells = [];
  for (let k = -2; k <= 2; k++) {
    const idx = base + k;
    const slot = slots[((idx % M) + M) % M];
    const top = 0.352 + (k - frac) * (CELL + GAP);
    const c = TAROT_CARDS[deck[slot]];
    const center = done && k === 0 && frac < 0.001;
    cells.push(
      <div key={idx} className="tr-cell" style={{ top: `${top * 100}%`, opacity: center ? 1 : 0.55 }}>
        <b className="gold-t">{c.hanja}</b>
        {center && <small>{c.name}</small>}
      </div>
    );
  }

  return (
    <div className="tr-col">
      <div className="tr-lab gold-t">{label}</div>
      <div className="tr-reel">
        {cells}
        <div className="tr-shade" />
        <div className="tr-win" />
      </div>
      <button type="button" className="tr-stop lux-btn" onClick={stop} disabled={!canStop || done || !spinning}>
        {done ? "멈춤 ✓" : "멈춤"}
      </button>
    </div>
  );
}

export function TarotReels({
  deck,
  spinning,
  stopped,
  onStopped,
}: {
  deck: number[];
  spinning: boolean;
  /** 이미 멈춘 줄마다의 자리 (오늘 다시 왔을 때) */
  stopped: Array<number | null>;
  onStopped: (reel: number, slot: number) => void;
}) {
  return (
    <div className="tr-row">
      {REEL_SLOTS.map((slots, r) => (
        <Reel
          key={r}
          slots={slots}
          deck={deck}
          label={SPREAD_POSITIONS[r].label}
          spinning={spinning}
          stoppedAt={stopped[r]}
          speed={[1, 0.86, 1.13][r]}
          onStopped={(slot) => onStopped(r, slot)}
          canStop
        />
      ))}
    </div>
  );
}
