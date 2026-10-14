import fs from "fs";
import PDFDocument from "pdfkit";
import type { SajuJson } from "saju-engine";
import { sajuFacts } from "@/lib/sajuFacts";
import { ELEMENT_HANJA } from "@/lib/manseView";
import { FILL, LACK_CORE } from "@/lib/basic/common";
import type { ElementKo } from "@/lib/pillarView";
import type { NamingReport } from "@/server/naming/naming";
import type { ReadingHeader } from "@/server/readings/readings";
import {
  BOTTOM,
  EL_HEX,
  FAINT,
  FONT_FILE,
  GOLD,
  GOLD_LIGHT,
  H,
  INK,
  M,
  NAVY,
  RED,
  SOFT,
  TW,
  W,
  bold,
  chartPage,
  endPage,
  goldRule,
  noteBox,
  pageTitle,
  para,
  subhead,
  type Ctx,
} from "./buildPdf";

/**
 * 작명서·개명 추천서 PDF (2026-10-12 수정안 46). 사주 책자와 같은 A5 판형·글꼴.
 *   표지 → 사주 요약(원국·오행·대운) → 아쉬운 기운과 이름에 담는 법 → (개명: 지금 이름 진단) → 후보마다 한 쪽 → 맺음(QR)
 */

const KIND_TITLE = { naming: "신생아 작명서", rename: "개명 추천서" } as const;

function cover(doc: PDFKit.PDFDocument, title: string, who: string, header: ReadingHeader, issuedAt: Date) {
  doc.rect(0, 0, W, H).fill(NAVY);
  doc.save().strokeColor(GOLD).lineWidth(1.4).rect(18, 18, W - 36, H - 36).stroke();
  doc.lineWidth(0.5).rect(24, 24, W - 48, H - 48).stroke().restore();
  doc.fillColor(GOLD_LIGHT).fontSize(11).text("류 결 사 주", 0, 100, { width: W, align: "center", characterSpacing: 6 });
  doc.save().strokeColor(GOLD).lineWidth(0.7).moveTo(W / 2 - 44, 126).lineTo(W / 2 + 44, 126).stroke().restore();
  doc.fontSize(28);
  bold(doc, title, 0, 200, { width: W, align: "center" }, "#f6ecd2");
  doc.fillColor(GOLD_LIGHT).fontSize(13).text(who, 0, 248, { width: W, align: "center" });
  doc.fillColor("#c9cfda").fontSize(9.5).text(header.birth, 0, 276, { width: W, align: "center" });
  const pillars = header.pillars.filter((p) => p.ganzhi).map((p) => `${p.label} ${p.ganzhi}`).join("  ·  ");
  doc.fillColor("#c9cfda").fontSize(9.5).text(pillars, 0, 292, { width: W, align: "center" });
  doc.fillColor(GOLD_LIGHT).fontSize(11).text("이름은 평생 불리는 기운입니다", 0, H - 140, { width: W, align: "center" });
  const kst = new Date(issuedAt.getTime() + 9 * 3600 * 1000);
  doc.fillColor("#8f9bb3").fontSize(8).text(`${kst.getUTCFullYear()}년 ${kst.getUTCMonth() + 1}월 ${kst.getUTCDate()}일 펴냄 · 류결사주`, 0, H - 80, { width: W, align: "center" });
}

function needPage(doc: PDFKit.PDFDocument, r: NamingReport) {
  doc.addPage();
  const need = r.needed[0];
  pageTitle(doc, `이름에 담을 기운 — ${need}(${ELEMENT_HANJA[need]})`);
  para(doc, `이 사주는 다섯 기운 가운데 ${r.needed.map((e) => `${e}(${ELEMENT_HANJA[e]})`).join("·")}의 기운이 ${r.neededReason === "lacking" ? "비어 있어요" : "가장 약해요"}. 참 좋은 바탕에 딱 하나 아쉬운 것이에요.`);
  para(doc, LACK_CORE[need]);
  para(doc, "이름은 평생 가장 많이 불리는 소리예요. 그래서 예부터 아쉬운 기운을 이름 글자에 담아 채워 왔어요. 후보는 모두 아래 기준으로 골랐어요.");
  subhead(doc, "이름을 고른 기준");
  para(doc, `◆ 자원오행 — 한자가 품은 기운(부수)이 아쉬운 ${r.needed.join("·")}의 기운을 채워 줄 것`, { indent: 6, size: 10.5 });
  para(doc, `◆ 수리 — 성과 이름 획수로 보는 원격·형격·이격·정격 네 격이 모두 길한 수일 것${r.dollim ? " (돌림자 때문에 어려우면 셋 이상)" : ""}`, { indent: 6 , size: 10.5 });
  para(doc, "◆ 소리 — 성에서 이름으로 이어지는 소리의 기운이 서로 부딪히지 않을 것", { indent: 6 , size: 10.5 });
  para(doc, "◆ 음양 — 글자 획수의 홀짝이 한쪽으로 치우치지 않을 것", { indent: 6 , size: 10.5 });
  para(doc, "◆ 뜻 — 이름에 흔히 쓰는 한자 가운데 뜻이 밝고 바른 글자일 것", { indent: 6 , size: 10.5 });
  if (r.dollim) para(doc, `◆ 돌림자 — 이름 ${r.dollim.position === 1 ? "첫" : "끝"} 글자에 ${r.dollim.hangul}(${r.dollim.hanja})`, { indent: 6 , size: 10.5 });
  const F = FILL[need];
  para(doc, `이름 밖에서도 채울 수 있어요 — 색 ${F.colors} · 방위 ${F.direction} · 숫자 ${F.numbers} · 곁에 둘 것 ${F.object}`, { size: 10, color: GOLD });
}

function currentPage(doc: PDFKit.PDFDocument, r: NamingReport) {
  const c = r.current;
  if (!c) return;
  doc.addPage();
  pageTitle(doc, `지금 이름 — ${c.name}${c.hanja ? ` ${c.hanja}` : ""}`);
  const rd = c.reading;
  if (!rd) {
    para(doc, "지금 이름은 글자 수가 맞지 않아 풀어 보지 못했어요.");
    return;
  }
  if (!rd.complete) para(doc, "지금 이름의 한자를 모두 알지 못해 수리는 볼 수 없었어요. 소리와 사주의 어울림만 살폈어요.");
  for (const s of rd.suri) para(doc, `${s.name}(${s.meaning}) ${s.value}수 — ${s.lucky ? "길한 수" : "아쉬운 수"}`, { color: s.lucky ? INK : RED, indent: 6 });
  if (rd.yinYangBalanced !== null) para(doc, `음양 — ${rd.yinYangBalanced ? "고루 갖췄어요" : "한쪽으로 치우쳤어요"}`, { indent: 6 });
  para(doc, `소리 흐름 — ${rd.sound.clashes === 0 ? "부딪힘 없이 이어져요" : `부딪히는 곳이 ${rd.sound.clashes}군데 있어요`}`, { indent: 6 });
  para(doc, `사주 보완 — ${rd.supports.length ? `${rd.supports.join("·")}의 기운을 채워 줘요` : `아쉬운 ${r.needed.join("·")}의 기운을 채우는 글자가 없어요`}`, { indent: 6 });
  noteBox(doc, "이름을 바꾸는 것은 큰 결정이에요. 법적으로 바꾸지 않더라도 집과 가까운 사람 사이에서 부르는 이름이나 호(號)로 먼저 써 보며 마음에 맞는지 살펴보셔도 좋아요.");
}

function candidatePage(doc: PDFKit.PDFDocument, r: NamingReport, i: number) {
  const c = r.candidates[i];
  doc.addPage();
  doc.fillColor(GOLD).fontSize(10.5).text(`후보 ${["一", "二", "三", "四", "五", "六", "七", "八", "九", "十"][i] ?? i + 1}`, M, M, { width: TW });
  const top = M + 22;
  // 성 + 이름 한자 칸
  const all = [...[...r.surnameHanja].map((h, k) => ({ hanja: h, hangul: [...r.surname][k], el: "" as ElementKo | "" })), ...c.chars.map((x) => ({ hanja: x.hanja, hangul: x.hangul, el: x.element }))];
  const box = 56;
  const gap = 8;
  const x0 = (W - (all.length * box + (all.length - 1) * gap)) / 2;
  all.forEach((x, k) => {
    const isSurname = k < [...r.surname].length;
    const fill = isSurname ? "#8f8a7d" : x.el ? EL_HEX[x.el as ElementKo] : "#6e7075";
    doc.save().roundedRect(x0 + k * (box + gap), top, box, box, 6).fill(fill).restore();
    doc.fillColor("#ffffff").fontSize(32).text(x.hanja, x0 + k * (box + gap), top + 8, { width: box, align: "center" });
    doc.fillColor(SOFT).fontSize(10).text(x.hangul, x0 + k * (box + gap), top + box + 4, { width: box, align: "center" });
  });
  doc.y = top + box + 26;
  doc.fontSize(16);
  bold(doc, `${r.surname}${c.hangul}  ${r.surnameHanja}${c.hanja}`, 0, doc.y, { width: W, align: "center" }, NAVY);
  goldRule(doc, doc.y + 6, W / 2 - 60, W / 2 + 60);
  doc.y += 20;
  doc.x = M;
  subhead(doc, "글자의 뜻");
  for (const x of c.chars) {
    const fills = x.element && r.needed.includes(x.element as ElementKo);
    para(doc, `${x.hanja}  ${x.meaning} ${x.hangul} · ${x.strokes}획 · 자원오행 ${x.element || "—"}${fills ? " · 아쉬운 기운을 채움" : ""}`, { indent: 6, color: fills ? RED : INK });
  }
  subhead(doc, "이름 이야기");
  para(doc, c.story);
  subhead(doc, "수리 네 격");
  const colW = TW / 4;
  const y = doc.y;
  c.suri.forEach((s, k) => {
    const x = M + k * colW;
    doc.save().roundedRect(x + 2, y, colW - 4, 46, 4).fill(s.lucky ? "#f0e6cf" : "#eeece6").restore();
    doc.fillColor(SOFT).fontSize(8.5).text(s.name, x, y + 6, { width: colW, align: "center" });
    doc.fillColor(INK).fontSize(14).text(`${s.value}`, x, y + 19, { width: colW, align: "center" });
  });
  doc.y = y + 54;
  doc.x = M;
  para(doc, `음양 ${c.yinYangBalanced ? "고루 갖춤" : "단정함"} · 소리 흐름 ${c.soundFlow.every((f) => f !== "극" && f !== "눌림") ? "부딪힘 없음" : "한 곳 부딪힘"}`, { size: 10, color: SOFT });
}

export async function buildNamePdf(input: { report: NamingReport; nickname: string; header: ReadingHeader; saju: SajuJson; siteUrl?: string; issuedAt?: Date }): Promise<Buffer> {
  const r = input.report;
  const doc = new PDFDocument({ size: "A5", margins: { top: M, left: M, right: M, bottom: BOTTOM }, bufferPages: true, info: { Title: `${KIND_TITLE[r.kind]} - 류결사주`, Author: "류결사주" } });
  doc.registerFont("serif", fs.readFileSync(FONT_FILE));
  doc.font("serif");
  const chunks: Buffer[] = [];
  doc.on("data", (c: Buffer) => chunks.push(c));
  const done = new Promise<Buffer>((res, rej) => {
    doc.on("end", () => res(Buffer.concat(chunks)));
    doc.on("error", rej);
  });
  const ctx: Ctx = {
    doc,
    input: { nickname: input.nickname, header: input.header, saju: input.saju, readings: [], siteUrl: input.siteUrl },
    f: sajuFacts(input.saju),
    name: (s) => s,
    navy: new Set(),
  };
  const who = r.kind === "naming" ? `${r.surname}씨 아기의 이름` : `${input.nickname}님의 새 이름`;
  cover(doc, KIND_TITLE[r.kind], who, input.header, input.issuedAt ?? new Date());
  chartPage(ctx, "이 하나를 이름 글자에 담아 채웠어요.");
  needPage(doc, r);
  currentPage(doc, r);
  r.candidates.forEach((_, i) => candidatePage(doc, r, i));
  await endPage(ctx);
  const range = doc.bufferedPageRange();
  for (let i = 1; i < range.count; i++) {
    doc.switchToPage(range.start + i);
    const bottom = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;
    doc.fillColor(FAINT).fontSize(7.5).text(`류결사주 · ${i}`, 0, H - 28, { width: W, align: "center", lineBreak: false });
    doc.page.margins.bottom = bottom;
  }
  doc.end();
  return done;
}
