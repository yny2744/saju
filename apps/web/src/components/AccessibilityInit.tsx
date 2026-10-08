"use client";

import { useEffect } from "react";

export const A11Y_STORAGE_KEY = "ryugyeol_a11y";

export interface A11yPrefs {
  fontSize: "normal" | "large";
  contrast: "normal" | "high";
}

export const DEFAULT_A11Y_PREFS: A11yPrefs = { fontSize: "normal", contrast: "normal" };

export function readA11yPrefs(): A11yPrefs {
  try {
    const raw = localStorage.getItem(A11Y_STORAGE_KEY);
    if (!raw) return DEFAULT_A11Y_PREFS;
    const parsed = JSON.parse(raw);
    return {
      fontSize: parsed.fontSize === "large" ? "large" : "normal",
      contrast: parsed.contrast === "high" ? "high" : "normal",
    };
  } catch {
    return DEFAULT_A11Y_PREFS;
  }
}

export function applyA11yPrefs(prefs: A11yPrefs) {
  document.documentElement.setAttribute("data-font-size", prefs.fontSize);
  document.documentElement.setAttribute("data-contrast", prefs.contrast);
}

export function saveA11yPrefs(prefs: A11yPrefs) {
  try {
    localStorage.setItem(A11Y_STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // 저장 실패해도(사파시크릿 모드 등) 이번 세션 적용 자체는 계속 동작한다.
  }
  applyA11yPrefs(prefs);
}

/**
 * 루트 레이아웃에 한 번만 넣어두면, 저장된 글자크기/대비 설정을 모든 페이지
 * 로드 시 <html> 속성으로 반영한다. 설정 자체은 /mypage(내 복주머니)의
 * 표시 설정에서 바꾼다 - 이 컴포넌트는 "적용"만 담당한다.
 */
export function AccessibilityInit() {
  useEffect(() => {
    applyA11yPrefs(readA11yPrefs());
  }, []);
  return null;
}
