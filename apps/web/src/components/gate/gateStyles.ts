/**
 * 세 길·일곱 운 대문 전용 스타일 (2026-10-28 mgml) - 다른 화면과 섞이지 않게 모두 gh- 로 시작한다.
 * 짙은 남색·검정 바탕에 샴페인 금빛, 새벽빛. 글씨는 명조(Noto Serif KR) + 고운돋움.
 */
export const GATE_CSS = `
html,body{overflow-x:clip}
.gh-hero{position:relative;z-index:25;overflow:hidden;background:#070b16;color:#ece6d8;
  width:100vw;margin-left:calc(50% - 50vw);height:100svh;min-height:480px;
  --gh-gold:#d6bc8a;--gh-gold-hi:#f4e2b8;--gh-ink:#ece6d8;--gh-dim:#b9b1a0;
  --gh-serif:"Noto Serif KR","Nanum Myeongjo","AppleMyungjo",serif;--gh-sans:"Gowun Dodum","Apple SD Gothic Neo","Malgun Gothic",sans-serif}
@media (orientation:portrait){.gh-hero{height:100svh;min-height:520px}}
.gh-video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.gh-shade{position:absolute;inset:0;pointer-events:none;background:linear-gradient(to bottom,rgba(7,11,22,.55) 0%,rgba(7,11,22,.05) 34%,rgba(7,11,22,0) 70%,rgba(7,11,22,.35) 100%)}
.gh-stage{position:absolute;inset:0;width:100%;height:100%}
.gh-pt{display:none}
.gh-bar{position:absolute;inset:0 0 auto;z-index:3;display:flex;align-items:center;justify-content:space-between;gap:16px;
  padding:calc(14px + env(safe-area-inset-top,0px)) max(24px,env(safe-area-inset-right,0px)) 14px max(24px,env(safe-area-inset-left,0px));
  background:linear-gradient(to bottom,rgba(7,11,22,.78),rgba(7,11,22,0));color:#f6ecd2}
.gh-brand{display:flex;align-items:center;gap:10px;font-family:var(--gh-serif);font-weight:700;letter-spacing:.08em;font-size:16px;color:#f6ecd2}
.gh-brand img{width:30px;height:30px}
.gh-nav{display:flex;align-items:center;gap:24px;font-size:14px;color:var(--gh-dim)}
.gh-nl:hover,.gh-nl:focus-visible{color:var(--gh-gold-hi)}
.gh-nav>*{flex-shrink:0}
@media (max-width:1060px){.gh-nl{display:none}}
@media (orientation:portrait){
  .gh-ls{display:none}.gh-pt{display:block}.gh-nl{display:none}
  .gh-bar{padding-top:calc(26px + env(safe-area-inset-top,0px));padding-bottom:16px;padding-left:max(20px,env(safe-area-inset-left,0px));padding-right:max(20px,env(safe-area-inset-right,0px))}
  .gh-brand{font-size:18px}.gh-brand img{width:34px;height:34px}.gh-nav{gap:12px}
  .gh-shade{background:linear-gradient(to bottom,rgba(7,11,22,.62) 0%,rgba(7,11,22,.22) 30%,rgba(7,11,22,.32) 60%,rgba(7,11,22,.55) 100%)}
}
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

/* 등장 순서: 엠블럼 → 제목 → 세 길이 흐름(流) → 일곱 운 → 채움에서 맺힘(結) */
@keyframes gh-fade{from{opacity:0}to{opacity:1}}
@keyframes gh-rise{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
@keyframes gh-draw{to{stroke-dashoffset:0}}
@keyframes gh-bloom{0%{opacity:0;transform:scale(.4)}70%{opacity:1;transform:scale(1.08)}100%{opacity:1;transform:scale(1)}}
@keyframes gh-breathe{0%,100%{opacity:.55}50%{opacity:1}}
.gh-a-emblem{animation:gh-fade 1.4s ease both}
.gh-a-title{animation:gh-rise 1s ease .5s both}
.gh-a-tag{animation:gh-rise 1s ease .8s both}
.gh-way-path{stroke-dasharray:1;stroke-dashoffset:1;animation:gh-draw 2.4s cubic-bezier(.45,.05,.3,1) 1.3s forwards}
.gh-way-tag{cursor:pointer;animation:gh-fade 1s ease 2.2s both}
.gh-node{cursor:pointer;transform-box:fill-box;transform-origin:center;animation:gh-bloom .7s ease both}
.gh-halo{animation:gh-breathe 4s ease-in-out 4.2s infinite}
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
`;
