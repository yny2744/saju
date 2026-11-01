"use client";

import { useEffect } from "react";

/**
 * 입력 화면(/start) "문이 열리는" 전환 (2026-11-01 유샘 지시서 7번) - 대문이 있는 고객사(명견만리)만.
 *   단청 문짝 두 장이 양쪽으로 활짝 열리고 안쪽에서 금빛이 새어 나온다. 영상 없이 CSS 로만, 1초 이내.
 *   화면을 누르면 바로 건너뛴다 / 이 기기에서 한 번 본 손님에게는 다시 보이지 않는다(localStorage)
 *   "움직임 줄이기"를 켠 손님, 대문의 홀로그램 문을 열고 막 들어온 손님(문이 두 번 열리지 않게)은 건너뛴다.
 * 깜빡임 방지: 기본은 숨겨 두고, 화면이 그려지기 전에 아래 작은 스크립트가 "보여 줄지"를 정해 html 에 표시(data-sd="play")한다.
 *   (사이트 안 화면 전환으로 들어올 때는 스크립트가 돌지 않아 효과 없이 바로 열린다)
 */

export const START_DOOR_SEEN_KEY = "ryugyeol_start_door";
/** 대문의 홀로그램 문을 열고 들어가는 순간 GateDoor 가 남기는 표시 (sessionStorage) */
export const GATE_DOOR_JUST_OPENED_KEY = "ryugyeol_gate_door_opened";

const DECIDE = `(function(){try{var d=document.documentElement;var j=sessionStorage.getItem("${GATE_DOOR_JUST_OPENED_KEY}");if(j)sessionStorage.removeItem("${GATE_DOOR_JUST_OPENED_KEY}");if(j||localStorage.getItem("${START_DOOR_SEEN_KEY}")||matchMedia("(prefers-reduced-motion: reduce)").matches)return;d.setAttribute("data-sd","play");}catch(e){}})();`;

const CSS = `
.sd{display:none}
html[data-sd="play"] .sd{display:block;position:fixed;inset:0;z-index:70;overflow:hidden;cursor:pointer;perspective:1200px;
  animation:sd-out .2s ease-in .75s forwards}
.sd-light{position:absolute;inset:0;background:radial-gradient(ellipse 40% 60% at 50% 50%,#fff6d6 0%,#f1d48a 28%,#b8862e 55%,#140f0a 85%);
  opacity:.35;animation:sd-glow .75s ease-out forwards}
.sd-door{position:absolute;top:0;bottom:0;width:50.5%;
  background:
    linear-gradient(90deg,transparent 0 10%,rgba(0,0,0,.18) 10% 11%,transparent 11% 89%,rgba(0,0,0,.18) 89% 90%,transparent 90%),
    repeating-linear-gradient(0deg,#1f5a55 0 22px,#2a6d66 22px 26px,#1f5a55 26px 48px,#b23a2e 48px 52px),
    #1f5a55;
  box-shadow:inset 0 0 0 6px #8e2a22,inset 0 0 0 9px #d9b25a,inset 0 0 0 14px #1d3b5c,inset 0 0 40px rgba(0,0,0,.45)}
.sd-door::after{content:"";position:absolute;top:50%;width:14px;height:14px;margin-top:-7px;border-radius:50%;
  background:radial-gradient(circle at 35% 35%,#fff1c4,#d9b25a 55%,#8a6420);box-shadow:0 0 10px rgba(244,226,184,.6)}
.sd-l{left:0;transform-origin:left center;animation:sd-l .7s cubic-bezier(.6,.05,.3,1) .08s forwards}
.sd-r{right:0;transform-origin:right center;animation:sd-r .7s cubic-bezier(.6,.05,.3,1) .08s forwards}
.sd-l::after{right:18px}.sd-r::after{left:18px}
@keyframes sd-l{to{transform:rotateY(78deg) translateX(-30%);filter:brightness(.6)}}
@keyframes sd-r{to{transform:rotateY(-78deg) translateX(30%);filter:brightness(.6)}}
@keyframes sd-glow{60%{opacity:1}to{opacity:1}}
@keyframes sd-out{to{opacity:0;visibility:hidden}}
`;

export function StartDoor() {
  useEffect(() => {
    const d = document.documentElement;
    if (d.getAttribute("data-sd") !== "play") return;
    try {
      localStorage.setItem(START_DOOR_SEEN_KEY, "1");
    } catch {
      /* 무시 */
    }
    const end = () => d.setAttribute("data-sd", "done");
    const t = window.setTimeout(end, 980);
    return () => window.clearTimeout(t);
  }, []);

  const skip = () => document.documentElement.setAttribute("data-sd", "done");
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <script dangerouslySetInnerHTML={{ __html: DECIDE }} />
      <div className="sd" aria-hidden onClick={skip} onTouchStart={skip}>
        <div className="sd-light" />
        <div className="sd-door sd-l" />
        <div className="sd-door sd-r" />
      </div>
    </>
  );
}
