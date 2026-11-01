"use client";

import { CURRENCY_NAME, WELCOME_GIFT, formatNyang } from "@/lib/yeopjeon";
import { useWelcomeHere } from "./useWelcomeHere";

/**
 * 웹에서 본 손님에게 "앱으로 열면 가입 선물" 한 줄 (2026-11-01 유샘) - 앱 전용 고객사에서, 앱이 아닐 때만 보인다.
 * 앱으로 열었거나 앱 전용이 아니면 아무것도 그리지 않는다.
 */
export function AppGiftLink({ className, color }: { className?: string; color?: string }) {
  const here = useWelcomeHere();
  if (here !== false) return null;
  return (
    <a
      href="/app"
      className={className ?? "mt-2 block text-center text-[13.5px] font-bold underline underline-offset-4"}
      style={{ color: color ?? "var(--color-accent)", wordBreak: "keep-all" }}
    >
      앱으로 설치해서 가입하면 선물 {CURRENCY_NAME} {formatNyang(WELCOME_GIFT)} ›
    </a>
  );
}

/** 대문 가입 혜택 단추 - 앱(또는 앱 전용 아님)이면 가입으로, 웹이면 앱 설치 안내로 */
export function JoinBannerButton({ style }: { style: React.CSSProperties }) {
  const here = useWelcomeHere();
  const toApp = here === false;
  return (
    <a href={toApp ? "/app" : "/login"} className="mx-auto mt-4 block max-w-[260px] rounded-xl py-3 text-center text-[15px] font-bold" style={style}>
      {toApp ? "앱으로 설치하고 선물 받기" : "가입하고 운세 보기"}
    </a>
  );
}
