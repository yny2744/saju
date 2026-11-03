"use client";

import { useEffect, useRef, useState } from "react";
import { PRICE } from "@/lib/yeopjeon";
import { gateDir, type GateEntry } from "@/lib/gates";
import { GATE_TITLE_CSS, GateTitle, gateFontHref } from "./GateTitle";
import { fitFontSize } from "@/lib/textZoomFix";

/**
 * 관별 링크 대문 (2026-11-02 유샘 지시서, 처음은 수능 대박운 대문) - /go/<slug> 에서 관 화면 위를 덮는다. 설정은 lib/gates.ts.
 *   ① 1_intro(2.5초)를 소리 없이 자동 재생 → ② 끝나면 끊김 없이 2_loop(6초) 무한 반복
 *   ③ 2초쯤 버튼이 떠오름 (영상 기준 세로 70%·가로 82%) - 문구는 손님 상태에 따라 "무료 보기" / "문 열기"
 *   ④ 버튼을 누르면 3_open(0.8초)을 소리와 함께 재생 (2_loop 위로 0.15초 겹쳐 넘김)
 *   ⑤ 3_open 마지막 장면(밝은 금빛 #FFECC6)과 같은 색에서 관 화면으로 페이드 → 관 맨 위 홍보 영상이 소리와 함께 시작
 *   - 영상에는 글자가 없다. 엠블럼·제목·브랜드는 GateTitle 이 영상 기준 비율로 얹는다 (1.65초부터 나타나고, 3_open 때 빛 속으로 사라짐).
 *   - 다른 페이지로 넘어가면 휴대폰 브라우저가 소리를 다시 막기 때문에, 관 화면 위에 덮었다가 걷어 내는 방식이다.
 *   - 건너뛰는 경우: 매일 아침 알림으로 들어옴(utm_source=push), "움직임 줄이기" 설정, 영상이 3초 안에 재생되지 않음
 *   - 2_loop·3_open 은 1_intro 가 재생되는 동안 미리 불러 둔다 (preload="auto").
 *   - 회색 재생 단추 깜빡임 막기: 모든 영상에 첫 장면 poster, 짙은 남색 바탕+첫 장면, 실제 재생('playing') 뒤에만 보이기,
 *     다음 영상이 재생된 뒤에 앞 영상 숨기기, 컨트롤·웹킷 기본 재생 단추 숨김.
 * 관 화면(예: SuneungHero)과는 아래 신호로 주고받는다: 대문이 덮여 있으면 html[data-sgate="on"] (화면이 그려지기 전에 작은 스크립트가 정함)
 */

export const SGATE_UNLOCK = "suneung-gate-unlock";
export const SGATE_DONE = "suneung-gate-done";

const GOLD_END = "#FFECC6";
/** 대문 영상 바탕과 같은 짙은 남색 - poster 를 불러오기 전 순간 */
const NAVY = "#0a1630";
/** 버튼 자리 (영상 높이에 대한 비율, 버튼 가운데) - 세로 70%·가로 82% (계단 아래 빈 바닥, 2026-11-02 지시서) */
const BTN_Y = { portrait: 0.7, landscape: 0.82 } as const;
const VIDEO_SIZE = { portrait: [1080, 1920], landscape: [1280, 720] } as const;


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

export function GateOverlay({ entry, brand, emblem }: { entry: GateEntry; brand: string; emblem: string }) {
  const DIR = gateDir(entry);
  const [stage, setStage] = useState<Stage>("intro");
  const [on, setOn] = useState(true);
  const [button, setButton] = useState(false);
  const [orient, setOrient] = useState<"portrait" | "landscape">("portrait");
  // 화면 방향을 정한 뒤에만 영상을 붙인다 (가로 기기가 세로 영상을 헛되이 받지 않게)
  const [ready, setReady] = useState(false);
  // 실제로 재생이 시작된 영상만 보이게 (그 전엔 poster·바탕이 보인다)
  const [shown, setShown] = useState({ intro: false, loop: false, open: false });
  const [btnTop, setBtnTop] = useState<number | null>(null);
  // 화면에 그려진 영상 상자 (잘린 부분 포함) - 글자를 영상 기준으로 얹는 자리
  const [rect, setRect] = useState<{ left: number; top: number; w: number; h: number } | null>(null);
  // 글자가 나타날 남은 시간 (1_intro 기준 1.65초·1.8초)
  const [titleIn, setTitleIn] = useState<{ d1: number; d2: number } | null>(null);
  // 버튼 문구: 무료로 볼 수 있으면 free, 엽전을 다 썼으면 paid
  const [label, setLabel] = useState(entry.button.free);
  const intro = useRef<HTMLVideoElement>(null);
  const loop = useRef<HTMLVideoElement>(null);
  const open = useRef<HTMLVideoElement>(null);
  const stageRef = useRef<Stage>("intro");
  const btnRef = useRef<HTMLButtonElement>(null);
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

  // 버튼 자리: 영상이 화면을 꽉 채우며(cover) 잘리는 만큼을 계산해, 영상 속 같은 자리에 둔다
  useEffect(() => {
    if (!ready) return;
    const place = () => {
      const [w, h] = VIDEO_SIZE[orient];
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const scale = Math.max(vw / w, vh / h);
      const vTop = (vh - h * scale) / 2;
      const top = vTop + BTN_Y[orient] * h * scale;
      setBtnTop(Math.min(top, vh - 22 - 12)); // 화면 아래로 넘치지 않게
      setRect({ left: (vw - w * scale) / 2, top: vTop, w: w * scale, h: h * scale });
    };
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [ready, orient]);

  // 버튼 문구 - 비로그인이거나 엽전이 그 상품 가격 이상이면 "무료 보기", 아니면 "문 열기"
  useEffect(() => {
    if (!entry.priceKey) return;
    const price = PRICE[entry.priceKey] ?? 0;
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d?.user?.termsAgreed) return;
        return fetch("/api/yeopjeon")
          .then((r) => (r.ok ? r.json() : null))
          .then((w) => {
            if (typeof w?.balance === "number" && w.balance < price) setLabel(entry.button.paid);
          });
      })
      .catch(() => {});
  }, [entry]);

  // 버튼 글자: 카카오톡 글자 확대가 걸려 있으면 그 비율만큼 줄여 17px 로 맞춘다
  useEffect(() => {
    if (button) fitFontSize(btnRef.current, 17);
  }, [button, label]);

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
    setShown((x) => ({ ...x, loop: true }));
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
    setShown((x) => (x.intro ? x : { ...x, intro: true }));
    const t = intro.current?.currentTime ?? 0;
    setTitleIn((x) => x ?? { d1: Math.max(0, 1.65 - t), d2: Math.max(0, 1.8 - t) });
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
    go("open");
    o.play().catch(() => {
      // 소리가 막히면 소리 없이라도
      o.muted = true;
      o.play().catch(reveal);
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
  const poster = (n: string) => `${DIR}/${n}_${orient}.jpg`;
  const layer: React.CSSProperties = { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", backgroundColor: "transparent" };
  // 영상 공통: 컨트롤 없음, 화면 안에서 재생, 미리 받기, 첫 장면 poster
  const common = { playsInline: true, preload: "auto", controls: false, disablePictureInPicture: true, disableRemotePlayback: true } as const;
  // 앞 영상은 다음 영상이 실제로 재생된 뒤에 숨긴다
  const introVisible = shown.intro && !shown.loop;
  const loopVisible = shown.loop;
  const openVisible = shown.open && (stage === "open" || stage === "fade");

  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: DECIDE }} />
      {/* eslint-disable-next-line @next/next/no-page-custom-font -- 대문 글자만 받는 작은 글꼴 */}
      <link rel="stylesheet" href={gateFontHref(entry.title + brand)} />
      <style
        dangerouslySetInnerHTML={{
          __html: `html[data-sgate="on"] .sg-cover{display:block}.sg-cover{display:none}
.sg-cover video::-webkit-media-controls,.sg-cover video::-webkit-media-controls-panel,.sg-cover video::-webkit-media-controls-start-playback-button,.sg-cover video::-webkit-media-controls-overlay-play-button,.sg-cover video::-webkit-media-controls-play-button{display:none!important;-webkit-appearance:none;opacity:0!important}
.sg-btn{animation:sg-up .6s ease-out both,sg-breath 2.8s ease-in-out .6s infinite}
@keyframes sg-up{from{opacity:0;transform:translate(-50%,calc(-50% + 12px))}to{opacity:1;transform:translate(-50%,-50%)}}
@keyframes sg-breath{0%,100%{box-shadow:0 0 0 0 rgba(244,214,140,0),0 0 6px rgba(244,214,140,.25)}50%{box-shadow:0 0 0 1px rgba(244,214,140,.35),0 0 16px rgba(244,214,140,.45)}}
@media (prefers-reduced-motion:reduce){.sg-btn{animation:none}}${GATE_TITLE_CSS}`,
        }}
      />
      {/* 화면이 그려지기 전부터 덮개 (짙은 남색 + 첫 장면) - 대문을 건너뛰면 스크립트가 표시를 안 해서 보이지 않는다 */}
      {on && (
        <div
          className="sg-cover"
          role="dialog"
          aria-label={`${entry.title} 대문`}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 80,
            backgroundColor: stage === "fade" ? GOLD_END : NAVY,
            backgroundImage: ready && stage !== "fade" ? `url(${poster("1_intro")})` : undefined,
            backgroundSize: "cover",
            backgroundPosition: "center",
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
                poster={poster("1_intro")}
                muted
                {...common}
                onPlaying={onIntroPlaying}
                onTimeUpdate={onIntroTime}
                onEnded={onIntroEnded}
                style={{ ...layer, opacity: introVisible ? 1 : 0 }}
              />
              <video
                ref={loop}
                key={`l-${orient}`}
                src={src("2_loop")}
                poster={poster("2_loop")}
                muted
                loop
                {...common}
                onPlaying={onLoopPlaying}
                style={{ ...layer, opacity: loopVisible ? 1 : 0 }}
              />
              <video
                ref={open}
                key={`o-${orient}`}
                src={src("3_open")}
                poster={poster("3_open")}
                {...common}
                onPlaying={() => setShown((x) => ({ ...x, open: true }))}
                onEnded={reveal}
                style={{ ...layer, opacity: openVisible ? 1 : 0, transition: "opacity .15s linear" }}
              />
            </>
          )}
          {/* 엠블럼·제목·브랜드 (영상 기준 상자) */}
          {rect && titleIn && (
            <div style={{ position: "absolute", left: rect.left, top: rect.top, width: rect.w, height: rect.h, pointerEvents: "none" }}>
              <GateTitle
                orient={orient}
                w={rect.w}
                h={rect.h}
                title={entry.title}
                brand={brand}
                emblem={emblem}
                phase={stage === "open" || stage === "fade" ? "out" : "in"}
                d1={titleIn.d1}
                d2={titleIn.d2}
                fitWidth={Math.min(rect.w, rect.w + 2 * rect.left)}
              />
            </div>
          )}
          {button && btnTop !== null && (stage === "intro" || stage === "loop") && (
            <button
              ref={btnRef}
              type="button"
              onClick={enter}
              className="sg-btn whitespace-nowrap rounded-full font-bold"
              style={{
                position: "absolute",
                left: "50%",
                top: btnTop,
                height: 44,
                // 여백도 px 로 (글자 확대에 rem 여백이 따라 커지지 않게)
                paddingLeft: 36,
                paddingRight: 36,
                fontSize: 17,
                transform: "translate(-50%,-50%)",
                backgroundColor: "rgba(0,0,0,.25)",
                backdropFilter: "blur(6px)",
                WebkitBackdropFilter: "blur(6px)",
                border: "1.25px solid rgba(232,196,110,.95)",
                color: "#f6dc94",
                fontFamily: "var(--font-serif)",
                letterSpacing: ".04em",
                textShadow: "0 1px 6px rgba(0,0,0,.55)",
              }}
            >
              {label}
            </button>
          )}
        </div>
      )}
    </>
  );
}
