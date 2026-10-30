/**
 * 세 길·일곱 운 대문 전용 스타일 (2026-10-28 mgml) - 다른 화면과 섞이지 않게 모두 gh- 로 시작한다.
 * 짙은 남색·검정 바탕에 샴페인 금빛, 새벽빛. 글씨는 명조(Noto Serif KR) + 고운돋움.
 */
export const GATE_CSS = `
.gh-hero{position:relative;overflow:hidden;background:#070b16;color:#ece6d8;
  width:100%;height:100svh;min-height:520px;
  --gh-gold:#d6bc8a;--gh-gold-hi:#f4e2b8;--gh-ink:#ece6d8;--gh-dim:#b9b1a0;
  --gh-serif:"Noto Serif KR","Nanum Myeongjo","AppleMyungjo",serif;--gh-sans:"Gowun Dodum","Apple SD Gothic Neo","Malgun Gothic",sans-serif}
.gh-video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.gh-shade{position:absolute;inset:0;pointer-events:none;background:linear-gradient(to bottom,rgba(7,11,22,.55) 0%,rgba(7,11,22,.05) 34%,rgba(7,11,22,0) 70%,rgba(7,11,22,.35) 100%)}
.gh-stage{position:absolute;inset:0;width:100%;height:100%}
.gh-bar{position:absolute;inset:0 0 auto;z-index:3;display:flex;align-items:center;justify-content:space-between;gap:16px;
  padding:calc(14px + env(safe-area-inset-top,0px)) max(24px,env(safe-area-inset-right,0px)) 14px max(24px,env(safe-area-inset-left,0px));
  background:linear-gradient(to bottom,rgba(7,11,22,.78),rgba(7,11,22,0));color:#f6ecd2}
.gh-brand{display:flex;align-items:center;gap:10px;font-family:var(--gh-serif);font-weight:700;letter-spacing:.08em;font-size:16px;color:#f6ecd2}
.gh-brand img{width:30px;height:30px}
.gh-nav{display:flex;align-items:center;gap:24px;font-size:calc(14px * var(--gh-tz,1));color:var(--gh-dim)}
.gh-nl:hover,.gh-nl:focus-visible{color:var(--gh-gold-hi)}
.gh-nav>*{flex-shrink:0}
.gh-bar{padding-top:calc(26px + env(safe-area-inset-top,0px));padding-bottom:16px;padding-left:max(20px,env(safe-area-inset-left,0px));padding-right:max(20px,env(safe-area-inset-right,0px))}
.gh-brand{font-size:calc(clamp(14px,4.3vw,18px) * var(--gh-tz,1));letter-spacing:.04em;white-space:nowrap;min-width:0}.gh-brand img{width:34px;height:34px;flex-shrink:0}.gh-nav{gap:12px}
.gh-shade{background:linear-gradient(to bottom,rgba(7,11,22,.62) 0%,rgba(7,11,22,.22) 30%,rgba(7,11,22,.32) 60%,rgba(7,11,22,.55) 100%)}
.gh-hero a:focus-visible{outline:2px solid var(--gh-gold);outline-offset:3px}
.gh-title{font-family:var(--gh-serif);font-weight:900;fill:var(--gh-gold-hi);letter-spacing:.06em;paint-order:stroke;stroke:rgba(7,11,22,.6);stroke-width:5px;cursor:pointer}
.gh-side{font-family:var(--gh-serif);font-weight:700;fill:var(--gh-gold-hi);letter-spacing:.14em;paint-order:stroke;stroke:rgba(5,8,16,.85);stroke-width:7px;stroke-linejoin:round}
.gh-disc{fill:#0a1020;stroke:rgba(244,226,184,.55);stroke-width:1.5;filter:drop-shadow(0 0 18px rgba(7,11,22,.9))}
.gh-a-emblem{cursor:pointer}
.gh-way-path{fill:none;stroke:var(--gh-gold);stroke-width:2;stroke-linecap:round}
.gh-ls .gh-way-path{filter:url(#gh-glow-ls)}
.gh-pt .gh-way-path{filter:url(#gh-glow-pt);stroke-width:3}
.gh-way-name{font-family:var(--gh-serif);font-weight:700;fill:var(--gh-gold-hi);letter-spacing:.12em;text-anchor:middle;dominant-baseline:central}
.gh-way-pill{fill:rgba(7,11,22,.86);stroke:var(--gh-gold);stroke-width:1.2}
.gh-hit{fill:transparent}
.gh-ring{fill:rgba(7,11,22,.9);stroke:var(--gh-gold-hi);stroke-width:2;transition:fill .3s}
.gh-glyph{font-family:var(--gh-serif);font-weight:700;fill:var(--gh-gold-hi);text-anchor:middle;dominant-baseline:central}
.gh-lbl{font-family:var(--gh-sans);fill:#fbf6ea;text-anchor:middle;dominant-baseline:central;letter-spacing:.02em;paint-order:stroke;stroke:rgba(5,8,16,.92);stroke-linejoin:round}
.gh-sub{font-family:var(--gh-sans);fill:#efe6d2;text-anchor:middle;dominant-baseline:central;paint-order:stroke;stroke:rgba(5,8,16,.92);stroke-linejoin:round}
.gh-node:hover .gh-ring,.gh-node:focus-visible .gh-ring{fill:rgba(214,188,138,.22)}
.gh-node:focus{outline:none}
.gh-fruit .gh-ring{fill:rgba(20,16,8,.75);stroke:var(--gh-gold-hi);stroke-width:2}
.gh-fruit-lbl{font-family:var(--gh-serif);font-weight:700;fill:var(--gh-gold-hi)}
.gh-spark{fill:#fff3d2;stroke:var(--gh-gold);stroke-width:2;opacity:0;transition:opacity .6s;filter:drop-shadow(0 0 6px rgba(244,226,184,.95)) drop-shadow(0 0 14px rgba(214,188,138,.7))}

/* 등장 순서: 엠블럼 → 제목 → 세 길이 흐름(流) → 일곱 운 → 채움에서 맺힘(結) - 2026-10-30 유샘: 모두 두 배 빠르게 */
@keyframes gh-fade{from{opacity:0}to{opacity:1}}
@keyframes gh-rise{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
@keyframes gh-draw{to{stroke-dashoffset:0}}
@keyframes gh-bloom{0%{opacity:0;transform:scale(.4)}70%{opacity:1;transform:scale(1.08)}100%{opacity:1;transform:scale(1)}}
@keyframes gh-breathe{0%,100%{opacity:.55}50%{opacity:1}}
.gh-a-emblem{animation:gh-fade .7s ease both}
.gh-a-title{animation:gh-rise .5s ease .25s both}
.gh-a-tag{animation:gh-rise .5s ease .4s both}
.gh-way-path{stroke-dasharray:1;stroke-dashoffset:1;animation:gh-draw 1.2s cubic-bezier(.45,.05,.3,1) .65s forwards}
.gh-way-tag{cursor:pointer;animation:gh-fade .5s ease 1.1s both}
.gh-node{cursor:pointer;transform-box:fill-box;transform-origin:center;animation:gh-bloom .35s ease both}
.gh-halo{animation:gh-breathe 4s ease-in-out 2.1s infinite}
@media (prefers-reduced-motion:reduce){
  .gh-a-emblem,.gh-a-title,.gh-a-tag,.gh-way-path,.gh-way-tag,.gh-node,.gh-halo{animation:none;opacity:1;stroke-dashoffset:0}
  .gh-spark{display:none}
}

/* 소개글 창 */
.gh-dialog{position:fixed;inset:0;z-index:60;display:flex;align-items:center;justify-content:center;padding:max(16px,env(safe-area-inset-top,0px)) 16px max(16px,env(safe-area-inset-bottom,0px));background:rgba(4,7,14,.78);backdrop-filter:blur(4px)}
.gh-dialog-box{position:relative;max-width:560px;width:100%;max-height:100%;overflow-y:auto;border-radius:18px;padding:36px 26px 30px;
  background:linear-gradient(#0b1224,#111a33);color:#ece6d8;border:1px solid rgba(214,188,138,.45);box-shadow:inset 0 0 0 4px #0b1224,inset 0 0 0 5px rgba(214,188,138,.25),0 20px 60px rgba(0,0,0,.5)}
.gh-dialog-close{position:absolute;top:10px;right:12px;width:40px;height:40px;border-radius:50%;color:#d6bc8a;font-size:24px;line-height:40px;text-align:center}
.gh-dialog-close:focus-visible{outline:2px solid #d6bc8a}
/* 2026-10-29 첫 장면 뒤 소개 카드 9장 (3초마다, 9번 다음 1번) */
@keyframes gh-cards-in{from{opacity:0;transform:scale(.86)}to{opacity:1;transform:none}}
.gh-cards{position:absolute;inset:0;z-index:2;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;gap:14px;
  padding:0 16px calc(18px + env(safe-area-inset-bottom,0px));container-type:size;
  background:linear-gradient(to bottom,rgba(7,11,22,.55) 0,rgba(7,11,22,.92) 60px,rgba(9,14,28,.96) 100%);transform-origin:50% 60%;animation:gh-cards-in .9s cubic-bezier(.2,.7,.2,1) both}
.gh-cards-frame{position:relative;flex-shrink:0;width:min(100%,640px);width:min(100%,calc(100cqh - 92px),640px);aspect-ratio:1;border-radius:16px;overflow:hidden;
  box-shadow:0 0 0 1px rgba(214,188,138,.55),0 18px 50px rgba(0,0,0,.6)}
/* 카드가 열려 있는 동안 뒤의 길·운은 감춘다 (비쳐 보이지 않게) */
.gh-cards-on .gh-nodes,.gh-cards-on .gh-way-path{visibility:hidden}
.gh-cards-emblem{position:absolute;z-index:3;border-radius:50%;background:#0a1020;display:grid;place-items:center;pointer-events:none;
  box-shadow:0 0 0 2px rgba(244,226,184,.85),0 8px 22px rgba(0,0,0,.7);animation:gh-fade .6s ease both}
.gh-cards-emblem img{width:89.8%;height:89.8%}
.gh-card{position:absolute;inset:0;width:100%;height:100%;opacity:0;transition:opacity .6s ease}
.gh-card.on{opacity:1}
.gh-cards-next{position:absolute;right:8px;top:50%;transform:translateY(-50%);width:46px;height:46px;border-radius:50%;padding:0;
  display:flex;align-items:center;justify-content:center;background:rgba(7,11,22,.68);color:#f4e2b8;border:1px solid #d6bc8a}
.gh-cards-next svg{margin-left:2px}
.gh-cards-frame{cursor:pointer;-webkit-tap-highlight-color:transparent}
.gh-cards-paused{position:absolute;top:10px;right:10px;display:flex;align-items:center;gap:6px;padding:6px 12px;border-radius:999px;
  background:rgba(7,11,22,.75);color:#f4e2b8;border:1px solid rgba(214,188,138,.7);font-size:calc(13px * var(--gh-tz,1));font-weight:700;letter-spacing:.04em;pointer-events:none}
.gh-cards-dots{display:flex;gap:8px}
.gh-cards-dots span{width:8px;height:8px;border-radius:4px;background:rgba(214,188,138,.38);transition:width .3s,background .3s}
.gh-cards-dots span.on{width:22px;background:#f4e2b8}
.gh-cards-skip{padding:9px 20px;border-radius:999px;border:1px solid rgba(214,188,138,.7);color:#f4e2b8;background:rgba(7,11,22,.5);
  font-family:var(--gh-serif);font-weight:700;font-size:calc(15px * var(--gh-tz,1));letter-spacing:.06em}
.gh-cards button:focus-visible{outline:2px solid #d6bc8a;outline-offset:3px}
@media (prefers-reduced-motion:reduce){.gh-cards{animation:none}.gh-card{transition:none}}
/* 2026-10-30 광고별 홀로그램 대문 - 머리줄 사이 바로 아래, 제목 위. 대문 그림은 그만큼(54px) 아래로 */
.gh-hero{container-type:inline-size;-webkit-text-size-adjust:100%;text-size-adjust:100%}
.gh-door-on .gh-stage{top:var(--gh-door-shift,54px);height:calc(100% - var(--gh-door-shift,54px))}
.gh-door-wrap{position:absolute;left:50%;top:calc(62px + env(safe-area-inset-top,0px));z-index:4;width:min(48cqw,280px);transform:translateX(-50%);perspective:900px;
  animation:gh-fade 1.4s ease 2s both,gh-door-bob 3.2s ease-in-out 3.4s infinite}
@keyframes gh-door-bob{0%,100%{translate:0 0}50%{translate:0 -4px}}
.gh-door{position:relative;display:flex;width:100%;aspect-ratio:256/70;cursor:pointer;border:0;padding:0;background:none;color:inherit;font:inherit}
.gh-door:focus-visible{outline:2px solid var(--gh-gold-hi);outline-offset:5px;border-radius:999px}
.gh-door-leaf{position:relative;flex:1;overflow:hidden;
  background:linear-gradient(160deg,rgba(255,240,205,.26),rgba(160,200,255,.10) 60%,rgba(255,240,205,.18));
  border:1px solid rgba(244,226,184,.8);backdrop-filter:blur(6px) saturate(1.3);-webkit-backdrop-filter:blur(6px) saturate(1.3);
  box-shadow:0 0 18px rgba(244,226,184,.35),inset 0 0 14px rgba(255,255,255,.12);transition:transform .85s cubic-bezier(.6,.05,.3,1),opacity .85s}
.gh-door-leaf.l{border-radius:36px 0 0 8px;transform-origin:left center;border-right:none}
.gh-door-leaf.r{border-radius:0 36px 8px 0;transform-origin:right center;border-left:none}
.gh-door-leaf::after{content:"";position:absolute;inset:-40% -60%;background:linear-gradient(105deg,transparent 40%,rgba(255,255,255,.35) 50%,transparent 60%);animation:gh-door-shine 3.6s linear infinite}
@keyframes gh-door-shine{from{transform:translateX(-60%)}to{transform:translateX(60%)}}
.gh-door-txt{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;pointer-events:none;
  font-family:var(--gh-serif);color:#fff6dc;text-shadow:0 0 8px rgba(244,226,184,.9),0 0 2px rgba(0,0,0,.6);transition:opacity .35s}
.gh-door-txt b{font-size:calc(min(3.9cqw,22px) * var(--gh-tz,1));font-weight:900;letter-spacing:.04em;white-space:nowrap}
.gh-door-txt small{font-size:calc(min(2.9cqw,16px) * var(--gh-tz,1));font-weight:700;color:var(--gh-gold-hi);letter-spacing:.12em;margin-top:2px;white-space:nowrap}
.gh-door-light{position:absolute;inset:0;border-radius:36px 36px 8px 8px;background:radial-gradient(ellipse at center,#fff6dc 0%,rgba(244,226,184,.8) 40%,rgba(244,226,184,0) 75%);opacity:0;transition:opacity .85s}
.gh-door.open .gh-door-leaf.l{transform:rotateY(-80deg);opacity:.5}.gh-door.open .gh-door-leaf.r{transform:rotateY(80deg);opacity:.5}
.gh-door.open .gh-door-txt{opacity:0}.gh-door.open .gh-door-light{opacity:1}
.gh-door-flash{position:fixed;inset:0;z-index:70;pointer-events:none;opacity:0;transition:opacity .7s;
  background:radial-gradient(circle at 50% 12%,#fff6dc 0%,rgba(244,226,184,.9) 30%,rgba(7,11,22,0) 75%)}
.gh-door-flash.on{opacity:1}
@media (prefers-reduced-motion:reduce){.gh-door-wrap{animation:none}.gh-door-leaf::after{animation:none}}
`;
