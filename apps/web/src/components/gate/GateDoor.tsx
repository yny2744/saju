"use client";

import { useEffect, useState } from "react";
import type { GateDoor as Door, TenantGate } from "@/tenants/types";
import { SRC_COOKIE_NAME } from "@/lib/source";
import { isSuneungOn } from "@/lib/launchMode";
import { bgm } from "@/components/bgm/bgm";

/**
 * 광고별 홀로그램 대문 (2026-10-30 유샘 확정 시안).
 *   머리줄(류결사주 · ♪) 사이 바로 아래, 「류결의 명견만리」 제목 위에 반투명 문이 일렁인다.
 *   누르면 '슝' 소리(배경음악을 꺼 둔 분께는 소리 없이)와 함께 두 문짝이 양옆으로 열리고, 빛이 퍼지며 그 운세로 들어간다.
 *   어떤 문을 띄울지는 광고 주소의 꼬리표로 정한다 - TenantGate.doors 참고.
 */

/** 꼬리표 후보: ?door= → utm_campaign → /l/<key> → 30일 기억한 유입 꼬리표(캠페인·랜딩) */
function tagCandidates(): string[] {
  const out: string[] = [];
  try {
    const q = new URLSearchParams(window.location.search);
    out.push(q.get("door") ?? "", q.get("utm_campaign") ?? "");
    out.push(/^\/l\/([a-z0-9-]+)/.exec(window.location.pathname)?.[1] ?? "");
    const raw = document.cookie.split("; ").find((c) => c.startsWith(`${SRC_COOKIE_NAME}=`));
    if (raw) {
      const [, , campaign = "", landing = ""] = decodeURIComponent(raw.slice(SRC_COOKIE_NAME.length + 1)).split("|");
      out.push(campaign, landing);
    }
  } catch {
    /* 꼬리표를 못 읽으면 기본 문 */
  }
  return out.map((v) => v.toLowerCase()).filter(Boolean);
}

type Shown = Omit<Door, "match" | "needs">;

function pickDoor(doors: NonNullable<TenantGate["doors"]>): Shown | null {
  const usable = doors.list.filter((d) => d.needs !== "suneung" || isSuneungOn());
  for (const tag of tagCandidates()) {
    const hit = usable.find((d) => tag === d.key || d.match.some((m) => tag.startsWith(m)));
    if (hit) return hit;
  }
  return doors.fallback ?? null;
}

/** 바람이 빨려 들어가는 '슝' - 소리 파일 없이 그 자리에서 만든다 */
function whoosh() {
  try {
    if (bgm().off) return;
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AC();
    const t = ctx.currentTime;
    const buf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const n = ctx.createBufferSource();
    n.buffer = buf;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.Q.value = 1.4;
    bp.frequency.setValueAtTime(320, t);
    bp.frequency.exponentialRampToValueAtTime(2600, t + 0.42);
    bp.frequency.exponentialRampToValueAtTime(900, t + 0.75);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.32, t + 0.22);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.8);
    n.connect(bp).connect(g).connect(ctx.destination);
    n.start(t);
    n.stop(t + 1);
    const o = ctx.createOscillator();
    const og = ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(110, t);
    o.frequency.exponentialRampToValueAtTime(220, t + 0.5);
    og.gain.setValueAtTime(0.0001, t);
    og.gain.exponentialRampToValueAtTime(0.08, t + 0.2);
    og.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
    o.connect(og).connect(ctx.destination);
    o.start(t);
    o.stop(t + 0.75);
    window.setTimeout(() => ctx.close().catch(() => {}), 1500);
  } catch {
    /* 소리를 못 내도 문은 열린다 */
  }
}

export function GateDoor({ doors, onShown }: { doors: NonNullable<TenantGate["doors"]>; onShown: (on: boolean) => void }) {
  const [door, setDoor] = useState<Shown | null>(null);
  const [stage, setStage] = useState<"closed" | "open" | "go">("closed");

  useEffect(() => {
    const d = pickDoor(doors);
    setDoor(d);
    onShown(!!d);
  }, [doors, onShown]);

  if (!door) return null;

  const enter = () => {
    if (stage !== "closed") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      window.location.href = door.href;
      return;
    }
    whoosh();
    setStage("open");
    window.setTimeout(() => setStage("go"), 450);
    window.setTimeout(() => (window.location.href = door.href), 1150);
  };

  return (
    <>
      <div className="gh-door-wrap">
        <button type="button" className={stage === "closed" ? "gh-door" : "gh-door open"} onClick={enter} aria-label={door.title}>
          <span className="gh-door-light" />
          <span className="gh-door-leaf l" />
          <span className="gh-door-leaf r" />
          <span className="gh-door-txt">
            <b>{door.title}</b>
            <small>{door.sub}</small>
          </span>
        </button>
      </div>
      <div className={stage === "go" ? "gh-door-flash on" : "gh-door-flash"} aria-hidden="true" />
    </>
  );
}
