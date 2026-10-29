/**
 * 세 길·일곱 운 대문의 그림 그리기와 움직임 (2026-10-28 mgml 1번 작업).
 *
 * 흐름(流) → 맺힘(結):
 *   처음 4초 - 엠블럼·제목이 나타나고, 세 길이 그려지며 일곱 운이 차례로 켜지고, 채움(結)이 맺힌다 (CSS).
 *   그다음   - 빛 구슬 세 개가 길을 따라 7초마다 흐른다. 구슬이 출발할 때 엠블럼이, 지나갈 때 그 운이,
 *              도착할 때 채움이 숨 쉬듯 살짝 커졌다 작아진다 (requestAnimationFrame).
 * 좌표는 영상 비율 기준: 가로 화면 1600×900, 세로 화면 900×1600 (preserveAspectRatio slice = 영상 object-fit cover).
 */
import type { TenantGate } from "@/tenants/types";

export type StageKey = "ls" | "pt";

const NS = "http://www.w3.org/2000/svg";
const WAYS = ["know", "heart", "ahead"] as const;
type WayKey = (typeof WAYS)[number];

interface StageCfg {
  r: number; // 운 동그라미 반지름
  gs: number; // 한자 크기
  ls: number; // 이름 글자 크기
  fr: number; // 채움 동그라미 반지름
  wn: number; // 길 이름 글자 크기
  flab: number;
  fsub: number;
  spark: number;
  start: number; // 길 시작 y
  /** 길 모양 (세로 화면은 좌우 대칭 곡선, 가로 화면은 타원형) */
  d: Record<WayKey, string>;
  /** 운 자리: 세로 화면은 y 좌표, 가로 화면은 길 위 비율 */
  at: Record<WayKey, number[]>;
  atMode: "y" | "t";
  /** 길 이름표 자리 [y 또는 비율, dx, dy] */
  wn_at: Partial<Record<WayKey, [number, number, number]>>;
  clamp: [number, number] | null;
}

export const STAGES: Record<StageKey, StageCfg> = {
  ls: {
    r: 31, gs: 28, ls: 21, fr: 48, wn: 18, flab: 24, fsub: 20, spark: 7, start: 330,
    d: {
      know: "M800,330 C480,350 270,440 300,560 C330,670 600,725 800,742",
      heart: "M800,330 L800,742",
      ahead: "M800,330 C1120,350 1330,440 1300,560 C1270,670 1000,725 800,742",
    },
    at: { know: [0.2, 0.48, 0.76], heart: [0.34, 0.66], ahead: [0.3, 0.66] },
    atMode: "t",
    wn_at: { know: [0.36, -150, -6], heart: [0.13, 0, 0], ahead: [0.36, 150, -6] },
    clamp: null,
  },
  pt: {
    r: 42, gs: 40, ls: 31.5, fr: 58, wn: 21, flab: 30, fsub: 31.5, spark: 11, start: 486,
    d: {
      know: "M450,486 C300,505 205,700 205,943 C205,1146 300,1326 450,1340",
      heart: "M450,486 L450,1340",
      ahead: "M450,486 C600,505 695,700 695,943 C695,1146 600,1326 450,1340",
    },
    at: { know: [744, 943, 1141], heart: [811, 1075], ahead: [811, 1075] },
    atMode: "y",
    wn_at: { know: [590, 0, 0], heart: [640, 0, 0], ahead: [590, 0, 0] },
    clamp: [96, 804],
  },
};

/** 처음 그려지는 시간 (CSS와 맞춘다) */
export const DRAW_START = 1.3;
export const DRAW_DUR = 2.4;
/** 빛 구슬: 출발 시각(초) · 한 바퀴(밀리초) · 길마다 시차(밀리초) */
const FLOW_START = 4400;
const FLOW_DUR = 7000;
const FLOW_GAP = 1600;
/** 커졌다 작아지는 정도와 길이 */
const PULSE_SCALE = 0.22;
const PULSE_HALF = 380;

function el<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number>, parent?: Element | null): SVGElementTagNameMap[K] {
  const e = document.createElementNS(NS, tag) as SVGElementTagNameMap[K];
  for (const k in attrs) e.setAttribute(k, String(attrs[k]));
  if (parent) parent.appendChild(e);
  return e;
}

/** 길 위에서 y 좌표에 해당하는 길이 (길은 위에서 아래로만 내려간다) */
function lengthAtY(p: SVGPathElement, y: number): number {
  let lo = 0;
  let hi = p.getTotalLength();
  for (let i = 0; i < 30; i++) {
    const m = (lo + hi) / 2;
    if (p.getPointAtLength(m).y < y) lo = m;
    else hi = m;
  }
  return lo;
}

function pillText(parent: Element, cls: string, x: number, y: number, size: number, txt: string, padX: number, padY: number, pillCls: string, clamp: [number, number] | null) {
  const t = el("text", { class: cls, x, y, "font-size": size }, parent);
  t.textContent = txt;
  let bb = t.getBBox();
  if (clamp) {
    const lo = clamp[0] + padX;
    const hi = clamp[1] - padX;
    let sh = 0;
    if (bb.x < lo) sh = lo - bb.x;
    else if (bb.x + bb.width > hi) sh = hi - (bb.x + bb.width);
    if (sh) {
      t.setAttribute("x", String(x + sh));
      bb = t.getBBox();
    }
  }
  const r = el("rect", { class: pillCls, x: bb.x - padX, y: bb.y - padY, width: bb.width + padX * 2, height: bb.height + padY * 2, rx: (bb.height + padY * 2) / 2 });
  parent.insertBefore(r, t);
}

interface Pulser {
  g: SVGGElement;
  cx: number;
  cy: number;
}

interface Built {
  svg: SVGSVGElement;
  paths: Record<WayKey, SVGPathElement>;
  lengths: Record<WayKey, number>;
  nodes: Array<Pulser & { way: WayKey; frac: number; amp?: number }>;
  emblem: Pulser;
  fruit: Pulser;
  sparks: Record<WayKey, SVGCircleElement>;
}

/** 한 화면(가로/세로)의 길·운·채움을 그린다 - 글자 바탕 크기를 재야 해서 글꼴이 준비된 뒤 부른다 */
export function buildStage(svg: SVGSVGElement, key: StageKey, gate: TenantGate, emblemCenter: [number, number]): Built {
  const c = STAGES[key];
  const g = svg.querySelector<SVGGElement>(".gh-nodes")!;
  g.textContent = "";
  // 숨겨진 화면도 글자 크기를 잴 수 있게 잠깐 보이게 한다
  const hidden = getComputedStyle(svg).display === "none";
  if (hidden) {
    svg.style.display = "block";
    svg.style.visibility = "hidden";
  }

  const paths = {} as Record<WayKey, SVGPathElement>;
  const lengths = {} as Record<WayKey, number>;
  for (const w of WAYS) {
    const p = svg.querySelector<SVGPathElement>(`.gh-way-${w}`)!;
    p.setAttribute("d", c.d[w]);
    paths[w] = p;
    lengths[w] = p.getTotalLength();
  }

  // 빛 구슬 (운 동그라미 아래로 지나가게 맨 먼저)
  const sparks = {} as Record<WayKey, SVGCircleElement>;
  for (const w of WAYS) sparks[w] = el("circle", { class: "gh-spark", r: c.spark, cx: -99, cy: -99 }, g);

  const nodes: Built["nodes"] = [];
  gate.ways.forEach((way, wi) => {
    const w = WAYS[wi];
    if (!w) return;
    const p = paths[w];
    const L = lengths[w];
    way.uns.forEach((un, i) => {
      const v = c.at[w][i];
      if (v === undefined) return;
      const len = c.atMode === "y" ? lengthAtY(p, v) : L * v;
      const pt = p.getPointAtLength(len);
      const frac = len / L;
      const a = el("a", { href: `#un-${un.key}`, class: "gh-node", "aria-label": `${un.name} 보기` }, g);
      (a as unknown as HTMLElement).style.animationDelay = `${DRAW_START + DRAW_DUR * frac * 0.9}s`;
      const inner = el("g", {}, a);
      el("circle", { class: "gh-hit", cx: pt.x, cy: pt.y, r: c.r * 1.7 }, inner);
      el("circle", { class: "gh-ring", cx: pt.x, cy: pt.y, r: c.r }, inner);
      const gl = el("text", { class: "gh-glyph", x: pt.x, y: pt.y + 1, "font-size": c.gs }, inner);
      gl.textContent = un.glyph;
      const lb = el("text", { class: "gh-lbl", x: pt.x, y: pt.y + c.r + c.ls * 0.95, "font-size": c.ls, "stroke-width": c.ls * 0.28 }, inner);
      lb.textContent = un.short;
      nodes.push({ g: inner, cx: pt.x, cy: pt.y, way: w, frac });
    });
    // 길 이름표 (누르면 그 길로)
    const at = c.wn_at[w];
    if (at) {
      const len = c.atMode === "y" ? lengthAtY(p, at[0]) : L * at[0];
      const pt = p.getPointAtLength(len);
      const tag = el("a", { href: `#way-${way.key}`, class: "gh-way-tag", "aria-label": `${way.name} 보기` }, g);
      // 2026-10-28 2번: 빛 구슬이 지날 때 길 이름표도 커졌다 작아진다
      const inner = el("g", {}, tag);
      pillText(inner, "gh-way-name", pt.x + at[1], pt.y + at[2], c.wn, way.name, c.wn * 0.7, c.wn * 0.32, "gh-way-pill", c.clamp);
      const bb = inner.getBBox();
      nodes.push({ g: inner, cx: bb.x + bb.width / 2, cy: bb.y + bb.height / 2, way: w, frac: len / L, amp: 0.6 });
    }
  });

  // 채움 - 세 길이 맺히는 자리
  const end = paths.heart.getPointAtLength(lengths.heart);
  const f = el("a", { href: "#fill", class: "gh-node gh-fruit", "aria-label": `${gate.fruit.title} 보기` }, g);
  (f as unknown as HTMLElement).style.animationDelay = `${DRAW_START + DRAW_DUR + 0.1}s`;
  const fi = el("g", {}, f);
  el("circle", { class: "gh-halo", cx: end.x, cy: end.y, r: c.fr * 2.1, fill: `url(#gh-sun-${key})` }, fi);
  el("circle", { class: "gh-hit", cx: end.x, cy: end.y, r: c.fr * 1.5 }, fi);
  el("circle", { class: "gh-ring", cx: end.x, cy: end.y, r: c.fr }, fi);
  const fg = el("text", { class: "gh-glyph", x: end.x, y: end.y + 1, "font-size": c.fr * 0.85 }, fi);
  fg.textContent = gate.fruit.glyph;
  const ly = end.y + c.fr + c.flab * 0.95;
  const fl = el("text", { class: "gh-lbl gh-fruit-lbl", x: end.x, y: ly, "font-size": c.flab, "stroke-width": c.flab * 0.28 }, fi);
  fl.textContent = gate.fruit.title;
  const fs = el("text", { class: "gh-sub", x: end.x, y: ly + c.flab * 0.6 + c.fsub * 0.75, "font-size": c.fsub, "stroke-width": c.fsub * 0.3 }, fi);
  fs.textContent = gate.fruit.sub;

  if (hidden) {
    svg.style.display = "";
    svg.style.visibility = "";
  }
  const emblemG = svg.querySelector<SVGGElement>(".gh-emblem-pulse")!;
  return {
    svg,
    paths,
    lengths,
    nodes,
    emblem: { g: emblemG, cx: emblemCenter[0], cy: emblemCenter[1] },
    fruit: { g: fi, cx: end.x, cy: end.y },
    sparks,
  };
}

function bump(ms: number): number {
  const d = Math.abs(ms);
  if (d >= PULSE_HALF) return 0;
  const k = Math.cos((d / PULSE_HALF) * (Math.PI / 2));
  return k * k;
}

function scaleAt(p: Pulser, s: number) {
  if (s <= 1.0005) p.g.removeAttribute("transform");
  else p.g.setAttribute("transform", `translate(${p.cx} ${p.cy}) scale(${s.toFixed(4)}) translate(${-p.cx} ${-p.cy})`);
}

/** 빛 구슬 흐름 + 지나갈 때 커졌다 작아지기. 돌려주는 함수를 부르면 멈춘다. */
export function startFlow(stages: Built[], isVisible: () => boolean): () => void {
  const t0 = performance.now();
  let raf = 0;
  const frame = (now: number) => {
    raf = requestAnimationFrame(frame);
    if (!isVisible()) return;
    const t = now - t0 - FLOW_START;
    for (const b of stages) {
      if (b.svg.getBoundingClientRect().width === 0) continue; // 지금 안 보이는 화면
      let emblemS = 0;
      let fruitS = 0;
      const nodeS = new Map<SVGGElement, number>();
      WAYS.forEach((w, i) => {
        const tt = t - i * FLOW_GAP;
        const sp = b.sparks[w];
        if (tt < 0) {
          sp.setAttribute("cx", "-99");
          return;
        }
        const phaseMs = tt % FLOW_DUR;
        const phase = phaseMs / FLOW_DUR;
        const pt = b.paths[w].getPointAtLength(phase * b.lengths[w]);
        sp.setAttribute("cx", pt.x.toFixed(1));
        sp.setAttribute("cy", pt.y.toFixed(1));
        sp.style.opacity = "1";
        emblemS = Math.max(emblemS, bump(phaseMs));
        fruitS = Math.max(fruitS, bump(FLOW_DUR - phaseMs));
        for (const n of b.nodes) if (n.way === w) nodeS.set(n.g, Math.max(nodeS.get(n.g) ?? 0, bump((phase - n.frac) * FLOW_DUR)));
      });
      scaleAt(b.emblem, 1 + PULSE_SCALE * 0.6 * emblemS);
      scaleAt(b.fruit, 1 + PULSE_SCALE * fruitS);
      for (const n of b.nodes) scaleAt(n, 1 + PULSE_SCALE * (n.amp ?? 1) * (nodeS.get(n.g) ?? 0));
    }
  };
  raf = requestAnimationFrame(frame);
  return () => cancelAnimationFrame(raf);
}
