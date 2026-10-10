"use client";

import { useEffect } from "react";

/**
 * 배경음원 (2026-10-10 수정안 19). 공유마당 자유이용(기증) 가야금 3곡 - 출처는 아래쪽(Footer)에 표시.
 *
 *   main    : 대문·운세 보기·깊게 보기 등 기본          (Tong tong, 서예지)
 *   waiting : 풀이를 쓰는 동안 (990·4,900)              (How are you, 서예지)
 *   all     : 12가지 운세 전부 보기(29,500) 손님의 화면  (빛의 세상으로(희망가), 서예지)
 *
 * 브라우저는 소리를 자동으로 틀지 못하게 막으므로 손님이 화면을 처음 누를 때 작은 소리로 서서히 시작한다.
 * 음원 파일 자체를 잔잔하게(-26 LUFS) 맞춰 두었다 - 아이폰은 사이트가 음량을 바꿀 수 없어서 파일 음량이 곧 재생 음량.
 * ♪ 버튼으로 끄면 다음 방문에도 꺼진 채로 기억한다.
 */

export type BgmScene = "main" | "waiting" | "all";

const SRC: Record<BgmScene, string> = {
  main: "/audio/bgm1_main.mp3",
  waiting: "/audio/bgm4_waiting.mp3",
  all: "/audio/bgm5_all.mp3",
};
const OFF_KEY = "ryugyeol_bgm";
/** 이번 방문에서 이미 음악이 나왔는지 + 곡별 재생 위치 - 화면을 옮겨도 이어서 들리게 */
const LIVE_KEY = "ryugyeol_bgm_live";
const POS_KEY = "ryugyeol_bgm_pos";
const VOLUME = 0.5;
const FADE_MS = 1500;

type Listener = () => void;

class BgmController {
  private audio: HTMLAudioElement | null = null;
  private scene: BgmScene = "main";
  private stack: BgmScene[] = [];
  private started = false;
  private fadeTimer: ReturnType<typeof setInterval> | null = null;
  private listeners = new Set<Listener>();
  off = false;

  constructor() {
    try {
      this.off = typeof localStorage !== "undefined" && localStorage.getItem(OFF_KEY) === "off";
    } catch {
      /* 저장소를 못 쓰면 켜진 상태로 */
    }
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
  private emit() {
    this.listeners.forEach((fn) => fn());
  }

  get playing(): boolean {
    return Boolean(this.audio && !this.audio.paused);
  }

  private wanted(): BgmScene {
    return this.stack[this.stack.length - 1] ?? "main";
  }

  /** 손님의 첫 터치 */
  start() {
    if (this.started || this.off) return;
    this.started = true;
    this.play(this.wanted());
  }

  private fadeTo(target: number, done?: () => void) {
    const a = this.audio;
    if (!a) return;
    if (this.fadeTimer) clearInterval(this.fadeTimer);
    const from = a.volume;
    const steps = 20;
    let i = 0;
    this.fadeTimer = setInterval(() => {
      i++;
      try {
        a.volume = Math.max(0, Math.min(1, from + ((target - from) * i) / steps));
      } catch {
        /* 아이폰은 음량을 못 바꿈 */
      }
      if (i >= steps) {
        if (this.fadeTimer) clearInterval(this.fadeTimer);
        this.fadeTimer = null;
        done?.();
      }
    }, FADE_MS / steps);
  }

  private play(scene: BgmScene) {
    if (typeof window === "undefined" || this.off) return;
    this.scene = scene;
    if (!this.audio) {
      this.audio = new Audio();
      this.audio.loop = true;
      this.audio.preload = "auto";
    }
    const a = this.audio;
    const url = SRC[scene];
    if (!a.src.endsWith(url)) a.src = url;
    try {
      a.volume = 0;
    } catch {
      /* 무시 */
    }
    const pos = readPos(scene);
    if (pos > 0) {
      try {
        a.currentTime = pos;
      } catch {
        /* 무시 */
      }
    }
    a.play()
      .then(() => {
        this.started = true;
        this.fadeTo(VOLUME);
        try {
          sessionStorage.setItem(LIVE_KEY, "1");
        } catch {
          /* 무시 */
        }
        this.emit();
      })
      .catch(() => {
        // 아직 손님이 누르지 않았거나 브라우저가 막음 - 다음 터치에 다시
        this.started = false;
        this.emit();
      });
  }

  private switchTo(scene: BgmScene) {
    if (scene === this.scene && this.playing) return;
    if (!this.started || this.off || !this.audio || this.audio.paused) {
      this.scene = scene;
      return;
    }
    this.fadeTo(0, () => this.play(scene));
  }

  push(scene: BgmScene): () => void {
    this.stack.push(scene);
    this.switchTo(this.wanted());
    return () => {
      const i = this.stack.lastIndexOf(scene);
      if (i >= 0) this.stack.splice(i, 1);
      this.switchTo(this.wanted());
    };
  }

  toggle() {
    this.off = !this.off;
    try {
      localStorage.setItem(OFF_KEY, this.off ? "off" : "on");
    } catch {
      /* 무시 */
    }
    if (this.off) {
      const a = this.audio;
      if (a) this.fadeTo(0, () => a.pause());
      this.started = false;
    } else {
      this.started = true;
      this.play(this.wanted());
    }
    this.emit();
  }

  /** 다른 화면으로 옮겨 가기 직전 - 재생 위치를 적어 둔다 */
  savePosition() {
    const a = this.audio;
    if (!a || a.paused) return;
    try {
      sessionStorage.setItem(POS_KEY, JSON.stringify({ scene: this.scene, t: a.currentTime }));
    } catch {
      /* 무시 */
    }
  }

  /** 이번 방문에서 이미 음악이 나왔으면 새 화면에서도 바로 이어서 (브라우저가 허락하면) */
  resumeIfLive() {
    let live = false;
    try {
      live = sessionStorage.getItem(LIVE_KEY) === "1";
    } catch {
      /* 무시 */
    }
    if (live && !this.off && !this.started) {
      this.started = true;
      this.play(this.wanted());
    }
  }

  /** 다른 탭으로 가면 멈추고, 돌아오면 다시 */
  pauseForHidden(hidden: boolean) {
    const a = this.audio;
    if (!a || this.off || !this.started) return;
    if (hidden) a.pause();
    else a.play().catch(() => {});
  }
}

function readPos(scene: BgmScene): number {
  try {
    const v = JSON.parse(sessionStorage.getItem(POS_KEY) ?? "null") as { scene?: string; t?: number } | null;
    return v && v.scene === scene && typeof v.t === "number" ? v.t : 0;
  } catch {
    return 0;
  }
}

let controller: BgmController | null = null;
export function bgm(): BgmController {
  if (!controller) controller = new BgmController();
  return controller;
}

/** 이 화면이 떠 있는 동안 이 장면의 음악을 튼다 (닫히면 앞 장면으로 돌아감) */
export function useBgmScene(scene: BgmScene, enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    return bgm().push(scene);
  }, [scene, enabled]);
}
