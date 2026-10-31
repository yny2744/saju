import { TENANT } from "@/tenants";
import { TAROT_CARDS, TAROT_IMAGES } from "@/lib/fun/tarot";

/**
 * 타로 카드 한 장 (2026-10-31) - 앞면은 그림이 있으면 그림(public/tarot/NN.png), 없으면 금박 한자 카드.
 * 뒷면은 고객사 엠블럼(대문 엠블럼) + 문구, 엠블럼이 없는 고객사는 로고 글자. 22장 뒷면은 모두 같다 (어느 카드인지 모르게).
 * 뒤집기는 부모가 flipped 로 정한다 (CSS 3D, prefers-reduced-motion 이면 바로 바뀜).
 */

/**
 * 2026-10-31 유샘: 군청색 대신 "옻칠 · 금박 · 자개" (나전칠기) - 검은 옻칠 바탕, 금박 글자·테두리, 은빛 가는 선, 자개 점.
 * 금박·자개 색은 화면 전체(타로 화면 판·버튼)에서 함께 쓴다 → TAROT_LUX_CSS.
 */
export const TAROT_LUX_CSS = `
.gold-t{background:linear-gradient(100deg,#f7e7b4 0%,#d9b25a 32%,#fff1c4 52%,#b8862e 78%,#f3dc9a 100%);-webkit-background-clip:text;background-clip:text;color:transparent}
.lux-panel{background:radial-gradient(circle at 50% 28%,#2a2420 0%,#0b0908 75%);box-shadow:inset 0 0 0 1.5px #c9a04a,inset 0 0 0 6px #0b0908,inset 0 0 0 7px rgba(214,178,98,.45),0 8px 18px rgba(0,0,0,.22)}
.lux-btn{color:#1a1408;background:linear-gradient(180deg,#fff1c4 0%,#d9b25a 45%,#a77b25 100%);box-shadow:0 3px 10px rgba(0,0,0,.3),inset 0 1px 0 rgba(255,255,255,.7);border:0}
.lux-btn:disabled{opacity:.55}
.lux-tab{border:1px solid #c9a75a;color:#7a5d22;background:#fffaf0}
.lux-tab[aria-pressed="true"]{background:linear-gradient(180deg,#1a1613,#0b0908);color:#f3dc9a;border-color:#b98f3a}
.lux-note{color:rgba(243,230,200,.78)}
`;

export const TAROT_CARD_CSS = `${TAROT_LUX_CSS}
.tc{perspective:800px;aspect-ratio:2/3;width:100%;padding:0;background:none;border:0}
.tc-in{position:relative;width:100%;height:100%;transition:transform .6s cubic-bezier(.2,.7,.2,1);transform-style:preserve-3d}
.tc.flipped .tc-in{transform:rotateY(180deg)}
.tc-face{position:absolute;inset:0;backface-visibility:hidden;-webkit-backface-visibility:hidden;border-radius:9%/6%;overflow:hidden;
  background:radial-gradient(circle at 50% 35%,#2b2622 0%,#0d0b0a 72%);
  box-shadow:0 6px 14px rgba(0,0,0,.3),inset 0 0 0 1.5px #c9a04a,inset 0 0 0 4px #0b0908,inset 0 0 0 5px rgba(200,204,210,.55);color:#f3dc9a}
.tc-front{transform:rotateY(180deg)}
.tc-back{background-image:repeating-linear-gradient(45deg,rgba(201,160,74,.06) 0 1px,transparent 1px 10px),repeating-linear-gradient(-45deg,rgba(201,160,74,.06) 0 1px,transparent 1px 10px),radial-gradient(circle at 50% 42%,#2b2622 0%,#0b0908 75%)}
.tc-ring{position:absolute;left:50%;top:44%;width:66%;aspect-ratio:1;transform:translate(-50%,-50%);border-radius:50%;border:1px solid #c9a04a;box-shadow:0 0 0 3px rgba(11,9,8,.9),0 0 0 4px rgba(200,204,210,.45)}
.tc-pearl{position:absolute;left:50%;top:44%;width:80%;aspect-ratio:1;transform:translate(-50%,-50%);border-radius:50%;background:repeating-conic-gradient(from 7deg,#eef8fc 0 4deg,transparent 4deg 30deg);-webkit-mask:radial-gradient(circle,transparent 0 46%,#000 46.5% 49.5%,transparent 50%);mask:radial-gradient(circle,transparent 0 46%,#000 46.5% 49.5%,transparent 50%);opacity:.85}
.tc-emb{position:absolute;left:50%;top:44%;width:52%;transform:translate(-50%,-50%)}
.tc-logo{position:absolute;left:50%;top:44%;transform:translate(-50%,-50%);font-family:var(--font-serif);font-weight:700;font-size:var(--tc-fs,16px);writing-mode:vertical-rl;letter-spacing:.1em}
.tc-motto{position:absolute;left:0;right:0;bottom:11%;text-align:center;font-family:var(--font-serif);font-size:calc(var(--tc-fs,16px) * .5);letter-spacing:.35em;padding-left:.35em}
.tc-num{position:absolute;left:0;right:0;top:6%;text-align:center;font-family:var(--font-serif);color:#cfd3d9;font-size:calc(var(--tc-fs,16px) * .55);letter-spacing:.25em}
.tc-circle{position:absolute;left:50%;top:38%;width:62%;aspect-ratio:1;transform:translate(-50%,-50%);border-radius:50%;border:1px solid rgba(200,204,210,.55)}
.tc-han{position:absolute;left:0;right:0;top:38%;transform:translateY(-50%);text-align:center;font-family:var(--font-serif);font-weight:700;font-size:calc(var(--tc-fs,16px) * 2.6);line-height:1;filter:drop-shadow(0 0 10px rgba(241,212,138,.35))}
.tc-name{position:absolute;left:0;right:0;bottom:15%;text-align:center;font-family:var(--font-serif);font-weight:700;font-size:calc(var(--tc-fs,16px) * .8);white-space:nowrap}
.tc-el{position:absolute;left:0;right:0;bottom:7%;text-align:center;color:#cfd3d9;font-size:calc(var(--tc-fs,16px) * .5);letter-spacing:.2em;white-space:nowrap;overflow:hidden}
.tc-img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.tc-img-cap{position:absolute;left:0;right:0;bottom:0;padding:18% 0 6%;text-align:center;background:linear-gradient(to top,rgba(8,7,6,.92),transparent);font-family:var(--font-serif);font-weight:700;font-size:calc(var(--tc-fs,16px) * .8)}
.tc.picked .tc-face{box-shadow:0 0 0 2px #f3dc9a,0 0 22px rgba(243,220,154,.75),inset 0 0 0 1.5px #c9a04a}
.tc.dim{opacity:.6}
@media (prefers-reduced-motion:reduce){.tc-in{transition:none}}
`;

const ELEMENT_HANJA: Record<string, string> = { 목: "木", 화: "火", 토: "土", 금: "金", 수: "水" };

export function TarotCardFront({ no }: { no: number }) {
  const c = TAROT_CARDS[no];
  if (TAROT_IMAGES.includes(no)) {
    return (
      <>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="tc-img" src={`/tarot/${String(no).padStart(2, "0")}.png`} alt={`${c.name} 카드`} loading="lazy" />
        <div className="tc-num" style={{ textShadow: "0 1px 4px rgba(0,0,0,.8)" }}>{c.roman}</div>
        <div className="tc-img-cap">
          <span className="gold-t">{c.name}</span>
        </div>
      </>
    );
  }
  return (
    <>
      <div className="tc-num">{c.roman}</div>
      <div className="tc-circle" />
      <div className="tc-han gold-t">{c.hanja}</div>
      {/* 긴 이름(운명의 수레바퀴 등)은 한 줄에 들어가게 줄인다 */}
      <div className="tc-name gold-t" style={{ fontSize: `calc(var(--tc-fs, 16px) * ${Math.min(0.8, 3.6 / c.name.length).toFixed(2)})` }}>
        {c.name}
      </div>
      <div className="tc-el">{`${ELEMENT_HANJA[c.element]} · ${c.keywords[0]}`}</div>
    </>
  );
}

export function TarotCardBack() {
  const emblem = TENANT.gate?.emblem;
  const motto = TENANT.gate?.tarotMotto;
  return (
    <>
      <div className="tc-pearl" />
      <div className="tc-ring" />
      {emblem ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="tc-emb" src={emblem} alt="" aria-hidden />
      ) : (
        <div className="tc-logo gold-t">{TENANT.brand.logoText}</div>
      )}
      {motto && <div className="tc-motto gold-t">{motto}</div>}
    </>
  );
}

/** 뒤집히는 카드 한 장. size: 글자 크기 기준(px) - 카드 폭에 맞춰 부모가 준다 */
export function TarotCard({
  no,
  flipped,
  picked,
  dim,
  size = 16,
  label,
  onClick,
  delayMs = 0,
  shuffleVars,
}: {
  /** 이 자리의 카드 (뒷면일 때도 정해져 있다 - 섞을 때 정해짐) */
  no: number;
  flipped: boolean;
  picked?: boolean;
  dim?: boolean;
  size?: number;
  label?: string;
  onClick?: () => void;
  delayMs?: number;
  /** 섞기 움직임 (px·deg) */
  shuffleVars?: { dx: number; dy: number; r: number };
}) {
  const cls = `tc${flipped ? " flipped" : ""}${picked ? " picked" : ""}${dim ? " dim" : ""}`;
  const inner = (
    <div className="tc-in" style={{ transitionDelay: `${delayMs}ms` }}>
      <div className="tc-face tc-back">
        <TarotCardBack />
      </div>
      <div className="tc-face tc-front" aria-hidden={!flipped}>
        {flipped && <TarotCardFront no={no} />}
      </div>
    </div>
  );
  const style = {
    ["--tc-fs" as string]: `${size}px`,
    ...(shuffleVars ? { ["--dx" as string]: `${shuffleVars.dx}px`, ["--dy" as string]: `${shuffleVars.dy}px`, ["--r" as string]: `${shuffleVars.r}deg` } : {}),
  } as React.CSSProperties;
  return onClick ? (
    <button type="button" className={cls} style={style} onClick={onClick} aria-label={label}>
      {inner}
    </button>
  ) : (
    <div className={cls} style={style} aria-label={label}>
      {inner}
    </div>
  );
}
