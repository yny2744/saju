"use client";

import { useEffect, useState } from "react";
import { WELCOME_GIFT, WELCOME_GIFT_APP_ONLY } from "@/lib/yeopjeon";
import { detectAppEnv } from "./AppInstall";

/**
 * 지금 이 화면에서 가입하면 가입 선물을 받나 (2026-11-01 유샘: 앱 전용 고객사는 앱으로 열었을 때만).
 * true = 받는다 (앱 전용이 아니거나 앱으로 열었음) / false = 웹이라 앱으로 열어야 받는다 / null = 아직 모름(첫 그림)
 * 첫 그림(서버)에서는 앱 전용이 아니면 true, 앱 전용이면 null 이라 화면이 깜빡이지 않게 한 줄짜리 자리만 맞춘다.
 */
export function useWelcomeHere(): boolean | null {
  const [here, setHere] = useState<boolean | null>(WELCOME_GIFT_APP_ONLY ? null : WELCOME_GIFT > 0);
  useEffect(() => {
    if (!WELCOME_GIFT_APP_ONLY) return;
    setHere(detectAppEnv() === "standalone");
  }, []);
  return here;
}
