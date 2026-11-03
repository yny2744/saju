"use client";

import { useEffect, useRef } from "react";
import { roomHome, sameOriginReferrer } from "@/lib/roomHome";

/**
 * 관 안의 단계 뒤로가기 (2026-11-03 유샘 지시서) - 단계가 바뀔 때마다 브라우저 기록에 한 칸 쌓고(history.pushState),
 * 뒤로가기(머리줄 〈 · 휴대폰 뒤로 버튼·밀기)를 누르면 그 관 안의 이전 단계로 돌아간다.
 *   active 가 켜지는 순간 한 칸 쌓는다. 뒤로가기로 그 칸을 벗어나면 onBack 을 부른다 (예: 결과 → 입력 칸, 결제 창 닫기).
 */
export function useStepBack(step: string, active: boolean, onBack: () => void) {
  const pushed = useRef(false);
  const back = useRef(onBack);
  back.current = onBack;

  useEffect(() => {
    if (active && !pushed.current) {
      pushed.current = true;
      window.history.pushState({ ...(window.history.state ?? {}), roomStep: step }, "");
    }
    if (!active && pushed.current && window.history.state?.roomStep === step) {
      // 화면 안 단추로 단계를 닫았으면 쌓았던 칸도 걷는다
      pushed.current = false;
      window.history.back();
    }
    if (!active) pushed.current = false;
  }, [active, step]);

  useEffect(() => {
    const onPop = () => {
      if (pushed.current && window.history.state?.roomStep !== step) {
        pushed.current = false;
        back.current();
      }
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [step]);
}

/**
 * 링크·알림으로 바로 들어와 앞 기록이 없을 때 (2026-11-03): 휴대폰 뒤로 버튼이 사이트 밖으로 나가지 않고
 * 메인의 그 관 위치로 가게, 맨 아래에 받침 칸을 하나 깔아 둔다. 관 화면(RoomShell)이 한 번 부른다.
 */
export function useRoomBackGuard() {
  useEffect(() => {
    const home = roomHome(location.pathname, location.search);
    // 결과 화면 등으로 갔다가 돌아와 받침 칸에 닿았으면 곧바로 메인의 그 관 위치로
    if (window.history.state?.rg === "base") {
      window.location.replace(home);
      return;
    }
    if (!sameOriginReferrer() && !window.history.state?.rg) {
      window.history.replaceState({ ...(window.history.state ?? {}), rg: "base" }, "");
      window.history.pushState({ ...(window.history.state ?? {}), rg: "top" }, "");
    }
    // 받침 칸을 깐 화면이면 (다른 화면에 다녀와 다시 그려졌어도) 받침 칸으로 돌아올 때를 지켜본다
    const onPop = () => {
      if (window.history.state?.rg === "base") window.location.replace(home);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
}
