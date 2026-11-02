"use client";

import { useEffect, useRef, useState } from "react";
import { BRAND, TENANT } from "@/tenants";
import { gateByRoom, gateDir, type GateRoomKey } from "@/lib/gates";
import { GATE_TITLE_CSS, GateTitle, gateFontHref } from "./GateTitle";
import { SGATE_DONE, SGATE_UNLOCK, isGateOn } from "./GateOverlay";

/**
 * 관 화면 맨 위 자리 (2026-11-02 유샘 지시서) - 링크(/go/<slug>)로 들어오든 메인에서 눌러 들어오든 같은 관 화면이 이걸 쓴다.
 *   홍보 영상이 있으면 영상: 소리와 함께 재생을 시도하고, 막히면 소리 없이 + "소리 켜기". 소리는 한 번만 - 반복될 때는 소리 없이.
 *   대문을 지나 들어오면 문이 열리는 순간 시작한다 (대문 단추를 누른 순간 소리를 미리 허락받아 둠).
 *   영상이 없으면 대표 그림 + 한 줄 - 그림이 없으면 대문 첫 장면 위에 금빛 제목을 얹는다.
 *   수능 대박운 관은 D-day·자막이 있는 SuneungHero 가 이 자리를 맡는다.
 */
export function RoomHero({ room }: { room: GateRoomKey }) {
  const entry = gateByRoom(room);
  const box = useRef<HTMLDivElement>(null);
  const vid = useRef<HTMLVideoElement>(null);
  const [w, setW] = useState(0);
  const [sound, setSound] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const brand = TENANT.gate?.title ?? BRAND;
  const emblem = TENANT.gate?.emblem ?? `/icons/${TENANT.id}/icon-192.png`;

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setW(el.clientWidth));
    ro.observe(el);
    setW(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  // 홍보 영상: 소리 켠 채 시작 시도 → 막히면 소리 없이. 대문이 덮여 있으면 문이 열린 뒤에.
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

  if (!entry) return null;

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

  const fallbackImage = `${gateDir(entry)}/2_loop_landscape.jpg`;
  return (
    <section className="mx-auto max-w-xl px-5 pt-5">
      <style dangerouslySetInnerHTML={{ __html: GATE_TITLE_CSS }} />
      {/* eslint-disable-next-line @next/next/no-page-custom-font -- 제목 글자만 받는 작은 글꼴 */}
      <link rel="stylesheet" href={gateFontHref(entry.title + brand)} />
      <div ref={box} className="relative overflow-hidden rounded-2xl" style={{ aspectRatio: "16 / 9", backgroundColor: "#0a1630", border: "1px solid var(--color-gold-line)" }}>
        {entry.promoVideo ? (
          <>
            <video ref={vid} src={entry.promoVideo} poster={entry.image} playsInline loop muted preload="auto" className="absolute inset-0 h-full w-full object-cover" />
            <button
              type="button"
              onClick={toggle}
              className="absolute bottom-2.5 right-2.5 rounded-full px-3 py-1.5 text-[12.5px] font-bold"
              style={{ backgroundColor: "rgba(0,0,0,.45)", color: "#f6dc94", border: "1px solid rgba(232,196,110,.8)", animation: blocked ? "gt-fade 1s ease-in-out infinite alternate" : undefined }}
            >
              {sound ? "🔈 소리 끄기" : "🔊 소리 켜기"}
            </button>
          </>
        ) : entry.image ? (
          // eslint-disable-next-line @next/next/no-img-element -- 대표 그림
          <img src={entry.image} alt={entry.title} className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element -- 대문 첫 장면 */}
            <img src={fallbackImage} alt="" className="absolute inset-0 h-full w-full object-cover" />
            {w > 0 && <GateTitle orient="landscape" w={w} h={(w * 9) / 16} title={entry.title} brand={brand} emblem={emblem} />}
          </>
        )}
      </div>
      {(entry.subtitle || entry.imageLine) && !entry.promoVideo && (
        <div className="mt-3 text-center" style={{ wordBreak: "keep-all" }}>
          {entry.subtitle && (
            <p className="text-[17px] font-bold" style={{ fontFamily: "var(--font-serif)" }}>
              {entry.subtitle}
            </p>
          )}
          {entry.imageLine && (
            <p className="mt-0.5 text-[14.5px]" style={{ color: "var(--color-ink-soft)" }}>
              {entry.imageLine}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
