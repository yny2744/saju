import { TENANT } from "@/tenants";
import { TAROT_CARDS, TAROT_IMAGES } from "@/lib/fun/tarot";

/**
 * 타로 카드 한 장 (2026-10-31) - 앞면은 그림이 있으면 그림(public/tarot/NN.png), 없으면 한자 카드.
 * 뒷면은 고객사 엠블럼(대문 엠블럼) + 문구, 엠블럼이 없는 고객사는 로고 글자. 22장 뒷면은 모두 같다 (어느 카드인지 모르게).
 * 뒤집기는 부모가 flipped 로 정한다 (CSS 3D, prefers-reduced-motion 이면 바로 바뀜).
 */

export const TAROT_CARD_CSS = `
.tc{perspective:800px;aspect-ratio:2/3;width:100%}
.tc-in{position:relative;width:100%;height:100%;transition:transform .6s cubic-bezier(.2,.7,.2,1);transform-style:preserve-3d}
.tc.flipped .tc-in{transform:rotateY(180deg)}
.tc-face{position:absolute;inset:0;backface-visibility:hidden;-webkit-backface-visibility:hidden;border-radius:9%/6%;overflow:hidden;
  background:radial-gradient(circle at 50% 38%,#24406e 0%,#13254a 60%,#0b1834 100%);
  box-shadow:0 6px 14px rgba(0,0,0,.28),inset 0 0 0 1.5px #c9a75a,inset 0 0 0 4px #13254a,inset 0 0 0 5px rgba(201,167,90,.55);color:#f3e2b6}
.tc-front{transform:rotateY(180deg)}
.tc-back{background-image:repeating-linear-gradient(0deg,rgba(201,167,90,.07) 0 1px,transparent 1px 12px),repeating-linear-gradient(90deg,rgba(201,167,90,.07) 0 1px,transparent 1px 12px),radial-gradient(circle at 50% 42%,#24406e 0%,#13254a 60%,#0b1834 100%)}
.tc-ring{position:absolute;left:50%;top:44%;width:66%;aspect-ratio:1;transform:translate(-50%,-50%);border-radius:50%;border:1px solid rgba(201,167,90,.8);box-shadow:0 0 0 3px rgba(19,37,74,.9),0 0 0 4px rgba(201,167,90,.35)}
.tc-emb{position:absolute;left:50%;top:44%;width:52%;transform:translate(-50%,-50%)}
.tc-logo{position:absolute;left:50%;top:44%;transform:translate(-50%,-50%);font-family:var(--font-serif);font-weight:700;color:#f1d48a;font-size:var(--tc-fs,16px);writing-mode:vertical-rl;letter-spacing:.1em}
.tc-motto{position:absolute;left:0;right:0;bottom:12%;text-align:center;font-family:var(--font-serif);color:#d9bd7a;font-size:calc(var(--tc-fs,16px) * .5);letter-spacing:.35em;padding-left:.35em}
.tc-num{position:absolute;left:0;right:0;top:6%;text-align:center;font-family:var(--font-serif);color:#d9bd7a;font-size:calc(var(--tc-fs,16px) * .55);letter-spacing:.25em}
.tc-han{position:absolute;left:0;right:0;top:22%;text-align:center;font-family:var(--font-serif);font-weight:700;color:#f1d48a;font-size:calc(var(--tc-fs,16px) * 2.6);line-height:1;text-shadow:0 0 14px rgba(241,212,138,.4)}
.tc-name{position:absolute;left:0;right:0;bottom:15%;text-align:center;font-family:var(--font-serif);font-weight:700;font-size:calc(var(--tc-fs,16px) * .8);white-space:nowrap}
.tc-el{position:absolute;left:0;right:0;bottom:7%;text-align:center;color:#d9bd7a;font-size:calc(var(--tc-fs,16px) * .5);letter-spacing:.2em;white-space:nowrap;overflow:hidden}
.tc-img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.tc-img-cap{position:absolute;left:0;right:0;bottom:0;padding:18% 0 6%;text-align:center;background:linear-gradient(to top,rgba(8,16,36,.9),transparent);font-family:var(--font-serif);font-weight:700;font-size:calc(var(--tc-fs,16px) * .8)}
.tc.picked .tc-face{box-shadow:0 0 0 2px #f1d48a,0 0 22px rgba(241,212,138,.75),inset 0 0 0 1.5px #c9a75a}
.tc.dim{opacity:.62}
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
        <div className="tc-img-cap">{c.name}</div>
      </>
    );
  }
  return (
    <>
      <div className="tc-num">{c.roman}</div>
      <div className="tc-han">{c.hanja}</div>
      {/* 긴 이름(운명의 수레바퀴 등)은 한 줄에 들어가게 줄인다 */}
      <div className="tc-name" style={{ fontSize: `calc(var(--tc-fs, 16px) * ${Math.min(0.8, 3.6 / c.name.length).toFixed(2)})` }}>
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
      <div className="tc-ring" />
      {emblem ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="tc-emb" src={emblem} alt="" aria-hidden />
      ) : (
        <div className="tc-logo">{TENANT.brand.logoText}</div>
      )}
      {motto && <div className="tc-motto">{motto}</div>}
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
