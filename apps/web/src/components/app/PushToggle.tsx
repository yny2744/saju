"use client";

import { useEffect, useState } from "react";
import { PUSH_ON, PUSH_PUBLIC_KEY } from "@/lib/pushKey";
import { detectAppEnv } from "./AppInstall";

/**
 * 매일 아침 오늘의 운세 알림 켜기·끄기 (2026-11-01 유샘).
 *   안드로이드: 크롬·앱 어디서나 켤 수 있다 / 아이폰: 홈 화면에 설치한 앱(iOS 16.4 이상)에서만 된다.
 *   알림 열쇠(Vercel 환경변수 NEXT_PUBLIC_VAPID_PUBLIC_KEY)가 없으면 아무것도 보이지 않는다.
 */

type State = "loading" | "hidden" | "ios-install" | "off" | "on" | "denied" | "busy";

function keyBytes(base64url: string): ArrayBuffer {
  const pad = "=".repeat((4 - (base64url.length % 4)) % 4);
  const raw = atob((base64url + pad).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out.buffer;
}

function supported(): boolean {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

export function PushToggle({ tone = "light" }: { tone?: "light" | "dark" }) {
  const [state, setState] = useState<State>("loading");
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    if (!PUSH_ON) return setState("hidden");
    const env = detectAppEnv();
    if (env === "inapp") return setState("hidden");
    if (!supported()) return setState(env === "ios" ? "ios-install" : "hidden");
    if (Notification.permission === "denied") return setState("denied");
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setState(sub ? "on" : "off"))
      .catch(() => setState("off"));
  }, []);

  async function turnOn() {
    setNote(null);
    setState("busy");
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setState(perm === "denied" ? "denied" : "off");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(PUSH_PUBLIC_KEY) }));
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: sub.toJSON() }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setState("on");
      setNote("알림이 켜졌어요. 확인 알림이 한 번 갈 거예요.");
    } catch {
      setState("off");
      setNote("알림을 켜지 못했어요. 잠시 후 다시 눌러 주세요.");
    }
  }

  async function turnOff() {
    setNote(null);
    setState("busy");
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        }).catch(() => {});
        await sub.unsubscribe();
      }
      setState("off");
      setNote("알림을 껐어요.");
    } catch {
      setState("on");
    }
  }

  if (state === "loading" || state === "hidden") return null;
  const dark = tone === "dark";
  const box: React.CSSProperties = dark
    ? { background: "linear-gradient(180deg,#1a1613,#0b0908)", border: "1px solid #c9a04a", color: "#f3dc9a" }
    : { backgroundColor: "var(--color-card)", border: "1px solid var(--color-gold-line)" };

  return (
    <section className="rounded-2xl px-4 py-4" style={box}>
      <p className="text-[16px] font-bold" style={{ fontFamily: "var(--font-serif)" }}>
        매일 아침 오늘의 운세 알림
      </p>
      <p className="mt-1 text-[13.5px] leading-relaxed" style={{ color: dark ? "rgba(243,220,154,.8)" : "var(--color-ink-soft)", wordBreak: "keep-all" }}>
        {state === "on"
          ? "켜져 있어요. 아침마다 그날의 기운을 알려 드려요."
          : state === "denied"
            ? "휴대폰 설정에서 이 사이트(앱)의 알림이 꺼져 있어요. 설정 → 알림에서 허용해 주세요."
            : state === "ios-install"
              ? "아이폰은 홈 화면에 앱으로 설치한 뒤, 앱에서 알림을 켤 수 있어요."
              : "아침마다 그날의 기운을 한 줄로 알려 드려요. 언제든 끌 수 있어요."}
      </p>
      {state === "ios-install" ? (
        <a href="/app" className="btn-band mt-3 block rounded-xl py-3 text-center text-[15px] font-bold">
          앱으로 설치하기
        </a>
      ) : state === "off" || state === "busy" ? (
        <button type="button" onClick={turnOn} disabled={state === "busy"} className="btn-band mt-3 block w-full rounded-xl py-3 text-[15px] font-bold disabled:opacity-60">
          {state === "busy" ? "잠시만요..." : "알림 받기"}
        </button>
      ) : state === "on" ? (
        <button type="button" onClick={turnOff} className="mt-3 block w-full rounded-xl py-2.5 text-[14px] font-semibold" style={{ border: `1px solid ${dark ? "#c9a04a" : "var(--color-line)"}` }}>
          알림 끄기
        </button>
      ) : null}
      {note && (
        <p className="mt-2 text-center text-[13px]" role="status">
          {note}
        </p>
      )}
    </section>
  );
}
