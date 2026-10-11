import path from "path";
import fs from "fs";
import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import type { SajuJson } from "saju-engine";
import { buildPillarColumns, type ElementKo } from "@/lib/pillarView";
import { ELEMENT_HANJA } from "@/lib/manseView";
import { sajuFacts } from "@/lib/sajuFacts";
import { ENERGY_GUIDE } from "@/lib/neededEnergy";
import { FILL, PERSON_FILL } from "@/lib/basic/common";
import { TOPICS, TOPIC_KEYS, EXTRA_KEYS, type AnyTopicKey } from "@/lib/topics";
import { BUSINESS_INFO } from "@/lib/businessInfo";
import { DEFAULT_SITE_URL } from "@/lib/canonicalHost";
import type { DeepContent } from "@/server/readings/generateReading";
import type { ReadingHeader } from "@/server/readings/readings";

/**
 * 사주 책자 PDF (2026-10-12 수정안 38).
 *   표지(이름) → 나의 원국(여덟 글자·오행·대운·부족한 기운) → 목차 → 운세마다 한 장씩(요약·소제목·본문)
 *   → 나를 채우는 기운(행운 카드) + 류결사주 QR
 * 글꼴: Noto Serif CJK KR(SIL OFL 1.1)에서 한글·한자만 추린 파일 (assets/fonts). 굵은 글씨는 획을 덧그려 만든다.
 */

const W = 595.28;
const H = 841.89;
const M = 54;
const NAVY = "#16294a";
const GOLD = "#a8843a";
const GOLD_LIGHT = "#d4b265";
const INK = "#1f2430";
const SOFT = "#5b6170";
const FAINT = "#8a8f9a";
const PAPER = "#f7f4ec";
const RED = "#a3302a";
const EL_HEX: Record<ElementKo, string> = { 목: "#3d6b4c", 화: "#b54a3f", 토: "#b08d57", 금: "#6e7075", 수: "#2f4a73" };

const FONT_FILE = path.join(process.cwd(), "assets", "fonts", "NotoSerifKR-Regular-subset.otf");

export interface PdfInput {
  nickname: string;
  header: ReadingHeader;
  saju: SajuJson;
  readings: Array<{ topic: AnyTopicKey; content: DeepContent }>;
  siteUrl?: string;
  issuedAt?: Date;
}

type Doc = PDFKit.PDFDocument;

function bold(doc: Doc, text: string, x: number | undefined, y: number | undefined, opts: PDFKit.Mixins.TextOptions = {}, color = INK) {
  doc.save();
  doc.lineWidth(0.35).fillColor(color).strokeColor(color);
  if (x === undefined) doc.text(text, { ...opts, fill: true, stroke: true } as PDFKit.Mixins.TextOptions);
  else doc.text(text, x, y, { ...opts, fill: true, stroke: true } as PDFKit.Mixins.TextOptions);
  doc.restore();
}

function goldRule(doc: Doc, y: number, x1 = M, x2 = W - M) {
  doc.save().strokeColor(GOLD).lineWidth(0.8).moveTo(x1, y).lineTo(x2, y).stroke();
  doc.lineWidth(0.4).moveTo(x1, y + 3).lineTo(x2, y + 3).stroke().restore();
}

function seal(doc: Doc, ch: string, x: number, y: number, size = 26) {
  doc.save().roundedRect(x, y, size, size, 4).fill(RED);
  doc.fillColor("#ffffff").fontSize(size * 0.6).text(ch, x, y + size * 0.14, { width: size, align: "center", lineBreak: false });
  doc.restore();
}

function ensureSpace(doc: Doc, need: number) {
  if (doc.y + need > H - M - 20) doc.addPage();
}

function cover(doc: Doc, input: PdfInput, title: string) {
  doc.rect(0, 0, W, H).fill(NAVY);
  doc.save().strokeColor(GOLD).lineWidth(1.6).rect(24, 24, W - 48, H - 48).stroke();
  doc.lineWidth(0.6).rect(32, 32, W - 64, H - 64).stroke().restore();
  doc.fillColor(GOLD_LIGHT).fontSize(13).text("류 결 사 주", 0, 150, { width: W, align: "center", characterSpacing: 6 });
  doc.fillColor(GOLD_LIGHT).fontSize(10).text("류결의 명견만리", 0, 172, { width: W, align: "center", characterSpacing: 3 });
  doc.save().strokeColor(GOLD).lineWidth(0.8).moveTo(W / 2 - 60, 205).lineTo(W / 2 + 60, 205).stroke().restore();
  doc.fontSize(34);
  bold(doc, `${input.nickname}님의 사주`, 0, 300, { width: W, align: "center" }, "#f6ecd2");
  if (input.header.hanjaName) doc.fillColor(GOLD_LIGHT).fontSize(16).text(input.header.hanjaName, 0, 352, { width: W, align: "center", characterSpacing: 4 });
  doc.fillColor(GOLD_LIGHT).fontSize(15).text(title, 0, 400, { width: W, align: "center" });
  doc.fillColor("#c9cfda").fontSize(11).text(input.header.birth, 0, 430, { width: W, align: "center" });
  const pillars = input.header.pillars.filter((p) => p.ganzhi).map((p) => `${p.label} ${p.ganzhi}`).join("  ·  ");
  doc.fillColor("#c9cfda").fontSize(11).text(pillars, 0, 450, { width: W, align: "center" });
  doc.fillColor(GOLD_LIGHT).fontSize(13).text("숨막혔던 나의 운명, 숨을 쉬다", 0, H - 190, { width: W, align: "center" });
  const d = input.issuedAt ?? new Date();
  const kst = new Date(d.getTime() + 9 * 3600 * 1000);
  doc.fillColor("#8f9bb3").fontSize(9).text(`${kst.getUTCFullYear()}년 ${kst.getUTCMonth() + 1}월 ${kst.getUTCDate()}일 펴냄 · 류결사주`, 0, H - 110, { width: W, align: "center" });
}

function pageTitle(doc: Doc, text: string, sealCh?: string) {
  const y = M;
  if (sealCh) seal(doc, sealCh, M, y - 2);
  doc.fontSize(20);
  bold(doc, text, sealCh ? M + 36 : M, y, { width: W - 2 * M - 36 }, NAVY);
  goldRule(doc, y + 34);
  doc.y = y + 50;
  doc.x = M;
}

function chartPage(doc: Doc, input: PdfInput) {
  const f = sajuFacts(input.saju);
  doc.addPage();
  pageTitle(doc, "나의 원국 — 여덟 글자");
  const cols = buildPillarColumns(input.saju);
  const boxW = 96;
  const gap = (W - 2 * M - boxW * 4) / 3;
  const top = doc.y + 6;
  cols.forEach((c, i) => {
    const x = M + i * (boxW + gap);
    doc.fillColor(FAINT).fontSize(10).text(c.label, x, top, { width: boxW, align: "center" });
    const cell = (y: number, ch: string | undefined, el: ElementKo | undefined, sub: string | undefined) => {
      if (!ch || !el) {
        doc.save().roundedRect(x, y, boxW, 60, 6).fill("#eceae3").restore();
        doc.fillColor(FAINT).fontSize(22).text("?", x, y + 14, { width: boxW, align: "center" });
        return;
      }
      doc.save().roundedRect(x, y, boxW, 60, 6).fill(EL_HEX[el]).restore();
      doc.fillColor("#ffffff").fontSize(28).text(ch, x, y + 8, { width: boxW, align: "center" });
      if (sub) doc.fillColor("#f0f0f0").fontSize(8.5).text(sub, x, y + 45, { width: boxW, align: "center" });
    };
    cell(top + 16, c.stem?.hanja, c.stem?.element, c.stem?.tenGod);
    cell(top + 82, c.branch?.hanja, c.branch?.element, c.branch?.tenGod);
  });
  doc.y = top + 160;

  // 오행 막대
  doc.x = M;
  doc.fontSize(13);
  bold(doc, "오행의 균형", M, doc.y, {}, NAVY);
  let y = doc.y + 8;
  for (const e of f.elementPercents) {
    const need = f.needed.elements.includes(e.element);
    doc.fillColor(need ? RED : SOFT).fontSize(11).text(`${e.element}(${ELEMENT_HANJA[e.element]})`, M, y, { width: 50 });
    doc.save().roundedRect(M + 52, y + 3, 360, 9, 4).fill("#e6e3da").restore();
    doc.save().roundedRect(M + 52, y + 3, Math.max(6, (360 * e.percent) / 100), 9, 4).fill(EL_HEX[e.element]).restore();
    doc.fillColor(need ? RED : SOFT).fontSize(10).text(`${e.percent}%${need ? "  아쉬움" : ""}`, M + 420, y, { width: 80 });
    y += 20;
  }
  doc.y = y + 12;

  // 대운
  doc.fontSize(13);
  bold(doc, "인생의 흐름 — 대운", M, doc.y, {}, NAVY);
  y = doc.y + 8;
  const cw = (W - 2 * M) / Math.max(1, f.daeunList.length);
  f.daeunList.forEach((d, i) => {
    const x = M + i * cw;
    const cur = d === f.currentDaeun;
    doc.save().roundedRect(x + 2, y, cw - 4, 44, 4).fill(cur ? "#f0e6cf" : "#eeece6").restore();
    if (cur) doc.save().roundedRect(x + 2, y, cw - 4, 44, 4).lineWidth(1.4).stroke(NAVY).restore();
    doc.fillColor(INK).fontSize(15).text(d.hanja, x, y + 6, { width: cw, align: "center" });
    doc.fillColor(FAINT).fontSize(8.5).text(`${d.startAge}세`, x, y + 28, { width: cw, align: "center" });
    if (cur) doc.fillColor(RED).fontSize(8.5).text("지금", x, y - 12, { width: cw, align: "center" });
  });
  doc.y = y + 64;

  // 부족한 기운 한 줄
  const need = f.needed.elements[0];
  doc.save().roundedRect(M, doc.y, W - 2 * M, 54, 8).fill("#f3ead6").restore();
  doc.fillColor(INK).fontSize(12).text(
    `참 좋은 바탕이에요. 그런데 딱 하나, ${need}(${ELEMENT_HANJA[need]})의 기운이 ${f.needed.reason === "lacking" ? "비어 있어요" : "가장 약해요"}. 이 하나를 채우는 법은 책 맨 뒤 '나를 채우는 기운'에 담았어요.`,
    M + 14,
    doc.y + 12,
    { width: W - 2 * M - 28, lineGap: 3 }
  );
}

function tocPage(doc: Doc, readings: PdfInput["readings"]) {
  doc.addPage();
  pageTitle(doc, "차례");
  let y = doc.y + 4;
  const row = (no: string, mark: string, title: string) => {
    doc.fillColor(GOLD).fontSize(13).text(no, M, y, { width: 32, lineBreak: false });
    doc.fillColor(RED).fontSize(13).text(mark, M + 36, y, { width: 24, lineBreak: false });
    doc.fillColor(INK).fontSize(13).text(title, M + 66, y, { width: W - 2 * M - 66, lineBreak: false });
    y += 30;
  };
  readings.forEach((r, i) => row(String(i + 1).padStart(2, "0"), TOPICS[r.topic].hanja, r.content.title));
  row(String(readings.length + 1).padStart(2, "0"), "◆", "나를 채우는 기운");
  doc.y = y;
}

function readingPages(doc: Doc, r: PdfInput["readings"][number]) {
  doc.addPage();
  pageTitle(doc, r.content.title, TOPICS[r.topic].hanja);
  if (r.content.summary) {
    const h = doc.fontSize(12).heightOfString(r.content.summary, { width: W - 2 * M - 28, lineGap: 4 }) + 24;
    doc.save().roundedRect(M, doc.y, W - 2 * M, h, 8).fill("#f3ead6").restore();
    doc.fillColor(INK).fontSize(12).text(r.content.summary, M + 14, doc.y + 12, { width: W - 2 * M - 28, lineGap: 4 });
    doc.y += 14;
  }
  r.content.parts.forEach((p, i) => {
    ensureSpace(doc, 80);
    doc.x = M;
    doc.moveDown(0.6);
    doc.fontSize(14);
    bold(doc, `${["一", "二", "三", "四", "五", "六", "七", "八", "九", "十", "十一", "十二", "十三"][i] ?? i + 1}  ${p.heading}`, M, doc.y, { width: W - 2 * M }, GOLD);
    doc.moveDown(0.3);
    for (const para of p.body.split(/\n+/).filter(Boolean)) {
      doc.fillColor(INK).fontSize(11.5).text(para, M, doc.y, { width: W - 2 * M, lineGap: 5, align: "justify" });
      doc.moveDown(0.5);
    }
  });
}

async function fillPage(doc: Doc, input: PdfInput) {
  const f = sajuFacts(input.saju);
  const need = f.needed.elements[0];
  const F = FILL[need];
  doc.addPage();
  pageTitle(doc, "나를 채우는 기운");
  doc.fillColor(INK).fontSize(12).text(
    `${input.nickname}님 사주에서 가장 아쉬운 하나는 ${need}(${ELEMENT_HANJA[need]})의 기운이에요. 이 기운을 곁에 두면 흐름이 한결 부드러워져요.`,
    M,
    doc.y,
    { width: W - 2 * M, lineGap: 4 }
  );
  const top = doc.y + 18;
  const boxH = 360;
  doc.save().roundedRect(M, top, W - 2 * M, boxH, 12).fill(NAVY).restore();
  doc.save().roundedRect(M + 6, top + 6, W - 2 * M - 12, boxH - 12, 9).lineWidth(0.8).stroke(GOLD).restore();
  doc.save().circle(W / 2, top + 58, 30).fill(EL_HEX[need]).restore();
  doc.fillColor("#ffffff").fontSize(30).text(ELEMENT_HANJA[need], 0, top + 38, { width: W, align: "center" });
  doc.fillColor(GOLD_LIGHT).fontSize(11).text(`나를 채우는 ${need}(${ELEMENT_HANJA[need]})의 기운`, 0, top + 98, { width: W, align: "center", characterSpacing: 2 });
  // 색 견본
  const sw = ENERGY_GUIDE[need].colors;
  sw.forEach((c, i) => {
    const cx = W / 2 + (i - (sw.length - 1) / 2) * 60;
    doc.save().circle(cx, top + 140, 13).fill(c.hex).lineWidth(1).stroke(GOLD).restore();
    doc.fillColor("#f6ecd2").fontSize(9).text(c.name, cx - 30, top + 158, { width: 60, align: "center" });
  });
  const rows: Array<[string, string]> = [
    ["방위", F.direction],
    ["숫자", F.numbers],
    ["동물", F.animal],
    ["식물", F.plant],
    ["곁에 둘 물건", F.object],
    ["생활", F.habit],
    ["곁에 두면 좋은 사람", PERSON_FILL[f.weakestGroup]],
  ];
  let y = top + 186;
  rows.forEach(([k, v], i) => {
    const col = i % 2;
    const x = M + 28 + col * ((W - 2 * M - 56) / 2);
    if (k === "곁에 두면 좋은 사람") {
      y += 4;
      doc.fillColor(GOLD_LIGHT).fontSize(9).text(k, M + 28, y, { width: W - 2 * M - 56 });
      doc.fillColor("#f6ecd2").fontSize(11.5).text(v, M + 28, y + 13, { width: W - 2 * M - 56 });
      return;
    }
    doc.fillColor(GOLD_LIGHT).fontSize(9).text(k, x, y, { width: 220 });
    doc.fillColor("#f6ecd2").fontSize(11.5).text(v, x, y + 13, { width: 220 });
    if (col === 1) y += 40;
  });

  // QR + 사이트
  const url = input.siteUrl || DEFAULT_SITE_URL;
  const qr = await QRCode.toBuffer(url, { margin: 1, width: 240, color: { dark: "#16294aff", light: "#ffffffff" } });
  const qy = top + boxH + 30;
  doc.image(qr, M, qy, { width: 84 });
  doc.fillColor(NAVY).fontSize(14);
  bold(doc, "류결사주", M + 100, qy + 6, {}, NAVY);
  doc.fillColor(SOFT).fontSize(10).text("오늘·내일의 운세와 만세력은 언제든 무료로 볼 수 있어요.", M + 100, qy + 30, { width: W - 2 * M - 100 });
  doc.fillColor(FAINT).fontSize(9).text(url.replace(/^https?:\/\//, ""), M + 100, qy + 48, { width: W - 2 * M - 100 });
  doc.fillColor(FAINT).fontSize(8).text(
    `본 풀이는 전통 명리학을 바탕으로 한 문화·오락 콘텐츠이며 중요한 결정의 근거로 삼지 마십시오. ${BUSINESS_INFO.companyName} · 사업자등록번호 ${BUSINESS_INFO.businessRegistrationNumber} · ${BUSINESS_INFO.csEmail}`,
    M,
    H - M - 30,
    { width: W - 2 * M, align: "center" }
  );
}

/** 표지 문구: 전부 보기면 "12가지 운세 전부 보기", 아니면 운세 이름 나열 */
export function pdfTitle(topics: AnyTopicKey[]): string {
  const all = [...TOPIC_KEYS, ...EXTRA_KEYS].every((t) => topics.includes(t));
  if (all) return "12가지 운세 전부 보기";
  const names = topics.map((t) => TOPICS[t].title);
  return names.length <= 3 ? `${names.join(" · ")} 깊게 보기` : `${names.length}가지 운세 깊게 보기`;
}

export async function buildPdf(input: PdfInput): Promise<Buffer> {
  const order = [...TOPIC_KEYS, ...EXTRA_KEYS] as AnyTopicKey[];
  const readings = [...input.readings].sort((a, b) => order.indexOf(a.topic) - order.indexOf(b.topic));
  const doc = new PDFDocument({ size: "A4", margin: M, bufferPages: true, info: { Title: `${input.nickname}님의 사주 - 류결사주`, Author: "류결사주" } });
  doc.registerFont("serif", fs.readFileSync(FONT_FILE));
  doc.font("serif");
  const chunks: Buffer[] = [];
  doc.on("data", (c: Buffer) => chunks.push(c));
  const done = new Promise<Buffer>((res, rej) => {
    doc.on("end", () => res(Buffer.concat(chunks)));
    doc.on("error", rej);
  });

  cover(doc, input, pdfTitle(readings.map((r) => r.topic)));
  chartPage(doc, input);
  if (readings.length > 1) tocPage(doc, readings);
  for (const r of readings) readingPages(doc, r);
  await fillPage(doc, input);

  // 쪽 번호 (표지 제외)
  const range = doc.bufferedPageRange();
  for (let i = 1; i < range.count; i++) {
    doc.switchToPage(range.start + i);
    const bottom = doc.page.margins.bottom;
    doc.page.margins.bottom = 0; // 아래 여백 밖에 쓰면 새 쪽이 생기지 않도록
    doc.fillColor(FAINT).fontSize(8.5).text(`류결사주 · ${i}`, 0, H - 32, { width: W, align: "center", lineBreak: false });
    doc.page.margins.bottom = bottom;
  }
  doc.end();
  return done;
}
