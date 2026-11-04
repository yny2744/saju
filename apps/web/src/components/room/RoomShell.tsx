"use client";

import { useEffect, useRef, useState } from "react";
import { room as getRoom, type RoomEntry, type RoomKey } from "@/lib/rooms";
import { SGATE_DONE, SGATE_UNLOCK, isGateOn } from "@/components/gate/GateOverlay";
import { useRoomBackGuard } from "./useStepBack";

/**
 * 관 화면 공통 틀 (2026-11-03 유샘 지시서: 모든 관을 수능대박운 방식으로) - 기준은 수능대박운 관 화면.
 *   관 제목(28px 명조) → 홍보 영상 또는 대표 그림(16:9 가로 띠) → 안내 한 줄(+ "로그인 없이 무료로 보기") → 입력 칸 → 풀이
 *   대문(/go/<slug>)을 지나 들어오든 메인에서 눌러 들어오든 같은 컴포넌트. 관마다 다른 것은 lib/rooms.ts 에서만.
 *   홍보 영상: 소리와 함께 재생을 시도, 막히면 소리 없이 + "소리 켜기". 소리는 한 번만 (반복될 때는 소리 없이).
 */

export const ROOM_CARD: React.CSSProperties = {
  border: "1px solid var(--color-gold-line)",
  backgroundColor: "var(--color-card)",
  boxShadow: "inset 0 0 0 3px var(--color-card), inset 0 0 0 4px var(--color-gold-soft)",
};

/** 관 제목 + 홍보 영상(또는 대표 그림) */
export function RoomHeader({ roomKey, entry }: { roomKey?: RoomKey; entry?: RoomEntry }) {
  const r = entry ?? (roomKey ? getRoom(roomKey) : undefined);
  if (!r) return null;
  return (
    <>
      <h1 className="pt-4 text-center text-[28px] font-bold" style={{ fontFamily: "var(--font-serif)", wordBreak: "keep-all" }}>
        {r.title}
      </h1>
      <section className="pb-4 pt-3">
        <RoomMedia r={r} />
      </section>
    </>
  );
}

/** 입력 칸 위 안내 (수능대박운과 같은 모양) */
export function RoomLead({ r }: { r: RoomEntry }) {
  return (
    <div className="mb-4">
      {r.free && (
        <p className="text-center text-[18px] font-bold" style={{ fontFamily: "var(--font-serif)" }}>
          로그인 없이 무료로 보기
        </p>
      )}
      <p className={`${r.free ? "mt-1 " : ""}text-center text-[13px]`} style={{ color: "var(--color-ink-soft)", wordBreak: "keep-all" }}>
        {r.line}
      </p>
    </div>
  );
}

/**
 * 관 화면 전체 틀. card=true 이면 입력 칸을 수능대박운처럼 금테 카드 안에 넣고 안내를 카드 맨 위에,
 * false 이면(입력 칸이 이미 카드인 관) 안내를 바로 위에 둔다.
 */
export function RoomShell({
  roomKey,
  entry,
  card = true,
  children,
  below,
}: {
  roomKey?: RoomKey;
  entry?: RoomEntry;
  card?: boolean;
  children: React.ReactNode;
  below?: React.ReactNode;
}) {
  const r = entry ?? (roomKey ? getRoom(roomKey) : undefined);
  // 2026-11-03 뒤로가기: 링크로 바로 들어왔으면 휴대폰 뒤로 버튼이 메인의 이 관 위치로 가게
  useRoomBackGuard();
  if (!r) return <>{children}</>;
  return (
    <main className="min-h-screen pb-10">
      <div className="mx-auto max-w-xl px-5">
        <RoomHeader entry={r} />
        <section className="scroll-mt-4 pb-8">
          {card ? (
            <div className="rounded-2xl p-5" style={ROOM_CARD}>
              <RoomLead r={r} />
              {children}
            </div>
          ) : (
            <>
              <RoomLead r={r} />
              {children}
            </>
          )}
        </section>
        {below}
      </div>
    </main>
  );
}

function RoomMedia({ r }: { r: RoomEntry }) {
  const vid = useRef<HTMLVideoElement>(null);
  const [sound, setSound] = useState(false);
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    const v = vid.current;
    if (!v) return;
    let last = 0;
    const onTime = () => {
      // 한 바퀴 돌아 처음으로 돌아오면 소리를 끈다 (소리는 한 번만)
      if (v.currentTime + 0.5 < last && !v.muted) {
        v.muted = true;
        setSound(false);
      }
      last = v.currentTime;
    };
    v.addEventListener("timeupdate", onTime);
    const start = () => {
      v.muted = false;
      v.currentTime = 0;
      v.play()
        .then(() => setSound(true))
        .catch(() => {
          v.muted = true;
          v.play().catch(() => {});
          setSound(false);
          setBlocked(true);
        });
    };
    const unlock = () => {
      v.muted = false;
      v.play().then(() => v.pause()).catch(() => {});
    };
    if (isGateOn()) {
      window.addEventListener(SGATE_UNLOCK, unlock);
      window.addEventListener(SGATE_DONE, start);
    } else start();
    return () => {
      v.removeEventListener("timeupdate", onTime);
      window.removeEventListener(SGATE_UNLOCK, unlock);
      window.removeEventListener(SGATE_DONE, start);
    };
  }, []);

  const toggle = () => {
    const v = vid.current;
    if (!v) return;
    if (sound) {
      v.muted = true;
      setSound(false);
    } else {
      v.muted = false;
      v.currentTime = 0;
      v.play().catch(() => {});
      setSound(true);
      setBlocked(false);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-2xl" style={{ aspectRatio: "16 / 9", backgroundColor: "#0a1630", boxShadow: "0 0 0 1px var(--color-gold-line)" }}>
      {r.video ? (
        <>
          <video ref={vid} src={r.video} poster={r.image} playsInline loop muted preload="auto" className="absolute inset-0 h-full w-full object-cover" />
          <button
            type="button"
            onClick={toggle}
            className="absolute bottom-2.5 right-2.5 rounded-full px-3 py-1.5 text-[12.5px] font-bold"
            style={{ backgroundColor: "rgba(0,0,0,.45)", color: "#f6dc94", border: "1px solid rgba(232,196,110,.8)", opacity: blocked ? 1 : 0.9 }}
          >
            {sound ? "🔈 소리 끄기" : "🔊 소리 켜기"}
          </button>
        </>
      ) : r.image ? (
        // eslint-disable-next-line @next/next/no-img-element -- 대표 그림 (임시: 메인 소개 카드)
        <img src={r.image} alt={r.title} className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: r.imagePos ?? "center", ...(r.imageZoom && r.imageZoom > 1 ? { transform: `scale(${r.imageZoom})`, transformOrigin: "center bottom" } : {}) }} />
      ) : null}
    </div>
  );
}
