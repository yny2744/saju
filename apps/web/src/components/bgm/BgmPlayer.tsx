"use client";

import { useEffect, useState } from "react";
import { bgm } from "./bgm";

/** 첫 터치에 배경음을 시작하는 보이지 않는 부품 (layout에 한 번) */
export function BgmStarter() {
  useEffect(() => {
    const c = bgm();
    const onFirst = () => {
      c.start();
      if (c.playing || c.off) {
        window.removeEventListener("pointerdown", onFirst);
        window.removeEventListener("keydown", onFirst);
      }
    };
    window.addEventListener("pointerdown", onFirst);
    window.addEventListener("keydown", onFirst);
    const onVis = () => c.pauseForHidden(document.hidden);
    document.addEventListener("visibilitychange", onVis);
    const onLeave = () => c.savePosition();
    window.addEventListener("pagehide", onLeave);
    // 앞 화면에서 음악이 나오고 있었으면 이어서 (화면 장면이 정해진 뒤에)
    const t = setTimeout(() => c.resumeIfLive(), 50);
    return () => {
      clearTimeout(t);
      window.removeEventListener("pagehide", onLeave);
      window.removeEventListener("pointerdown", onFirst);
      window.removeEventListener("keydown", onFirst);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);
  return null;
}

/** 머리줄의 ♪ 켜기·끄기 버튼 */
export function BgmToggle() {
  const [, setTick] = useState(0);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    return bgm().subscribe(() => setTick((t) => t + 1));
  }, []);
  if (!mounted) return <span className="h-8 w-8" />;
  const c = bgm();
  const on = !c.off;
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        // 켜져 있는데 아직 소리가 안 났으면(첫 터치 전) 누르는 순간 시작
        if (!c.off && !c.playing) c.start();
        else c.toggle();
      }}
      onPointerDown={(e) => e.stopPropagation()}
      aria-label={on ? "배경음악 끄기" : "배경음악 켜기"}
      aria-pressed={on}
      title={on ? "배경음악 끄기" : "배경음악 켜기"}
      className="relative flex h-8 w-8 items-center justify-center rounded-full text-[15px]"
      style={{ border: "1px solid var(--color-gold-line)", color: "var(--color-gold-light)", opacity: on ? 1 : 0.6 }}
    >
      ♪
      {!on && <span aria-hidden className="absolute h-[1.5px] w-5 rotate-45" style={{ backgroundColor: "var(--color-gold-light)" }} />}
    </button>
  );
}
