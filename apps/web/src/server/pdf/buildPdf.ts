import { BRAND, TENANT } from "@/tenants";
import path from "path";
import fs from "fs";
import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import type { SajuJson } from "saju-engine";
import { buildPillarColumns, type ElementKo } from "@/lib/pillarView";
import { ELEMENT_HANJA } from "@/lib/manseView";
import { sajuFacts, type SajuFacts } from "@/lib/sajuFacts";
import { ENERGY_GUIDE } from "@/lib/neededEnergy";
import { DAY_MASTER, FILL, LACK_CORE, PERSON_FILL } from "@/lib/basic/common";
import { TOPICS, TOPIC_KEYS, EXTRA_KEYS, type AnyTopicKey } from "@/lib/topics";
import { BUSINESS_INFO } from "@/lib/businessInfo";
import { DEFAULT_SITE_URL } from "@/lib/canonicalHost";
import {
  BOOK_INTRO,
  BRANCH_TEXT,
  DAEUN_GROUP_TEXT,
  ELEMENT_TEXT,
  FILL_DETAIL,
  FILL_LABEL,
  GROUP_BOOK_TEXT,
  PILLAR_POS_TEXT,
  STAGE_TEXT,
  STEM_TEXT,
  TEN_GOD_TEXT,
} from "@/lib/book/bookText";
import { branchElement, fillYears, stageOf, stemElement } from "@/lib/book/bookFacts";
import type { DeepContent } from "@/server/readings/generateReading";
import type { ReadingHeader } from "@/server/readings/readings";

/**
 * 사주 책자 PDF (2026-10-12 수정안 38 → 44 용사주식 두께).
 *
 * 판형 A5, 큰 글씨. 12가지 운세 전부 보기(14편)를 산 손님의 책은 네 부(部)로 엮는다:
 *   표지 → 머리말 → 차례
 *   제1부 나의 원국: 원국 그림 · 네 기둥 한 자씩 · 오행 · 십신
 *   제2부 열네 가지 운세: 운세마다 여는 쪽(한자 표지·요약) + 본문 (AI 깊게 보기)
 *   제3부 인생의 흐름: 대운 10년마다 한 쪽
 *   제4부 나를 채우는 기운: 행운 카드 · 항목별 안내 · 채움의 해 · 곁에 둘 사람
 *   맺음(QR)
 * 깊게 보기를 몇 개만 산 손님의 책은 얇게: 표지 → 원국 → (차례) → 운세 → 나를 채우는 기운 → 맺음.
 * 제1·3·4부의 글은 엔진 값으로 문장 창고(lib/book/bookText)에서 고른다 - AI 비용 없음.
 * 글꼴: Noto Serif CJK KR(SIL OFL 1.1)에서 한글·한자만 추린 파일 (assets/fonts). 굵은 글씨는 획을 덧그려 만든다.
 */

export const W = 419.53;
export const H = 595.28;
export const M = 40;
export const BOTTOM = 52;
export const TW = W - 2 * M;
export const NAVY = "#16294a";
export const GOLD = "#a8843a";
export const GOLD_LIGHT = "#d4b265";
export const INK = "#1f2430";
export const SOFT = "#5b6170";
export const FAINT = "#8a8f9a";
export const CREAM = "#f3ead6";
export const RED = "#a3302a";
export const EL_HEX: Record<ElementKo, string> = { 목: "#3d6b4c", 화: "#b54a3f", 토: "#b08d57", 금: "#6e7075", 수: "#2f4a73" };
const NUM = ["一", "二", "三", "四", "五", "六", "七", "八", "九", "十", "十一", "十二", "十三", "十四", "十五"];
const BODY = 11.5;
const GAP = 7;

export const FONT_FILE = path.join(process.cwd(), "assets", "fonts", "NotoSerifKR-Regular-subset.otf");

export interface PdfInput {
  nickname: string;
  header: ReadingHeader;
  saju: SajuJson;
  readings: Array<{ topic: AnyTopicKey; content: DeepContent }>;
  siteUrl?: string;
  issuedAt?: Date;
}

export type Doc = PDFKit.PDFDocument;
export type Ctx = { doc: Doc; input: PdfInput; f: SajuFacts; name: (s: string) => string; navy: Set<number> };

// ───────────────────────── 그리기 도구 ─────────────────────────

export function bold(doc: Doc, text: string, x: number | undefined, y: number | undefined, opts: PDFKit.Mixins.TextOptions = {}, color = INK) {
  doc.save();
  doc.lineWidth(0.3).fillColor(color).strokeColor(color);
  if (x === undefined) doc.text(text, { ...opts, fill: true, stroke: true } as PDFKit.Mixins.TextOptions);
  else doc.text(text, x, y, { ...opts, fill: true, stroke: true } as PDFKit.Mixins.TextOptions);
  doc.restore();
}

export function goldRule(doc: Doc, y: number, x1 = M, x2 = W - M) {
  doc.save().strokeColor(GOLD).lineWidth(0.7).moveTo(x1, y).lineTo(x2, y).stroke();
  doc.lineWidth(0.35).moveTo(x1, y + 2.5).lineTo(x2, y + 2.5).stroke().restore();
}

export function seal(doc: Doc, ch: string, x: number, y: number, size = 22) {
  doc.save().roundedRect(x, y, size, size, 3).fill(RED);
  doc.fillColor("#ffffff").fontSize(size * (ch.length > 1 ? 0.42 : 0.6)).text(ch, x, y + size * (ch.length > 1 ? 0.26 : 0.14), { width: size, align: "center", lineBreak: false });
  doc.restore();
}

export function ensureSpace(doc: Doc, need: number) {
  if (doc.y + need > H - BOTTOM) doc.addPage();
}

/** 쪽 맨 위 제목 */
export function pageTitle(doc: Doc, text: string, sealCh?: string) {
  const y = M;
  if (sealCh) seal(doc, sealCh, M, y - 2);
  doc.fontSize(16);
  bold(doc, text, sealCh ? M + 30 : M, y, { width: TW - 30 }, NAVY);
  goldRule(doc, y + 26);
  doc.y = y + 40;
  doc.x = M;
}

/** 쪽 중간에서 시작하는 큰 제목 (자리가 모자라면 다음 쪽 맨 위로) */
function sectionTitle(doc: Doc, text: string) {
  if (doc.y > H - BOTTOM - 260) doc.addPage();
  if (doc.y <= M + 1) return pageTitle(doc, text);
  doc.moveDown(1.2);
  const y = doc.y;
  doc.fontSize(16);
  bold(doc, text, M, y, { width: TW }, NAVY);
  goldRule(doc, y + 26);
  doc.y = y + 40;
  doc.x = M;
}

/** 본문 문단 (넘치면 다음 쪽으로 이어진다) */
export function para(doc: Doc, text: string, opts: { size?: number; color?: string; indent?: number } = {}) {
  const x = M + (opts.indent ?? 0);
  doc.fillColor(opts.color ?? INK).fontSize(opts.size ?? BODY).text(text, x, doc.y, { width: TW - (opts.indent ?? 0), lineGap: GAP, align: "justify" });
  doc.moveDown(0.55);
}

/** 작은 소제목 */
export function subhead(doc: Doc, text: string, color = GOLD) {
  ensureSpace(doc, 70);
  doc.moveDown(0.3);
  doc.fontSize(12.5);
  bold(doc, text, M, doc.y, { width: TW }, color);
  doc.moveDown(0.35);
}

/** 크림색 상자 안 글 */
export function noteBox(doc: Doc, text: string, size = 11) {
  const h = doc.fontSize(size).heightOfString(text, { width: TW - 24, lineGap: 5 }) + 22;
  ensureSpace(doc, h + 6);
  const top = doc.y;
  doc.save().roundedRect(M, top, TW, h, 7).fill(CREAM).restore();
  doc.fillColor(INK).fontSize(size).text(text, M + 12, top + 11, { width: TW - 24, lineGap: 5 });
  doc.y = top + h + 10;
  doc.x = M;
}

/** 부(部)를 여는 남색 쪽 */
function partPage(ctx: Ctx, no: string, title: string, sub: string) {
  const { doc } = ctx;
  doc.addPage();
  ctx.navy.add(doc.bufferedPageRange().start + doc.bufferedPageRange().count - 1);
  doc.rect(0, 0, W, H).fill(NAVY);
  doc.save().strokeColor(GOLD).lineWidth(1.2).rect(18, 18, W - 36, H - 36).stroke();
  doc.lineWidth(0.5).rect(24, 24, W - 48, H - 48).stroke().restore();
  doc.fillColor(GOLD_LIGHT).fontSize(12).text(no, 0, 200, { width: W, align: "center", characterSpacing: 6 });
  doc.fontSize(24);
  bold(doc, title, 0, 228, { width: W, align: "center" }, "#f6ecd2");
  doc.save().strokeColor(GOLD).lineWidth(0.7).moveTo(W / 2 - 40, 272).lineTo(W / 2 + 40, 272).stroke().restore();
  doc.fillColor("#c9cfda").fontSize(10.5).text(sub, 60, 290, { width: W - 120, align: "center", lineGap: 5 });
}

// ───────────────────────── 표지·머리말·차례 ─────────────────────────

function cover(ctx: Ctx, title: string) {
  const { doc, input } = ctx;
  doc.rect(0, 0, W, H).fill(NAVY);
  doc.save().strokeColor(GOLD).lineWidth(1.4).rect(18, 18, W - 36, H - 36).stroke();
  doc.lineWidth(0.5).rect(24, 24, W - 48, H - 48).stroke().restore();
  doc.fillColor(GOLD_LIGHT).fontSize(11).text("류 결 사 주", 0, 100, { width: W, align: "center", characterSpacing: 6 });
  doc.fillColor(GOLD_LIGHT).fontSize(8.5).text(TENANT.brand.channelName, 0, 118, { width: W, align: "center", characterSpacing: 3 });
  doc.save().strokeColor(GOLD).lineWidth(0.7).moveTo(W / 2 - 44, 142).lineTo(W / 2 + 44, 142).stroke().restore();
  doc.fontSize(26);
  bold(doc, `${input.nickname}님의 사주`, 0, 205, { width: W, align: "center" }, "#f6ecd2");
  if (input.header.hanjaName) doc.fillColor(GOLD_LIGHT).fontSize(13).text(input.header.hanjaName, 0, 244, { width: W, align: "center", characterSpacing: 4 });
  doc.fillColor(GOLD_LIGHT).fontSize(12).text(title, 0, 280, { width: W, align: "center" });
  doc.fillColor("#c9cfda").fontSize(9.5).text(input.header.birth, 0, 304, { width: W, align: "center" });
  const pillars = input.header.pillars.filter((p) => p.ganzhi).map((p) => `${p.label} ${p.ganzhi}`).join("  ·  ");
  doc.fillColor("#c9cfda").fontSize(9.5).text(pillars, 0, 320, { width: W, align: "center" });
  doc.fillColor(GOLD_LIGHT).fontSize(11).text(TENANT.brand.slogan, 0, H - 140, { width: W, align: "center" });
  const d = input.issuedAt ?? new Date();
  const kst = new Date(d.getTime() + 9 * 3600 * 1000);
  doc.fillColor("#8f9bb3").fontSize(8).text(`${kst.getUTCFullYear()}년 ${kst.getUTCMonth() + 1}월 ${kst.getUTCDate()}일 펴냄 · ${BRAND}`, 0, H - 80, { width: W, align: "center" });
}

function introPage(ctx: Ctx) {
  const { doc } = ctx;
  doc.addPage();
  pageTitle(doc, "이 책을 펴며");
  doc.moveDown(0.6);
  for (const p of BOOK_INTRO) para(doc, ctx.name(p), { size: 12 });
  doc.moveDown(1);
  doc.fillColor(GOLD).fontSize(11).text(BRAND, M, doc.y, { width: TW, align: "right" });
}

function tocPage(ctx: Ctx, full: boolean) {
  const { doc, input } = ctx;
  doc.addPage();
  pageTitle(doc, "차례");
  let y = doc.y + 2;
  const row = (mark: string, title: string, sub = false) => {
    if (y > H - BOTTOM - 20) {
      doc.addPage();
      y = M;
    }
    if (sub) {
      doc.fillColor(RED).fontSize(10.5).text(mark, M + 14, y, { width: 30, lineBreak: false });
      doc.fillColor(INK).fontSize(11).text(title, M + 46, y, { width: TW - 46, lineBreak: false });
      y += 20;
    } else {
      y += 6;
      doc.fontSize(12);
      bold(doc, `${mark}  ${title}`, M, y, { width: TW, lineBreak: false }, NAVY);
      y += 24;
    }
  };
  if (full) row("第一部", "나의 원국 — 타고난 여덟 글자");
  if (full) row("第二部", "열네 가지 운세");
  input.readings.forEach((r, i) => row(NUM[i] ?? String(i + 1), r.content.title, true));
  if (full) row("第三部", "인생의 흐름 — 대운");
  row(full ? "第四部" : "◆", "나를 채우는 기운");
  doc.y = y;
}

// ───────────────────────── 제1부 나의 원국 ─────────────────────────

export function chartPage(ctx: Ctx, noteTail = "이 하나를 채우는 법은 책 맨 뒤 '나를 채우는 기운'에 담았어요.") {
  const { doc, input, f } = ctx;
  doc.addPage();
  pageTitle(doc, "나의 원국 — 여덟 글자");
  const cols = buildPillarColumns(input.saju);
  const boxW = 70;
  const gap = (TW - boxW * 4) / 3;
  const top = doc.y + 2;
  cols.forEach((c, i) => {
    const x = M + i * (boxW + gap);
    doc.fillColor(FAINT).fontSize(9).text(c.label, x, top, { width: boxW, align: "center" });
    const cell = (y: number, ch: string | undefined, el: ElementKo | undefined, sub: string | undefined) => {
      if (!ch || !el) {
        doc.save().roundedRect(x, y, boxW, 48, 5).fill("#eceae3").restore();
        doc.fillColor(FAINT).fontSize(18).text("?", x, y + 12, { width: boxW, align: "center" });
        return;
      }
      doc.save().roundedRect(x, y, boxW, 48, 5).fill(EL_HEX[el]).restore();
      doc.fillColor("#ffffff").fontSize(22).text(ch, x, y + 5, { width: boxW, align: "center" });
      if (sub) doc.fillColor("#f0f0f0").fontSize(7.5).text(sub, x, y + 35, { width: boxW, align: "center" });
    };
    cell(top + 14, c.stem?.hanja, c.stem?.element, c.stem?.tenGod);
    cell(top + 66, c.branch?.hanja, c.branch?.element, c.branch?.tenGod);
  });
  doc.y = top + 128;

  doc.x = M;
  doc.fontSize(11.5);
  bold(doc, "오행의 균형", M, doc.y, {}, NAVY);
  let y = doc.y + 6;
  for (const e of f.elementPercents) {
    const need = f.needed.elements.includes(e.element);
    doc.fillColor(need ? RED : SOFT).fontSize(10).text(`${e.element}(${ELEMENT_HANJA[e.element]})`, M, y, { width: 44 });
    doc.save().roundedRect(M + 46, y + 3, 230, 8, 4).fill("#e6e3da").restore();
    doc.save().roundedRect(M + 46, y + 3, Math.max(5, (230 * e.percent) / 100), 8, 4).fill(EL_HEX[e.element]).restore();
    doc.fillColor(need ? RED : SOFT).fontSize(9).text(`${e.percent}%${need ? " 아쉬움" : ""}`, M + 284, y + 1, { width: 60 });
    y += 17;
  }
  doc.y = y + 10;

  doc.fontSize(11.5);
  bold(doc, "인생의 흐름 — 대운", M, doc.y, {}, NAVY);
  y = doc.y + 14;
  const list = f.daeunList;
  const cw = TW / Math.max(1, list.length);
  list.forEach((d, i) => {
    const x = M + i * cw;
    const cur = d === f.currentDaeun;
    doc.save().roundedRect(x + 1.5, y, cw - 3, 38, 3).fill(cur ? "#f0e6cf" : "#eeece6").restore();
    if (cur) doc.save().roundedRect(x + 1.5, y, cw - 3, 38, 3).lineWidth(1.2).stroke(NAVY).restore();
    doc.fillColor(INK).fontSize(cw < 34 ? 10 : 12).text(d.hanja, x, y + 6, { width: cw, align: "center" });
    doc.fillColor(FAINT).fontSize(7).text(`${d.startAge}세`, x, y + 25, { width: cw, align: "center" });
    if (cur) doc.fillColor(RED).fontSize(7.5).text("지금", x, y - 11, { width: cw, align: "center" });
  });
  doc.y = y + 50;
  doc.x = M;

  const need = f.needed.elements[0];
  noteBox(
    doc,
    `참 좋은 바탕이에요. 그런데 딱 하나, ${need}(${ELEMENT_HANJA[need]})의 기운이 ${f.needed.reason === "lacking" ? "비어 있어요" : "가장 약해요"}. ${noteTail}`
  );
}

/** 네 기둥을 한 자씩 */
function pillarPages(ctx: Ctx) {
  const { doc, input, f } = ctx;
  const cols = buildPillarColumns(input.saju);
  const hidden = (s: string[]) => s.join("·");
  // 네 기둥을 한 장(章)처럼 이어 쓴다 - 기둥마다 새 쪽을 열면 반쪽짜리 쪽이 생긴다
  doc.addPage();
  doc.y = M;
  for (const key of ["year", "month", "day", "hour"] as const) {
    const c = cols.find((x) => x.key === key)!;
    const pos = PILLAR_POS_TEXT[key];
    sectionTitle(doc, pos.title);
    para(doc, pos.body);
    if (c.empty || !c.stem || !c.branch) {
      noteBox(doc, "태어난 시간을 몰라 이 기둥은 비워 두었어요. 시간을 알게 되면 다시 받아 보세요. 나머지 세 기둥만으로도 큰 흐름은 충분히 읽을 수 있어요.");
      continue;
    }
    const block = (label: string, hanja: string, el: ElementKo, lines: string[]) => {
      ensureSpace(doc, 120);
      const top = doc.y + 4;
      doc.save().roundedRect(M, top, 46, 46, 5).fill(EL_HEX[el]).restore();
      doc.fillColor("#ffffff").fontSize(26).text(hanja, M, top + 6, { width: 46, align: "center" });
      doc.fontSize(12);
      bold(doc, label, M + 58, top + 4, { width: TW - 58 }, NAVY);
      doc.fillColor(SOFT).fontSize(9.5).text(`오행 ${el}(${ELEMENT_HANJA[el]})`, M + 58, top + 24, { width: TW - 58 });
      doc.y = top + 56;
      doc.x = M;
      for (const l of lines) para(doc, l);
    };
    const isDay = key === "day";
    block(isDay ? "일간 — 나 자신" : "천간 — 하늘의 글자", c.stem.hanja, c.stem.element, [
      isDay ? ctx.name(DAY_MASTER[f.dayStem]?.core ?? "") : STEM_TEXT[c.stem.hangul],
      TEN_GOD_TEXT[c.stem.tenGod] ?? "",
    ].filter(Boolean));
    const stage = c.twelveStage ? STAGE_TEXT[c.twelveStage] : "";
    block(isDay ? "일지 — 배우자의 자리" : "지지 — 땅의 글자", c.branch.hanja, c.branch.element, [
      BRANCH_TEXT[c.branch.hangul],
      TEN_GOD_TEXT[c.branch.tenGod] ?? "",
      stage ? `이 글자는 나에게 ${stage}` : "",
      c.hiddenStems.length ? `글자 속에 숨은 기운(지장간)은 ${hidden(c.hiddenStems)}이에요. 겉으로 드러나지 않아도 때가 되면 살아나는 힘이에요.` : "",
    ].filter(Boolean));
  }
}

function elementPage(ctx: Ctx) {
  const { doc, f } = ctx;
  doc.addPage();
  pageTitle(doc, "다섯 기운 — 오행");
  para(doc, "사주의 여덟 글자는 모두 나무(木)·불(火)·흙(土)·쇠(金)·물(水) 다섯 기운 가운데 하나예요. 다섯 기운이 서로 낳고 누르며 돌아갈 때 삶이 편안해지고, 어느 하나가 넘치거나 모자라면 그만큼 기울어요.");
  const top = f.elementPercents.reduce((a, b) => (b.percent > a.percent ? b : a));
  for (const e of f.elementPercents) {
    const t = ELEMENT_TEXT[e.element];
    const need = f.needed.elements.includes(e.element);
    subhead(doc, `${e.element}(${ELEMENT_HANJA[e.element]}) · ${e.percent}%${need ? " · 아쉬운 기운" : e === top ? " · 가장 넉넉한 기운" : ""}`, need ? RED : GOLD);
    para(doc, t.nature);
    if (need) para(doc, t.weak);
    else if (e === top) para(doc, t.strong);
  }
}

function tenGodPage(ctx: Ctx) {
  const { doc, f } = ctx;
  doc.addPage();
  pageTitle(doc, "나를 움직이는 힘 — 십신");
  para(doc, "십신(十神)은 여덟 글자가 '나'에게 어떤 뜻인지 나눈 열 가지 이름이에요. 비슷한 것끼리 묶으면 다섯 가지 힘이 되고, 어느 힘이 두드러지고 어느 힘이 옅은지가 그 사람의 결을 만들어요.");
  let y = doc.y + 4;
  for (const g of f.groups) {
    doc.fillColor(SOFT).fontSize(10).text(g.group, M, y, { width: 40 });
    doc.save().roundedRect(M + 42, y + 3, 240, 8, 4).fill("#e6e3da").restore();
    doc.save().roundedRect(M + 42, y + 3, Math.max(5, (240 * g.percent) / 100), 8, 4).fill(g.group === f.strongest ? GOLD : "#b9b3a3").restore();
    doc.fillColor(SOFT).fontSize(9).text(`${g.percent}%`, M + 290, y + 1, { width: 40 });
    y += 17;
  }
  doc.y = y + 8;
  doc.x = M;
  subhead(doc, `가장 두드러진 힘 — ${f.strongest}`);
  para(doc, GROUP_BOOK_TEXT[f.strongest].strong);
  subhead(doc, `가장 옅은 힘 — ${f.weakestGroup}`, RED);
  para(doc, GROUP_BOOK_TEXT[f.weakestGroup].weak);
}

// ───────────────────────── 제2부 운세 ─────────────────────────

function readingOpener(ctx: Ctx, r: PdfInput["readings"][number], no: number) {
  const { doc } = ctx;
  doc.addPage();
  const hanja = TOPICS[r.topic].hanja;
  doc.fillColor(GOLD).fontSize(11).text(`第${NUM[no] ?? no + 1}章`, 0, 130, { width: W, align: "center", characterSpacing: 3 });
  doc.save().roundedRect(W / 2 - 44, 156, 88, 88, 8).fill(RED).restore();
  doc.fillColor("#ffffff").fontSize(hanja.length > 1 ? 30 : 52).text(hanja, W / 2 - 44, hanja.length > 1 ? 184 : 172, { width: 88, align: "center", lineBreak: false });
  doc.fontSize(20);
  bold(doc, r.content.title, 0, 268, { width: W, align: "center" }, NAVY);
  goldRule(doc, 302, W / 2 - 50, W / 2 + 50);
  if (r.content.summary) {
    doc.fillColor(INK).fontSize(12).text(r.content.summary, M + 16, 326, { width: TW - 32, align: "center", lineGap: 7 });
  }
}

function readingPages(ctx: Ctx, r: PdfInput["readings"][number], no: number, full: boolean) {
  const { doc } = ctx;
  if (full) {
    readingOpener(ctx, r, no);
    doc.addPage();
    doc.y = M;
  } else {
    doc.addPage();
    pageTitle(doc, r.content.title, TOPICS[r.topic].hanja);
    if (r.content.summary) noteBox(doc, r.content.summary, 11.5);
  }
  r.content.parts.forEach((p, i) => {
    ensureSpace(doc, 90);
    doc.x = M;
    if (i > 0 || !full) doc.moveDown(0.6);
    doc.fontSize(13);
    bold(doc, `${NUM[i] ?? i + 1}  ${p.heading}`, M, doc.y, { width: TW }, GOLD);
    doc.moveDown(0.4);
    for (const t of p.body.split(/\n+/).filter(Boolean)) para(doc, t);
  });
}

// ───────────────────────── 제3부 대운 ─────────────────────────

function daeunPages(ctx: Ctx) {
  const { doc, f } = ctx;
  const need = f.needed.elements[0];
  const curIdx = f.currentDaeun ? f.daeunList.indexOf(f.currentDaeun) : -1;
  f.daeunList.forEach((d, i) => {
    doc.addPage();
    const [s, b] = [...d.ganzhi];
    const se = stemElement(s);
    const be = branchElement(b);
    const range = `${d.startAge}세${d.endAge !== null ? ` ~ ${d.endAge}세` : " ~"}`;
    const tag = i === curIdx ? " · 지금 지나는 10년" : curIdx >= 0 && i === curIdx + 1 ? " · 다가올 10년" : curIdx >= 0 && i < curIdx ? " · 지나온 10년" : "";
    doc.fillColor(i === curIdx ? RED : GOLD).fontSize(10.5).text(`${range}${tag}`, M, M, { width: TW });
    const top = M + 22;
    [[d.hanja[0], se], [d.hanja[1], be]].forEach(([ch, el], k) => {
      doc.save().roundedRect(M + k * 56, top, 50, 50, 5).fill(EL_HEX[el as ElementKo]).restore();
      doc.fillColor("#ffffff").fontSize(28).text(ch as string, M + k * 56, top + 6, { width: 50, align: "center" });
    });
    doc.fontSize(15);
    bold(doc, `${d.ganzhi} 대운`, M + 124, top + 4, { width: TW - 124 }, NAVY);
    doc.fillColor(SOFT).fontSize(9.5).text(`천간 십신 ${d.tenGod}(${d.group}) · 오행 ${se}·${be}`, M + 124, top + 28, { width: TW - 124 });
    goldRule(doc, top + 62);
    doc.y = top + 76;
    doc.x = M;
    const t = DAEUN_GROUP_TEXT[d.group];
    para(doc, t.flow);
    para(doc, TEN_GOD_TEXT[d.tenGod] ?? "");
    const st = stageOf(f.dayStem, b);
    if (st && STAGE_TEXT[st]) para(doc, `이 대운의 땅 글자는 나에게 ${STAGE_TEXT[st]}`);
    if (se === need || be === need) {
      noteBox(doc, `반가운 10년이에요. 사주에서 아쉬웠던 ${need}(${ELEMENT_HANJA[need]})의 기운이 이 대운에 ${se === need && be === need ? "하늘과 땅 모두에" : se === need ? "하늘 글자로" : "땅 글자로"} 들어와요. 이때 시작한 일은 뿌리를 잘 내려요.`);
    }
    subhead(doc, "이 10년의 처신");
    para(doc, t.tip);
  });
}

// ───────────────────────── 제4부 나를 채우는 기운 ─────────────────────────

function fillCardPage(ctx: Ctx) {
  const { doc, input, f } = ctx;
  const need = f.needed.elements[0];
  const F = FILL[need];
  doc.addPage();
  pageTitle(doc, "나를 채우는 기운");
  doc.fillColor(INK).fontSize(11.5).text(
    `${input.nickname}님 사주에서 가장 아쉬운 하나는 ${need}(${ELEMENT_HANJA[need]})의 기운이에요. 이 기운을 곁에 두면 흐름이 한결 부드러워져요.`,
    M,
    doc.y,
    { width: TW, lineGap: 5 }
  );
  const top = doc.y + 14;
  const boxH = 360;
  doc.save().roundedRect(M, top, TW, boxH, 10).fill(NAVY).restore();
  doc.save().roundedRect(M + 5, top + 5, TW - 10, boxH - 10, 8).lineWidth(0.7).stroke(GOLD).restore();
  doc.save().circle(W / 2, top + 46, 24).fill(EL_HEX[need]).restore();
  doc.fillColor("#ffffff").fontSize(24).text(ELEMENT_HANJA[need], 0, top + 30, { width: W, align: "center" });
  doc.fillColor(GOLD_LIGHT).fontSize(9.5).text(`나를 채우는 ${need}(${ELEMENT_HANJA[need]})의 기운`, 0, top + 78, { width: W, align: "center", characterSpacing: 2 });
  const sw = ENERGY_GUIDE[need].colors;
  sw.forEach((c, i) => {
    const cx = W / 2 + (i - (sw.length - 1) / 2) * 50;
    doc.save().circle(cx, top + 112, 11).fill(c.hex).lineWidth(1).stroke(GOLD).restore();
    doc.fillColor("#f6ecd2").fontSize(8).text(c.name, cx - 25, top + 127, { width: 50, align: "center" });
  });
  const rows: Array<[string, string]> = [
    ["방위", F.direction],
    ["숫자", F.numbers],
    ["동물", F.animal],
    ["식물", F.plant],
    ["곁에 둘 물건", F.object],
    ["생활", F.habit],
  ];
  let y = top + 150;
  const colW = (TW - 40) / 2;
  rows.forEach(([k, v], i) => {
    const col = i % 2;
    const x = M + 20 + col * colW;
    doc.fillColor(GOLD_LIGHT).fontSize(8).text(k, x, y, { width: colW - 6 });
    doc.fillColor("#f6ecd2").fontSize(10).text(v, x, y + 11, { width: colW - 6 });
    if (col === 1) y += 40;
  });
  y += 6;
  doc.fillColor(GOLD_LIGHT).fontSize(8).text("곁에 두면 좋은 사람", M + 20, y, { width: TW - 40 });
  doc.fillColor("#f6ecd2").fontSize(10).text(PERSON_FILL[f.weakestGroup], M + 20, y + 11, { width: TW - 40 });
  doc.y = top + boxH + 10;
  doc.x = M;
}

function fillDetailPages(ctx: Ctx) {
  const { doc, input, f } = ctx;
  const need = f.needed.elements[0];
  doc.addPage();
  pageTitle(doc, `딱 하나 아쉬운 것 — ${need}(${ELEMENT_HANJA[need]})`);
  para(doc, `${input.nickname}님, 참 좋은 사주예요. 다만 다섯 기운 가운데 ${need}(${ELEMENT_HANJA[need]})의 기운이 ${f.needed.reason === "lacking" ? "원국에 비어 있어요" : "가장 약해요"}.`);
  para(doc, LACK_CORE[need]);
  para(doc, "남은 작은 빈자리는 탓할 일이 아니라 채우면 되는 자리예요. 색과 방위, 곁에 두는 동물·식물·물건, 그리고 하루의 습관과 곁에 있는 사람으로 조금씩 채워 가면 흐름이 한결 부드러워져요.");
  const d = FILL_DETAIL[need];
  for (const k of Object.keys(FILL_LABEL) as Array<keyof typeof FILL_LABEL>) {
    subhead(doc, `${FILL_LABEL[k]} — ${FILL[need][k]}`);
    para(doc, d[k]);
  }
  subhead(doc, `곁에 두면 좋은 사람 — ${PERSON_FILL[f.weakestGroup]}`);
  para(doc, GROUP_BOOK_TEXT[f.weakestGroup].weak);

  const yrs = fillYears(f.seun.year, f.seun.ganzhi, need, 10);
  subhead(doc, "기운이 저절로 채워지는 해");
  if (yrs.length === 0) {
    para(doc, `앞으로 10년 동안은 ${need}의 기운이 해(年)로 크게 들어오지 않아요. 그래서 더더욱 곁에 두는 것들로 살며시 채워 주는 것이 좋아요.`);
  } else {
    para(doc, `앞으로 10년 가운데 아래 해에는 ${need}(${ELEMENT_HANJA[need]})의 기운이 하늘이나 땅에서 저절로 들어와요. 이런 해에 새 일을 시작하거나 중요한 결정을 내리면 힘을 얻기 쉬워요.`);
    for (const y of yrs) para(doc, `◆ ${y.year}년 ${y.ganzhi}(${y.hanja})년 — ${y.where}에 ${need}의 기운`, { indent: 10 });
  }
}

export async function endPage(ctx: Ctx) {
  const { doc, input } = ctx;
  doc.addPage();
  const url = input.siteUrl || DEFAULT_SITE_URL;
  const qr = await QRCode.toBuffer(url, { margin: 1, width: 240, color: { dark: "#16294aff", light: "#ffffffff" } });
  doc.fontSize(15);
  bold(doc, BRAND, 0, 150, { width: W, align: "center" }, NAVY);
  doc.fillColor(GOLD).fontSize(10).text(TENANT.brand.slogan, 0, 176, { width: W, align: "center" });
  doc.image(qr, W / 2 - 50, 210, { width: 100 });
  doc.fillColor(SOFT).fontSize(10).text("오늘·내일의 운세와 만세력은 언제든 무료로 볼 수 있어요.", M, 326, { width: TW, align: "center" });
  doc.fillColor(FAINT).fontSize(9).text(url.replace(/^https?:\/\//, ""), M, 344, { width: TW, align: "center" });
  doc.fillColor(FAINT).fontSize(7.5).text(
    `본 풀이는 전통 명리학을 바탕으로 한 문화·오락 콘텐츠이며 중요한 결정의 근거로 삼지 마십시오. ${BUSINESS_INFO.companyName} · 사업자등록번호 ${BUSINESS_INFO.businessRegistrationNumber} · ${BUSINESS_INFO.csEmail}`,
    M,
    H - M - 50,
    { width: TW, align: "center", lineGap: 3 }
  );
}

// ───────────────────────── 엮기 ─────────────────────────

/** 표지 문구: 전부 보기면 "14가지 운세 전부 보기", 아니면 운세 이름 나열 */
export function pdfTitle(topics: AnyTopicKey[]): string {
  const all = [...TOPIC_KEYS, ...EXTRA_KEYS].every((t) => topics.includes(t));
  if (all) return "14가지 운세 전부 보기";
  const names = topics.map((t) => TOPICS[t].title);
  return names.length <= 3 ? `${names.join(" · ")} 깊게 보기` : `${names.length}가지 운세 깊게 보기`;
}

export async function buildPdf(input: PdfInput): Promise<Buffer> {
  const order = [...TOPIC_KEYS, ...EXTRA_KEYS] as AnyTopicKey[];
  const readings = [...input.readings].sort((a, b) => order.indexOf(a.topic) - order.indexOf(b.topic));
  const sorted = { ...input, readings };
  // 12가지 운세 전부 보기를 산 손님(열린 운세가 12가지 이상)은 두꺼운 책으로 엮는다
  const full = readings.length >= TOPIC_KEYS.length;
  const doc = new PDFDocument({
    size: "A5",
    margins: { top: M, left: M, right: M, bottom: BOTTOM },
    bufferPages: true,
    info: { Title: `${input.nickname}님의 사주 - ${BRAND}`, Author: BRAND },
  });
  doc.registerFont("serif", fs.readFileSync(FONT_FILE));
  doc.font("serif");
  const chunks: Buffer[] = [];
  doc.on("data", (c: Buffer) => chunks.push(c));
  const done = new Promise<Buffer>((res, rej) => {
    doc.on("end", () => res(Buffer.concat(chunks)));
    doc.on("error", rej);
  });

  const f = sajuFacts(input.saju);
  const name = (s: string) => s.replace(/[{｛]\s*이름\s*[}｝]/g, () => input.nickname);
  const ctx: Ctx = { doc, input: sorted, f, name, navy: new Set() };

  cover(ctx, pdfTitle(readings.map((r) => r.topic)));
  if (full) introPage(ctx);
  if (readings.length > 1) tocPage(ctx, full);
  if (full) {
    partPage(ctx, "第 一 部", "나의 원국", "타고난 여덟 글자를 한 자씩 읽어요.\n네 기둥 · 다섯 기운 · 나를 움직이는 힘");
    chartPage(ctx);
    pillarPages(ctx);
    elementPage(ctx);
    tenGodPage(ctx);
    partPage(ctx, "第 二 部", "열네 가지 운세", "삶의 마당마다 깊이 풀어 드린 운세예요.");
  } else {
    chartPage(ctx);
  }
  readings.forEach((r, i) => readingPages(ctx, r, i, full));
  if (full) {
    partPage(ctx, "第 三 部", "인생의 흐름", "10년마다 바뀌는 큰 흐름, 대운을 읽어요.");
    daeunPages(ctx);
    partPage(ctx, "第 四 部", "나를 채우는 기운", "다 좋은데 딱 하나 아쉬운 것,\n그 하나를 곁에서 채우는 방법이에요.");
  }
  fillCardPage(ctx);
  if (full) fillDetailPages(ctx);
  await endPage(ctx);

  // 쪽 번호 (표지·부를 여는 남색 쪽 제외 - 남색 쪽은 번호 없이 넘어간다)
  const range = doc.bufferedPageRange();
  for (let i = 1; i < range.count; i++) {
    doc.switchToPage(range.start + i);
    if (ctx.navy.has(range.start + i)) continue;
    const bottom = doc.page.margins.bottom;
    doc.page.margins.bottom = 0; // 아래 여백 밖에 쓰면 새 쪽이 생기지 않도록
    doc.fillColor(FAINT).fontSize(7.5).text(`${BRAND} · ${i}`, 0, H - 28, { width: W, align: "center", lineBreak: false });
    doc.page.margins.bottom = bottom;
  }
  doc.end();
  return done;
}
