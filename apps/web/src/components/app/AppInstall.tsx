"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { josa } from "@/tenants";
import { WELCOME_GIFT, WELCOME_GIFT_APP_ONLY, formatNyang } from "@/lib/yeopjeon";
import { APP_COOKIE, APP_ICON_DIR, APP_SHORT_NAME } from "@/lib/appInfo";

/**
 * 휴대폰 앱(PWA) 설치 (2026-11-01 유샘) - 사이트를 홈 화면에 앱처럼 설치해 매일 오늘의 운세로 하루를 시작하게.
 *   안드로이드(크롬 등): 브라우저가 주는 설치 창을 받아 두었다가 "설치하기" 한 번으로 띄운다.
 *   아이폰(사파리): 설치 버튼이 없어서 "공유 → 홈 화면에 추가"를 그림으로 안내한다.
 *   카카오톡·네이버·인스타그램 안 브라우저: 설치가 안 되므로 바깥 브라우저(크롬·사파리)로 여는 길을 안내한다.
 *   이미 앱으로 열었으면 아무것도 보이지 않는다.
 */

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

export type AppEnv = "standalone" | "inapp" | "android" | "ios" | "desktop";

let deferred: InstallEvent | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((f) => f());

export function detectAppEnv(): AppEnv {
  if (typeof window === "undefined") return "desktop";
  const nav = navigator as Navigator & { standalone?: boolean };
  if (window.matchMedia("(display-mode: standalone)").matches || nav.standalone) return "standalone";
  const ua = navigator.userAgent;
  if (/KAKAOTALK|NAVER\(inapp|Instagram|FBAN|FBAV|Line\/|DaumApps|everytimeApp/i.test(ua)) return "inapp";
  if (/iPhone|iPad|iPod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "desktop";
}

/**
 * 앱으로 열었으면 "앱으로 열었다" 쿠키를 남긴다 (2026-11-01 유샘: 가입 선물 990냥은 앱으로 열었을 때만).
 * 화면이 그려지기 전(이 파일을 읽는 순간)에 남겨서, 머리줄·복주머니의 첫 요청에도 실리게 한다.
 */
function markAppOpen() {
  try {
    if (detectAppEnv() !== "standalone") return;
    if (document.cookie.split("; ").includes(`${APP_COOKIE}=1`)) return;
    document.cookie = `${APP_COOKIE}=1; path=/; max-age=31536000; samesite=lax${location.protocol === "https:" ? "; secure" : ""}`;
  } catch {
    /* 무시 */
  }
}
if (typeof window !== "undefined") markAppOpen();

/** 레이아웃에 한 번 - 서비스 워커 등록 + 설치 창 받아 두기 */
export function AppInstallInit() {
  useEffect(() => {
    if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    const onPrompt = (e: Event) => {
      e.preventDefault();
      deferred = e as InstallEvent;
      notify();
    };
    const onInstalled = () => {
      deferred = null;
      notify();
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);
  return null;
}

export function useAppInstall() {
  const [env, setEnv] = useState<AppEnv | null>(null);
  const [canPrompt, setCanPrompt] = useState(false);
  useEffect(() => {
    setEnv(detectAppEnv());
    const sync = () => setCanPrompt(!!deferred);
    sync();
    listeners.add(sync);
    return () => {
      listeners.delete(sync);
    };
  }, []);
  const install = async () => {
    if (!deferred) return false;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    deferred = null;
    notify();
    if (outcome === "accepted") setEnv("standalone");
    return outcome === "accepted";
  };
  return { env, canPrompt, install };
}

/** 카카오톡 안 브라우저는 카카오톡 주소로 바깥 브라우저를 열 수 있다. 그 밖의 안드로이드 앱 안 브라우저는 크롬으로 */
function externalOpenHref(): string {
  const url = location.href;
  const ua = navigator.userAgent;
  if (/KAKAOTALK/i.test(ua)) return `kakaotalk://web/openExternal?url=${encodeURIComponent(url)}`;
  if (/Android/i.test(ua)) return `intent://${location.host}${location.pathname}${location.search}#Intent;scheme=https;package=com.android.chrome;end`;
  return url;
}

const GOLD = "var(--color-gold)";

function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden style={{ display: "inline", verticalAlign: "-3px" }}>
      <path d="M12 3v12M7.5 7.5 12 3l4.5 4.5" fill="none" stroke="#2f7cc4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1" fill="none" stroke="#2f7cc4" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[14px] font-bold text-white" style={{ backgroundColor: "var(--color-band)" }}>
        {n}
      </span>
      <span className="pt-0.5 text-[15px] leading-relaxed" style={{ wordBreak: "keep-all" }}>
        {children}
      </span>
    </li>
  );
}

/** /app 화면의 설치 안내 - 기기마다 알맞은 방법만 보여 준다 */
export function InstallGuide() {
  const { env, canPrompt, install } = useAppInstall();
  const [copied, setCopied] = useState(false);
  // 앱으로 열었고 아직 가입 전일 때만 "가입하고 선물 받기" (2026-11-01)
  const [guest, setGuest] = useState(false);
  useEffect(() => {
    if (env !== "standalone" || !WELCOME_GIFT_APP_ONLY) return;
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setGuest(!d?.user?.termsAgreed))
      .catch(() => {});
  }, [env]);
  if (!env) return <div className="h-40" />;

  if (env === "standalone") {
    return (
      <p className="rounded-2xl px-5 py-6 text-center text-[16px] font-semibold" style={{ backgroundColor: "var(--color-paper-soft)" }}>
        지금 {APP_SHORT_NAME} 앱으로 보고 계세요. 홈 화면의 아이콘으로 매일 들어오시면 돼요.
        {guest && (
          <a href="/login" className="btn-band mt-4 block rounded-xl py-3.5 text-[16px] font-bold">
            가입하고 선물 {formatNyang(WELCOME_GIFT)} 받기
          </a>
        )}
      </p>
    );
  }

  if (env === "inapp") {
    const copy = async () => {
      try {
        await navigator.clipboard.writeText(location.href);
        setCopied(true);
      } catch {
        /* 복사가 안 되면 안내 문구만 */
      }
    };
    return (
      <div className="space-y-4">
        <p className="text-[15px] leading-relaxed" style={{ wordBreak: "keep-all" }}>
          지금은 카카오톡 같은 앱 안의 브라우저라 설치가 되지 않아요. <b>크롬(아이폰은 사파리)</b>으로 연 다음 설치해 주세요.
        </p>
        <a href={externalOpenHref()} className="btn-band block rounded-xl py-4 text-center text-[17px] font-bold">
          바깥 브라우저로 열기
        </a>
        <button type="button" onClick={copy} className="block w-full rounded-xl py-3 text-[15px] font-semibold" style={{ border: `1px solid ${GOLD}` }}>
          {copied ? "주소를 복사했어요. 사파리·크롬 주소창에 붙여 넣으세요" : "주소 복사하기"}
        </button>
      </div>
    );
  }

  if (env === "ios") {
    return (
      <ol className="space-y-3.5">
        <Step n={1}>
          사파리 아래쪽의 <b>공유</b> 버튼 <ShareIcon /> 을 눌러요.
        </Step>
        <Step n={2}>
          목록을 조금 내려 <b>홈 화면에 추가</b>를 눌러요.
        </Step>
        <Step n={3}>
          오른쪽 위 <b>추가</b>를 누르면 홈 화면에 {APP_SHORT_NAME} 아이콘이 생겨요.
        </Step>
      </ol>
    );
  }

  if (env === "android") {
    return canPrompt ? (
      <button type="button" onClick={install} className="btn-band block w-full rounded-xl py-4 text-[17px] font-bold" style={{ fontFamily: "var(--font-serif)" }}>
        홈 화면에 {APP_SHORT_NAME} 설치하기
      </button>
    ) : (
      <ol className="space-y-3.5">
        <Step n={1}>
          크롬 오른쪽 위의 <b>⋮</b> (점 세 개)를 눌러요.
        </Step>
        <Step n={2}>
          <b>홈 화면에 추가</b> 또는 <b>앱 설치</b>를 눌러요.
        </Step>
        <Step n={3}>
          <b>설치</b>를 누르면 홈 화면에 {APP_SHORT_NAME} 아이콘이 생겨요.
        </Step>
      </ol>
    );
  }

  return (
    <p className="text-[15px] leading-relaxed" style={{ wordBreak: "keep-all" }}>
      휴대폰으로 이 화면을 열면 설치할 수 있어요. 컴퓨터 크롬에서는 주소창 오른쪽의 설치 아이콘으로도 설치할 수 있어요.
      {canPrompt && (
        <button type="button" onClick={install} className="btn-band mt-4 block w-full rounded-xl py-3.5 text-[16px] font-bold">
          이 컴퓨터에 설치하기
        </button>
      )}
    </p>
  );
}

const BAR_KEY = "ryugyeol_app_bar";
const BAR_HIDE_DAYS = 14;

/** 휴대폰 아래쪽 작은 안내 띠 - 설치 안 한 손님에게만, 닫으면 14일 동안 안 보임. 대문 첫 화면과 /app 에서는 띄우지 않는다 */
export function InstallBar() {
  const { env } = useAppInstall();
  const pathname = usePathname();
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (!env || env === "standalone" || env === "desktop") return;
    if (pathname === "/" || pathname?.startsWith("/app")) return;
    try {
      const until = Number(localStorage.getItem(BAR_KEY) ?? 0);
      if (Date.now() < until) return;
    } catch {
      /* 저장소를 못 쓰면 띄운다 */
    }
    const t = window.setTimeout(() => setShow(true), 6000);
    return () => window.clearTimeout(t);
  }, [env, pathname]);
  if (!show) return null;
  const close = () => {
    setShow(false);
    try {
      localStorage.setItem(BAR_KEY, String(Date.now() + BAR_HIDE_DAYS * 86400000));
    } catch {
      /* 무시 */
    }
  };
  return (
    <div
      className="fixed bottom-3 left-3 right-[84px] z-40 flex items-center gap-2.5 rounded-2xl px-3 py-2.5 shadow-lg"
      style={{ background: "linear-gradient(180deg,#1a1613,#0b0908)", border: "1px solid #c9a04a", color: "#f3dc9a" }}
      role="dialog"
      aria-label="앱 설치 안내"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`${APP_ICON_DIR}/icon-192.png`} alt="" width={36} height={36} className="shrink-0 rounded-lg" />
      <a href="/app" className="min-w-0 flex-1 text-[13px] leading-snug" style={{ wordBreak: "keep-all" }}>
        <b>{josa(APP_SHORT_NAME, "을/를")} 홈 화면에</b>
        <br />
        {WELCOME_GIFT_APP_ONLY ? `앱으로 가입하면 ${formatNyang(WELCOME_GIFT)} 선물` : "매일 아침 오늘의 운세로 하루 시작"}
      </a>
      <a href="/app" className="shrink-0 rounded-full px-3 py-1.5 text-[13px] font-bold" style={{ background: "linear-gradient(180deg,#fff1c4,#d9b25a 45%,#a77b25)", color: "#1a1408" }}>
        설치
      </a>
      <button type="button" onClick={close} aria-label="닫기" className="shrink-0 px-1 text-[18px] leading-none" style={{ color: "rgba(243,220,154,.7)" }}>
        ×
      </button>
    </div>
  );
}
