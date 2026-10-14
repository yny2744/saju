import fs from "fs";
import PDFDocument from "pdfkit";
import type { SajuJson } from "saju-engine";
import { sajuFacts } from "@/lib/sajuFacts";
import { ELEMENT_HANJA } from "@/lib/manseView";
import { FILL } from "@/lib/basic/common";
import type { ElementKo } from "@/lib/pillarView";
import type { BusinessReport } from "@/server/naming/business";
import { BIZ_INFO } from "@/lib/businessName";
import type { ReadingHeader } from "@/server/readings/readings";
import { BOTTOM, EL_HEX, FAINT, FONT_FILE, GOLD, GOLD_LIGHT, H, INK, M, NAVY, SOFT, TW, W, bold, chartPage, endPage, goldRule, noteBox, pageTitle, para, subhead, type Ctx } from "./buildPdf";

/**
 * 상호 작명서 PDF (2026-10-13 수정안 63). 작명서와 같은 A5 판형·글꼴.
 *   표지 → 대표자 사주 요약 → 상호에 담는 기운(업종·사주) → 후보마다 한 쪽 → 상표 확인 안내 → 맺음(QR)
 */

const NUM = ["一", "二", "三", "四", "五", "六", "七", "八", "九", "十"];

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
  doc.fillColor(GOLD_LIGHT).fontSize(11).text("이름은 매일 듣는 첫인사입니다", 0, H - 140, { width: W, align: "center" });
  const kst = new Date(issuedAt.getTime() + 9 * 3600 * 1000);
  doc.fillColor("#8f9bb3").fontSize(8).text(`${kst.getUTCFullYear()}년 ${kst.getUTCMonth() + 1}월 ${kst.getUTCDate()}일 펴냄 · 류결사주`, 0, H - 80, { width: W, align: "center" });
}

function needPage(doc: PDFKit.PDFDocument, r: BusinessReport) {
  doc.addPage();
  const ind = r.industry;
  pageTitle(doc, `이름에 담을 기운 — ${ind.label} ${ind.element}(${ELEMENT_HANJA[ind.element]})`);
  para(doc, `${ind.label}은 예부터 ${ind.element}(${ELEMENT_HANJA[ind.element]})의 기운으로 보는 업종이에요. 이름의 소리가 이 기운을 낳아 주거나 같은 기운이면 일이 순하게 흘러간다고 봐요.`);
  para(doc, `대표님 사주는 ${r.needed.map((e) => `${e}(${ELEMENT_HANJA[e]})`).join("·")}의 기운이 ${r.neededReason === "lacking" ? "비어 있어요" : "가장 약해요"}. 날마다 불리는 이름에 이 기운을 담으면 대표님의 부족한 자리도 함께 채워져요.`);
  subhead(doc, "이름을 고른 기준");
  para(doc, `◆ 업종 오행 — 첫소리가 ${ind.element}의 기운을 낳거나 같을 것, 업종 기운을 누르는 소리가 많지 않을 것`, { indent: 6, size: 10.5 });
  para(doc, "◆ 소리 흐름 — 글자와 글자 사이 첫소리 기운이 부딪히지 않을 것", { indent: 6, size: 10.5 });
  para(doc, "◆ 총획 수리 — 한자 이름은 모든 글자 획수의 합이 길한 수일 것", { indent: 6, size: 10.5 });
  para(doc, `◆ 대표자 사주 — 소리와 글자가 아쉬운 ${r.needed.join("·")}의 기운을 채워 주면 더 좋음`, { indent: 6, size: 10.5 });
  para(doc, "◆ 부르기 — 2~4글자로 기억하기 쉽고, 뜻이 밝을 것", { indent: 6, size: 10.5 });
  const F = FILL[r.needed[0]];
  para(doc, `간판·가게에서도 채울 수 있어요 — 색 ${F.colors} · 방위 ${F.direction} · 숫자 ${F.numbers}`, { size: 10, color: GOLD });
}

function candidatePage(doc: PDFKit.PDFDocument, r: BusinessReport, i: number) {
  const c = r.candidates[i];
  doc.addPage();
  doc.fillColor(GOLD).fontSize(10.5).text(`후보 ${NUM[i] ?? i + 1}`, M, M, { width: TW });
  const top = M + 22;
  const chars = c.reading.chars;
  const box = 56;
  const gap = 8;
  const x0 = (W - (chars.length * box + (chars.length - 1) * gap)) / 2;
  chars.forEach((x, k) => {
    const el = (x.element || x.sound || "") as ElementKo | "";
    doc.save().roundedRect(x0 + k * (box + gap), top, box, box, 6).fill(el ? EL_HEX[el] : "#6e7075").restore();
    doc.fillColor("#ffffff").fontSize(x.hanja ? 32 : 28).text(x.hanja ?? x.hangul, x0 + k * (box + gap), top + (x.hanja ? 8 : 11), { width: box, align: "center" });
    doc.fillColor(SOFT).fontSize(10).text(x.hanja ? x.hangul : `소리 ${x.sound ?? "—"}`, x0 + k * (box + gap), top + box + 4, { width: box, align: "center" });
  });
  doc.y = top + box + 26;
  doc.fontSize(16);
  bold(doc, `${c.hangul}${c.hanja ? `  ${c.hanja}` : ""}`, 0, doc.y, { width: W, align: "center" }, NAVY);
  doc.fillColor(SOFT).fontSize(10).text(`영문 ${c.english}`, 0, doc.y + 4, { width: W, align: "center" });
  goldRule(doc, doc.y + 6, W / 2 - 60, W / 2 + 60);
  doc.y += 20;
  doc.x = M;
  subhead(doc, "뜻");
  para(doc, c.meaning);
  subhead(doc, "이름 이야기");
  para(doc, c.story);
  subhead(doc, "풀이");
  const rd = c.reading;
  const facts: string[] = [];
  if (rd.industry) {
    const t = rd.industry.first === "생" ? "업종 기운을 낳아 줌" : rd.industry.first === "같음" ? "업종 기운과 같음" : rd.industry.first === "극" ? "업종 기운을 누름" : "무난함";
    facts.push(`업종 오행 — 첫소리 ${t}`);
  }
  facts.push(`소리 흐름 — ${rd.sound.clashes === 0 ? "부딪힘 없음" : `${rd.sound.clashes}곳 부딪힘`}`);
  facts.push(rd.suri ? `총획 — ${rd.totalStrokes}획 ${rd.suri.lucky ? "길한 수" : "아쉬운 수"}` : "총획 — 한글 이름이라 소리로 봄");
  if (rd.supports) facts.push(`대표자 사주 — ${rd.supports.length ? `${rd.supports.join("·")} 기운을 채움` : "부딪힘 없음"}`);
  para(doc, facts.join("  ·  "), { indent: 6, size: 10 });
}

function trademarkPage(doc: PDFKit.PDFDocument, r: BusinessReport) {
  doc.addPage();
  pageTitle(doc, "이름을 정하기 전에 꼭 확인하세요");
  para(doc, "류결사주는 이름의 뜻과 기운만 살펴요. 같은 이름이 이미 상표로 등록되어 있는지는 확인하지 못해요.");
  para(doc, "◆ 특허청 키프리스(kipris.or.kr)에서 같은 업종의 상표가 있는지 찾아보세요.", { indent: 6 });
  para(doc, "◆ 사업자등록을 할 세무서 관할에서 같은 이름이 있는지, 쓰려는 인터넷 주소·SNS 이름이 비어 있는지도 함께 살펴보세요.", { indent: 6 });
  para(doc, `◆ 간판에는 업종 이름을 붙여도 좋아요 — 예: ${r.candidates[0]?.hangul ?? "다온"} ${r.industry.suffix.split(" · ")[0]}`, { indent: 6 });
  noteBox(doc, "후보를 소리 내어 여러 번 불러 보고, 손님이 처음 들었을 때 바로 알아듣는지 가까운 분들께 물어보세요. 전해 오는 작명 이론에 따른 참고용이에요.");
}

export async function buildBusinessPdf(input: { report: BusinessReport; nickname: string; header: ReadingHeader; saju: SajuJson; siteUrl?: string; issuedAt?: Date }): Promise<Buffer> {
  const r = input.report;
  const doc = new PDFDocument({ size: "A5", margins: { top: M, left: M, right: M, bottom: BOTTOM }, bufferPages: true, info: { Title: `${BIZ_INFO[r.kind ?? "business"].doc} - 류결사주`, Author: "류결사주" } });
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
  cover(doc, BIZ_INFO[r.kind ?? "business"].doc, `${input.nickname} 대표님의 ${BIZ_INFO[r.kind ?? "business"].who} 이름`, input.header, input.issuedAt ?? new Date());
  chartPage(ctx, "이 하나를 이름의 소리와 글자에 담아 채웠어요.");
  needPage(doc, r);
  r.candidates.forEach((_, i) => candidatePage(doc, r, i));
  trademarkPage(doc, r);
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

export const _unused = INK;
