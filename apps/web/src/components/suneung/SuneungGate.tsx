"use client";

import { useEffect, useRef, useState } from "react";

/**
 * 수능 대박운 링크 대문 (2026-11-02 유샘 지시서) - /go/suneung 에서 수능 전용 화면 위를 덮는다.
 *   ① 1_intro(2.5초)를 소리 없이 자동 재생 → ② 끝나면 끊김 없이 2_loop(6초) 무한 반복
 *   ③ 2초쯤 "수능 대박운 무료로 보기" 금빛 버튼이 떠오름 (세로 화면은 위에서 70%, 가로 화면은 80% 근처)
 *   ④ 버튼을 누르면 3_open(0.8초)을 소리와 함께 재생 (2_loop 위로 0.15초 겹쳐 넘김)
 *   ⑤ 3_open 마지막 장면(밝은 금빛 #FFECC6)과 같은 색에서 전용 화면으로 페이드 → 맨 위 수능 영상이 소리와 함께 시작
 *   - 다른 페이지로 넘어가면 휴대폰 브라우저가 소리를 다시 막기 때문에, 전용 화면 위에 덮었다가 걷어 내는 방식이다.
 *   - 건너뛰는 경우: 매일 아침 알림으로 들어옴(utm_source=push), "움직임 줄이기" 설정, 영상이 3초 안에 재생되지 않음
 *   - 2_loop·3_open 은 1_intro 가 재생되는 동안 미리 불러 둔다 (preload="auto").
 * SuneungHero 와는 아래 신호로 주고받는다: 대문이 덮여 있으면 html[data-sgate="on"] (화면이 그려지기 전에 작은 스크립트가 정함)
 */

export const SGATE_UNLOCK = "suneung-gate-unlock";
export const SGATE_DONE = "suneung-gate-done";

const GOLD_END = "#FFECC6";
const DIR = "/gate/suneung";

// 화면이 그려지기 전에: 건너뛸지 정하고, 덮을 거면 표시 + 스크롤 잠금 (수능 영상이 먼저 소리를 내지 않게)
const DECIDE = `(function(){try{var q=new URLSearchParams(location.search);if(q.get("utm_source")==="push"||matchMedia("(prefers-reduced-motion: reduce)").matches)return;document.documentElement.setAttribute("data-sgate","on");}catch(e){}})();`;

type Stage = "intro" | "loop" | "open" | "fade" | "done";

export function isGateOn(): boolean {
  return typeof document !== "undefined" && document.documentElement.getAttribute("data-sgate") === "on";
}

function finish(sound: boolean) {
  document.documentElement.removeAttribute("data-sgate");
  window.dispatchEvent(new CustomEvent(SGATE_DONE, { detail: { sound } }));
}

export function SuneungGate() {
  const [stage, setStage] = useState<Stage>("intro");
  const [on, setOn] = useState(true);
  const [button, setButton] = useState(false);
  const [orient, setOrient] = useState<"portrait" | "landscape">("portrait");
  // 화면 방향을 정한 뒤에만 영상을 붙인다 (가로 기기가 세로 영상을 헛되이 받지 않게)
  const [ready, setReady] = useState(false);
  const intro = useRef<HTMLVideoElement>(null);
  const loop = useRef<HTMLVideoElement>(null);
  const open = useRef<HTMLVideoElement>(null);
  const stageRef = useRef<Stage>("intro");
  const go = (s: Stage) => {
    stageRef.current = s;
    setStage(s);
  };

  // 시작: 건너뛸지, 화면 방향, 3초 안에 재생 안 되면 건너뛰기
  useEffect(() => {
    if (!isGateOn()) {
      setOn(false);
      return;
    }
    setOrient(window.innerHeight >= window.innerWidth ? "portrait" : "landscape");
    setReady(true);
    document.body.style.overflow = "hidden";
    const giveUp = window.setTimeout(() => {
      if (stageRef.current === "intro" && (intro.current?.currentTime ?? 0) < 0.05) skipAll();
    }, 3000);
    return () => {
      window.clearTimeout(giveUp);
      document.body.style.overflow = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 방향이 정해지면 재생 시작 (소리 없이)
  useEffect(() => {
    const v = intro.current;
    if (!on || !ready || !v) return;
    v.muted = true;
    v.play().catch(() => skipAll());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, on]);

  function skipAll() {
    if (stageRef.current === "done") return;
    go("done");
    setOn(false);
    document.body.style.overflow = "";
    finish(false);
  }

  // ① → ② 이음: intro 끝 직전에 loop 를 먼저 재생해 두고, loop 가 실제로 돌기 시작하면 바꿔 보인다 (검은 틈 없이)
  function onIntroTime() {
    const v = intro.current;
    const l = loop.current;
    if (!v || !l || stageRef.current !== "intro") return;
    if (v.duration && v.currentTime >= v.duration - 0.12 && l.paused) {
      l.muted = true;
      l.currentTime = 0;
      l.play().catch(() => {});
    }
  }
  function onLoopPlaying() {
    if (stageRef.current === "intro") go("loop");
  }
  function onIntroEnded() {
    const l = loop.current;
    if (stageRef.current === "intro" && l) {
      l.muted = true;
      l.play().catch(() => {});
      go("loop");
    }
  }
  function onIntroPlaying() {
    window.setTimeout(() => setButton(true), 2000);
  }

  // ④ 버튼: 이 누름 안에서 소리를 켜야 휴대폰이 허락한다
  function enter() {
    if (stageRef.current !== "intro" && stageRef.current !== "loop") return;
    const o = open.current;
    // 전용 화면 맨 위 수능 영상도 이 누름으로 소리를 미리 허락받아 둔다 (아이폰은 누른 순간에만 허락)
    window.dispatchEvent(new Event(SGATE_UNLOCK));
    setButton(false);
    if (!o) return reveal();
    o.muted = false;
    o.currentTime = 0;
    o.play()
      .then(() => go("open"))
      .catch(() => {
        // 소리가 막히면 소리 없이라도
        o.muted = true;
        o.play().then(() => go("open")).catch(reveal);
      });
    window.setTimeout(() => stageRef.current === "open" && reveal(), 2000); // 끝 신호가 안 오면
  }

  // ⑤ 금빛 끝 장면에서 전용 화면으로
  function reveal() {
    if (stageRef.current === "fade" || stageRef.current === "done") return;
    go("fade");
    window.scrollTo(0, 0);
    document.body.style.overflow = "";
    finish(true);
    window.setTimeout(() => {
      go("done");
      setOn(false);
    }, 750);
  }

  const src = (n: string) => `${DIR}/${n}_${orient}.mp4`;
  const layer: React.CSSProperties = { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" };

  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: DECIDE }} />
      <style
        dangerouslySetInnerHTML={{
          __html: `html[data-sgate="on"] .sg-cover{display:block}.sg-cover{display:none}
.sg-btn{animation:sg-up .6s ease-out both}@keyframes sg-up{from{opacity:0;transform:translate(-50%,calc(-50% + 14px))}to{opacity:1;transform:translate(-50%,-50%)}}`,
        }}
      />
      {/* 화면이 그려지기 전부터 덮개 (검은 바탕) - 대문을 건너뛰면 스크립트가 표시를 안 해서 보이지 않는다 */}
      {on && (
        <div
          className="sg-cover"
          role="dialog"
          aria-label="수능 대박운 대문"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 80,
            background: stage === "fade" ? GOLD_END : "#05070d",
            opacity: stage === "fade" ? 0 : 1,
            transition: stage === "fade" ? "opacity .7s ease-out" : undefined,
            overflow: "hidden",
          }}
        >
          {ready && (
          <>
          <video
            ref={intro}
            key={`i-${orient}`}
            src={src("1_intro")}
            muted
            playsInline
            preload="auto"
            onPlaying={onIntroPlaying}
            onTimeUpdate={onIntroTime}
            onEnded={onIntroEnded}
            style={{ ...layer, opacity: stage === "intro" ? 1 : 0 }}
          />
          <video
            ref={loop}
            key={`l-${orient}`}
            src={src("2_loop")}
            muted
            loop
            playsInline
            preload="auto"
            onPlaying={onLoopPlaying}
            style={{ ...layer, opacity: stage === "loop" || stage === "open" ? 1 : 0 }}
          />
          <video
            ref={open}
            key={`o-${orient}`}
            src={src("3_open")}
            playsInline
            preload="auto"
            onEnded={reveal}
            style={{ ...layer, opacity: stage === "open" || stage === "fade" ? 1 : 0, transition: "opacity .15s linear" }}
          />
          </>
          )}
          {button && (stage === "intro" || stage === "loop") && (
            <button
              type="button"
              onClick={enter}
              className="sg-btn whitespace-nowrap rounded-full px-8 py-4 text-[18px] font-bold shadow-xl"
              style={{
                position: "absolute",
                left: "50%",
                top: orient === "portrait" ? "70%" : "80%",
                transform: "translate(-50%,-50%)",
                background: "linear-gradient(180deg,#fff1c4,#d9b25a 45%,#a77b25)",
                color: "#1a1408",
                fontFamily: "var(--font-serif)",
                boxShadow: "0 0 0 1px rgba(255,241,196,.6), 0 10px 30px rgba(0,0,0,.45), 0 0 24px rgba(244,226,184,.35)",
              }}
            >
              수능 대박운 무료로 보기
            </button>
          )}
        </div>
      )}
    </>
  );
}
