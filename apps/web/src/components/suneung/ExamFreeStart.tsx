"use client";

import { HourPicker } from "@/components/form/HourPicker";
import { useEffect, useState } from "react";
import { useStepBack } from "@/components/room/useStepBack";
import { isAuthEnabled } from "@/lib/launchMode";
import { PRICE } from "@/lib/yeopjeon";
import { formatWon } from "@/lib/pricingList";
import type { ExamReading } from "@/lib/suneung";
import { ELEMENT_TOKEN, type ElementKo } from "@/lib/pillarView";
import { reportClientError } from "@/components/yeopjeon/useYeopjeon";
import type { SajuJson } from "saju-engine";
import { SajuPillarsCard } from "@/components/SajuPillarsCard";
import { DaeunTimeline, ElementBalance, NeededEnergySection, RelationsTable } from "@/components/ManseSections";
import { FillGauge } from "@/components/FillGauge";
import { SaleNote } from "@/components/SaleNote";
import { WritingOverlay } from "@/components/yeopjeon/WritingOverlay";
import { NARRATION_OFF } from "@/components/landing/SuneungHero";
import { neededEnergy } from "@/lib/neededEnergy";
import { daeunCells, elementShares, kstDateString, relationRows, yinYangCount } from "@/lib/manseView";

/**
 * 수능대박운 무료 미리보기 (2026-10-30 유샘) - 수능대박운 랜딩 영상 바로 아래.
 *   ① 로그인 없이 이름·성별·생년월일(·시간)을 넣으면
 *   ② 무료로: 만세력 여덟 글자·오행 비율 + "시험날 기운이 활짝 열려 있어요" 게이지 + "마지막 한 칸은 ○○ 기운으로 채워요" + 한 줄 요약
 *      (점수는 쓰지 않는다 - 수험생이 숫자로 불안해하지 않게. 마지막 한 칸 = 가장 모자란 오행 = 행운 꾸러미의 기운)
 *   ③ 나머지 풀이는 흐리게 → 카카오로 가입하면 선물 990냥으로 가볍게 보기가 바로 열린다 (/continue 가 사람을 만들고 수능대박운으로).
 *   2026-10-30 유샘 2차 순서: ① 만세력 전부(무료 만세력 화면과 같은 칸) → ② 수능대박운을 사주와 엮어 (게이지·일간과 시험날 일진·공부 체질·시험날 기운)
 *   → ③ 부족한 기운 채우기 (카카오 가입 · 오픈 행사 990냥 선물로 가볍게 보기) → ④ 깊게 보기 5,500냥 (오픈 특가)
 */

const WAIT_MS = 21000;
const WAIT_STEPS = ["만세력 여덟 글자를 펼치고 있어요", "오행의 많고 적음을 헤아리고 있어요", "시험날 일진과 견주고 있어요", "공부 체질과 시험날 기운을 쓰고 있어요", "남은 작은 빈자리의 기운을 고르고 있어요"];

type Pillar = { label: string; empty: boolean; stem: Glyph | null; branch: Glyph | null };
type Glyph = { hanja: string; hangul: string; element: ElementKo };
type Preview = {
  nickname: string;
  season: "suneung" | "pass" | "start";
  title: string;
  dday: number | null;
  summary: string;
  fill: { element: ElementKo; hanja: string; nature: string; reason: "lacking" | "weakest"; gap?: number };
  headings: string[];
  freeSections: Array<{ heading: string; body: string }>;
  lockedHeadings: string[];
  deeper: string[];
  dayMaster: { stem: string; hanja: string; element: ElementKo };
  examDay: { ganzhi: string; hanja: string; group: string; relation: string } | null;
  saju: SajuJson;
  pillars: Pillar[];
  shares: Array<{ element: ElementKo; percent: number }>;
};
type Me = { termsAgreed: boolean; isGuest?: boolean } | null;
/** 2026-11-09 카카오 로그인 다녀오는 동안 기억해 둘 입력과 결과 토큰 (이 창에서만) */
const RESUME_KEY = "ryugyeol_exam_resume";
type Resume = { resultId: string; name: string; gender: "male" | "female" | ""; cal: "solar" | "lunar"; leap: boolean; y: string; m: string; d: string; hour: string };
/** 결과 맨 아래 "다음에 볼 운세" (2026-11-09 유샘 지시서 문구 그대로) */
const NEXT_UNSE = [
  // 크리스마스 연애운 영상이 오기 전까지는 소개 카드 그림의 글자 없는 아래쪽만 (카드 글자는 1080 중 575까지)
  { title: "크리스마스 연애운", href: "/go/gunghap", image: "/cards/intro-06.webp", pos: "center 100%", zoom: 2.1 },
  { title: "2027 신년운세", href: "/go/newyear2027", image: "/rooms/newyear2027/poster.jpg", pos: "center", zoom: 1 },
  { title: "오늘의 타로", href: "/go/tarot", image: "/rooms/tarot/poster.jpg", pos: "center", zoom: 1 },
];

const NAVY = "#16213a";
const GOLD = "#d4b265";
const GOLD_L = "#f3e7c6";
const CARD = { border: "1px solid var(--color-gold-line)", backgroundColor: "var(--color-card)" } as const;
const EL = (e: ElementKo) => `var(--color-element-${ELEMENT_TOKEN[e]})`;
function birthLine(saju: SajuJson): string {
  const [y, m, d] = saju.birth.date.split("-").map(Number);
  const cal = saju.birth.calendarType === "solar" ? "양력" : "음력";
  return `${cal} ${y}년 ${m}월 ${d}일${saju.birth.time ? ` ${saju.birth.time}` : " · 시간 모름"}`;
}

export function ExamFreeStart() {
  const [name, setName] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "">("");
  const [cal, setCal] = useState<"solar" | "lunar">("solar");
  const [leap, setLeap] = useState(false);
  const [y, setY] = useState("");
  const [m, setM] = useState("");
  const [d, setD] = useState("");
  const [hour, setHour] = useState<string>("");
  const [issues, setIssues] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [resultId, setResultId] = useState<string | null>(null);
  const [pv, setPv] = useState<Preview | null>(null);
  // 2026-11-03 뒤로가기: 풀이 결과 → 입력 칸 (넣었던 값은 그대로)
  useStepBack("exam-result", pv !== null, () => {
    setPv(null);
    window.setTimeout(() => document.getElementById("exam-free")?.scrollIntoView({ block: "start" }), 30);
  });
  const [me, setMe] = useState<Me | "loading">("loading");
  // 2026-11-09 유샘: 회원은 맛보기 없이 끝까지 (full), 선물 엽전을 이미 쓴 회원은 가격을 보여 준다 (pay)
  const [full, setFull] = useState<{ personId: string; reading: ExamReading } | null>(null);
  const [pay, setPay] = useState<{ personId: string; price: number } | null>(null);
  const member = me !== "loading" && !!me && me.termsAgreed && !me.isGuest;

  useEffect(() => {
    if (!isAuthEnabled()) return setMe(null);
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : { user: null }))
      .then((b) => setMe(b.user ?? null))
      .catch(() => setMe(null));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    const errs: string[] = [];
    const yy = Number(y);
    const mm = Number(m);
    const dd = Number(d);
    if (!name.trim()) errs.push("이름을 넣어 주세요.");
    if (!gender) errs.push("성별을 골라 주세요.");
    if (!/^\d{4}$/.test(y) || yy < 1900 || yy > 2100) errs.push("태어난 해를 4자리로 넣어 주세요. (예: 2008)");
    if (!(mm >= 1 && mm <= 12)) errs.push("태어난 달을 1~12로 넣어 주세요.");
    if (!(dd >= 1 && dd <= 31)) errs.push("태어난 날을 1~31로 넣어 주세요.");
    if (errs.length) return setIssues(errs);
    setIssues([]);
    // 사주 보기를 누르면 영상 나레이션은 끄고 배경음악은 잔잔히 이어진다
    window.dispatchEvent(new Event(NARRATION_OFF));
    setBusy(true);
    const started = Date.now();
    const pad = (n: number) => String(n).padStart(2, "0");
    try {
      const res = await fetch("/api/saju/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nickname: name.trim(),
          gender,
          calendarType: cal,
          isLeapMonth: cal === "lunar" ? leap : undefined,
          date: `${yy}-${pad(mm)}-${pad(dd)}`,
          time: hour === "" ? undefined : `${pad(Number(hour))}:00`,
        }),
      });
      const a = await res.json().catch(() => ({}));
      if (!res.ok || !a.id) {
        setIssues(
          a?.error?.code === "SAJU_CALCULATION_FAILED"
            ? ["입력한 날짜를 계산할 수 없어요. 연·월·일(음력이면 윤달 여부)을 다시 확인해 주세요."]
            : (a?.error?.issues ?? [a?.error?.message ?? "잠시 후 다시 시도해 주세요."])
        );
        setBusy(false);
        return;
      }
      const p = await fetch("/api/suneung/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: a.id }),
      });
      const b = await p.json().catch(() => ({}));
      if (!p.ok) {
        setIssues([b?.error?.message ?? "잠시 후 다시 시도해 주세요."]);
        setBusy(false);
        return;
      }
      // 2026-10-30 유샘: 결과는 최소 21초 기다린 뒤 보여 준다 (계산하고 쓰는 시간 - 다른 풀이 화면과 같은 연출)
      const wait = WAIT_MS - (Date.now() - started);
      if (wait > 0) await new Promise((r) => window.setTimeout(r, wait));
      setFull(null);
      setPay(null);
      setResultId(a.id);
      setPv(b as Preview);
      window.setTimeout(() => document.getElementById("exam-free-result")?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
    } catch (err) {
      reportClientError("수능대박운 무료 미리보기", String(err));
      setIssues(["연결이 끊겼어요. 잠시 후 다시 시도해 주세요."]);
    }
    setBusy(false);
  }

  /** 로그인·약관 동의 뒤 /continue 가 이 결과로 사람을 만들고 수능대박운 화면으로 보낸다 */
  const remember = () => {
    if (!resultId) return;
    try {
      const r: Resume = { resultId, name, gender, cal, leap, y, m, d, hour };
      sessionStorage.setItem(RESUME_KEY, JSON.stringify(r));
    } catch {
      /* 못 남기면 돌아와서 다시 넣으면 된다 */
    }
  };
  const back = typeof window !== "undefined" ? `${location.pathname}?resume=1` : "/suneung?resume=1";

  // 회원이면 같은 결과를 끝까지 연다 (가입 선물 엽전으로, 이미 열었으면 그대로)
  useEffect(() => {
    if (!member || !resultId || full || pay) return;
    fetch("/api/suneung/open", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: resultId }) })
      .then((r) => (r.ok ? r.json() : null))
      .then((b) => {
        if (b?.status === "open") setFull({ personId: b.personId, reading: b.reading });
        else if (b?.status === "pay") setPay({ personId: b.personId, price: b.price });
      })
      .catch((e) => reportClientError("수능대박운 끝까지 열기", String(e)));
  }, [member, resultId, full, pay]);

  // 카카오 로그인에서 돌아오면(?resume=1) 넣었던 값과 결과를 그대로 다시 띄운다
  useEffect(() => {
    if (!new URLSearchParams(location.search).has("resume")) return;
    let r: Resume | null = null;
    try {
      r = JSON.parse(sessionStorage.getItem(RESUME_KEY) ?? "null") as Resume | null;
    } catch {
      r = null;
    }
    if (!r) return;
    setName(r.name);
    setGender(r.gender);
    setCal(r.cal);
    setLeap(r.leap);
    setY(r.y);
    setM(r.m);
    setD(r.d);
    setHour(r.hour);
    const id = r.resultId;
    fetch("/api/suneung/preview", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) })
      .then((x) => (x.ok ? x.json() : null))
      .then((b) => {
        if (!b) return; // 결과 보관 시간이 지났으면 입력 칸에 값만 채워 둔다
        setResultId(id);
        setPv(b as Preview);
        window.setTimeout(() => document.getElementById("exam-free-result")?.scrollIntoView({ block: "start" }), 120);
      })
      .catch(() => {});
  }, []);

  const chip = (on: boolean) =>
    ({
      border: `1px solid ${on ? GOLD : "var(--color-line)"}`,
      backgroundColor: on ? NAVY : "var(--color-card)",
      color: on ? GOLD_L : "var(--color-ink)",
    }) as const;

  return (
    <div>
      {busy && <WritingOverlay title={`${name.trim() || "수험생"}님의 수능대박운을 풀고 있어요`} steps={WAIT_STEPS} durationMs={WAIT_MS} />}
      {!pv && (
        <form onSubmit={submit} className="rounded-2xl p-5" style={CARD} noValidate>
          <p className="text-center text-[18px] font-bold" style={{ fontFamily: "var(--font-serif)" }}>
            무료로 시작하기
          </p>
          <p className="mt-1 text-center text-[13px]" style={{ color: "var(--color-ink-soft)", wordBreak: "keep-all" }}>
            수험생의 이름과 생년월일을 넣어 주세요. 만세력과 시험날 기운을 바로 보여 드려요.
          </p>

          <label className="mt-5 block text-[14px] font-bold" htmlFor="ef-name">
            이름
          </label>
          <input id="ef-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={20} autoComplete="off" placeholder="예: 김하늘"
            className="mt-1.5 w-full rounded-xl px-4 py-3 text-[16px]" style={{ border: "1px solid var(--color-line)", backgroundColor: "var(--color-paper)" }} />

          <p className="mt-4 text-[14px] font-bold">성별</p>
          <div className="mt-1.5 grid grid-cols-2 gap-2">
            {([["male", "남"], ["female", "여"]] as const).map(([v, t]) => (
              <button key={v} type="button" onClick={() => setGender(v)} aria-pressed={gender === v} className="rounded-xl py-3 text-[15px] font-bold" style={chip(gender === v)}>
                {t}
              </button>
            ))}
          </div>

          <p className="mt-4 text-[14px] font-bold">생년월일</p>
          <div className="mt-1.5 grid grid-cols-2 gap-2">
            {([["solar", "양력"], ["lunar", "음력"]] as const).map(([v, t]) => (
              <button key={v} type="button" onClick={() => setCal(v)} aria-pressed={cal === v} className="rounded-xl py-2.5 text-[14px] font-bold" style={chip(cal === v)}>
                {t}
              </button>
            ))}
          </div>
          <div className="mt-2 grid grid-cols-[1.4fr_1fr_1fr] gap-2">
            {(
              [
                ["ef-y", y, setY, "년 (2008)", 4],
                ["ef-m", m, setM, "월", 2],
                ["ef-d", d, setD, "일", 2],
              ] as const
            ).map(([id, v, set, ph, max]) => (
              <input key={id} id={id} aria-label={ph} value={v} onChange={(e) => set(e.target.value.replace(/\D/g, "").slice(0, max))} inputMode="numeric" placeholder={ph}
                className="w-full rounded-xl px-3 py-3 text-center text-[16px]" style={{ border: "1px solid var(--color-line)", backgroundColor: "var(--color-paper)" }} />
            ))}
          </div>
          {cal === "lunar" && (
            <label className="mt-2 flex items-center gap-2 text-[14px]">
              <input type="checkbox" checked={leap} onChange={(e) => setLeap(e.target.checked)} /> 윤달에 태어났어요
            </label>
          )}

          {/* 2026-11-09 유샘: 시간은 기본 사주 입력과 같은 버튼 방식 (몰라요/알아요 → 오전/오후 → 시) */}
          <div className="mt-4">
            <HourPicker value={hour} onChange={setHour} idPrefix="ef-hour" />
          </div>

          {issues.length > 0 && (
            <ul className="mt-4 space-y-1 rounded-xl px-4 py-3 text-[13.5px]" style={{ backgroundColor: "var(--color-gold-soft)" }} role="alert">
              {issues.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          )}

          <button type="submit" disabled={busy} className="mt-5 block w-full rounded-xl py-4 text-[17px] font-bold disabled:opacity-60"
            style={{ backgroundColor: NAVY, color: GOLD_L, border: `1px solid ${GOLD}`, fontFamily: "var(--font-serif)" }}>
            {busy ? "기운을 살피는 중..." : "무료로 시험날 기운 보기"}
          </button>
        </form>
      )}

      {pv && (
        <div id="exam-free-result" className="scroll-mt-4">
          {/* ① 만세력 - 전부 무료 (무료 만세력 화면과 같은 칸) */}
          <section className="rounded-2xl p-5" style={CARD}>
            <p className="text-[12px] tracking-[0.2em]" style={{ color: GOLD }}>
              무료 만세력
            </p>
            <h2 className="mt-1 text-[22px] font-bold" style={{ fontFamily: "var(--font-serif)" }}>
              {pv.nickname}님의 만세력
            </h2>
            <p className="mt-1 text-[13px]" style={{ color: "var(--color-ink-soft)" }}>
              {birthLine(pv.saju)}
            </p>
            <div className="mt-4">
              <SajuPillarsCard saju={pv.saju} />
            </div>
          </section>
          <div className="mt-6">
            <ElementBalance
              shares={elementShares(pv.saju)}
              dominant={pv.saju.elements.summary.dominant as ElementKo}
              lacking={pv.saju.elements.summary.lacking as ElementKo[]}
              yinYang={yinYangCount(pv.saju)}
            />
            <NeededEnergySection need={neededEnergy(pv.saju)} />
            <RelationsTable rows={relationRows(pv.saju)} />
            <DaeunTimeline
              cells={daeunCells(pv.saju, kstDateString())}
              seun={{ year: pv.saju.seun.year, stem: pv.saju.seun.pillar.stem, branch: pv.saju.seun.pillar.branch, tenGod: pv.saju.seun.tenGod }}
            />
          </div>

          {/* ② 수능대박운 - 회원은 처음부터 끝까지, 비회원은 첫 부분(공부 체질)까지 (2026-11-09 유샘) */}
          {full ? (
            <>
              <section className="mt-2 rounded-2xl px-5 py-6 text-center" style={{ backgroundColor: NAVY, border: `1px solid ${GOLD}` }}>
                <p className="text-[13px] tracking-[0.2em]" style={{ color: GOLD }}>
                  {pv.title}
                  {pv.dday !== null ? ` · 수능 ${pv.dday === 0 ? "D-DAY" : `D-${pv.dday}`}` : ""}
                </p>
                <h2 className="mt-1 text-[24px] font-bold" style={{ fontFamily: "var(--font-serif)", color: GOLD_L }}>
                  {pv.nickname}님의 {pv.season === "suneung" ? "시험날 기운" : pv.title}
                </h2>
                <div className="mt-5">
                  <FillGauge elements={[pv.fill.element]} gap={pv.fill.gap} tone="dark" showLine={false} />
                </div>
                <p className="mt-4 text-[19px] font-bold" style={{ color: GOLD_L, fontFamily: "var(--font-serif)" }}>
                  {pv.season === "suneung" ? "시험날 기운이 활짝 열려 있어요" : "나아갈 기운이 활짝 열려 있어요"}
                </p>
                <p className="mx-auto mt-4 max-w-[30em] text-[14px] leading-relaxed" style={{ color: GOLD_L, opacity: 0.92, wordBreak: "keep-all" }}>
                  {pv.nickname}님의 일간은 {pv.dayMaster.hanja}({pv.dayMaster.stem}) {pv.dayMaster.element}
                  {pv.examDay ? `, 11월 19일 ${pv.examDay.hanja}(${pv.examDay.ganzhi})일은 나에게 ${pv.examDay.group}의 날이에요.` : "이에요."}
                  <br />
                  {pv.summary}
                </p>
              </section>
              <div className="mt-4 space-y-4">
                {full.reading.sections.map((sec) => (
                  <section key={sec.heading} className="rounded-2xl p-5" style={CARD}>
                    <h3 className="text-[17px] font-bold" style={{ fontFamily: "var(--font-serif)" }}>
                      {sec.heading}
                    </h3>
                    <p className="mt-2 text-[15px] leading-[1.85]" style={{ color: "var(--color-ink-soft)", wordBreak: "keep-all" }}>
                      {sec.body}
                    </p>
                  </section>
                ))}
              </div>
              {/* 행운 꾸러미 */}
              <section className="mt-4 rounded-2xl p-5" style={{ backgroundColor: NAVY, border: `1px solid ${GOLD}` }}>
                <p className="text-center text-[17px] font-bold" style={{ fontFamily: "var(--font-serif)", color: GOLD_L }}>
                  남은 작은 빈자리 채우기 · {full.reading.kit.nature}({full.reading.kit.hanja})의 기운
                </p>
                <div className="mt-4">
                  <FillGauge elements={[full.reading.kit.element]} gap={full.reading.kit.gap} tone="dark" showLine={false} />
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2 text-center text-[13.5px]">
                  {[
                    ["색", full.reading.kit.colors],
                    ["숫자", full.reading.kit.numbers],
                    ["방위", full.reading.kit.direction],
                    ["주머니 속", full.reading.kit.pocket],
                  ].map(([k, v]) => (
                    <div key={k} className="rounded-xl px-2 py-3" style={{ backgroundColor: "rgba(243,231,198,0.08)", border: "1px solid rgba(212,178,101,0.4)" }}>
                      <p style={{ color: GOLD }}>{k}</p>
                      <p className="mt-1 font-bold" style={{ color: GOLD_L }}>
                        {v}
                      </p>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-center text-[13px]" style={{ color: GOLD_L }}>
                  <span className="inline-block h-2.5 w-2.5 rounded-full align-middle" style={{ backgroundColor: `var(--color-element-${ELEMENT_TOKEN[full.reading.kit.element]})` }} /> 쉬는 시간엔 {full.reading.kit.snack}
                </p>
              </section>
              {full.reading.mind && (
                <section className="mt-4 rounded-2xl px-5 py-6 text-center" style={CARD}>
                  <p className="text-[13px]" style={{ color: GOLD }}>
                    마음 한 줄
                  </p>
                  <p className="mt-2 text-[18px] font-bold leading-snug" style={{ fontFamily: "var(--font-serif)" }}>
                    “{full.reading.mind}”
                  </p>
                </section>
              )}

              {/* 깊게 보기 - 유료는 처음부터 가격을 분명히 */}
              <section className="mt-4 rounded-2xl p-5" style={CARD}>
                <p className="text-center text-[12px] tracking-[0.2em]" style={{ color: GOLD }}>
                  깊게 보기
                </p>
                <p className="mt-1 text-center text-[19px] font-bold" style={{ fontFamily: "var(--font-serif)" }}>
                  {pv.title} 깊게 보기 · {formatWon(PRICE.EXAM_DEEP)}
                </p>
                <SaleNote k="EXAM_DEEP" unit="원" />
                <ul className="mx-auto mt-3 max-w-xs space-y-1.5 text-[14.5px]">
                  {pv.deeper.map((dp) => (
                    <li key={dp} className="flex gap-2">
                      <span style={{ color: GOLD }}>◆</span>
                      <span>{dp}</span>
                    </li>
                  ))}
                </ul>
                <a href={`/person/${encodeURIComponent(full.personId)}/exam`} className="btn-primary mt-4 block text-center">
                  깊게 보기 · {formatWon(PRICE.EXAM_DEEP)}
                </a>
              </section>
            </>
          ) : (
            <>
              <div className="mt-2 space-y-4">
                {pv.freeSections.map((sec) => (
                  <section key={sec.heading} className="rounded-2xl p-5" style={CARD}>
                    <h3 className="text-[17px] font-bold" style={{ fontFamily: "var(--font-serif)" }}>
                      {sec.heading}
                    </h3>
                    <p className="mt-2 text-[15px] leading-[1.85]" style={{ color: "var(--color-ink-soft)", wordBreak: "keep-all" }}>
                      {sec.body}
                    </p>
                  </section>
                ))}
              </div>
              <section className="mt-4 rounded-2xl p-5" style={{ ...CARD, boxShadow: `0 0 0 2px ${GOLD} inset` }}>
                <ul className="space-y-3">
                  {[...pv.lockedHeadings, "마음 한 줄"].map((h) => (
                    <li key={h}>
                      <p className="text-[14.5px] font-bold">{h}</p>
                      <p className="mt-1 select-none text-[13.5px] leading-relaxed" aria-hidden="true" style={{ filter: "blur(5px)", color: "var(--color-ink-soft)" }}>
                        {pv.nickname}님의 기운은 이 날 이렇게 흐르고, 이렇게 채우면 한결 단단해져요. 색과 숫자와 작은 물건까지 담았어요.
                      </p>
                    </li>
                  ))}
                </ul>
                <div className="mt-5">
                  {me === "loading" ? (
                    <div className="h-[56px]" />
                  ) : !isAuthEnabled() ? (
                    <p className="text-center text-[13px]" style={{ color: "var(--color-ink-faint)" }}>
                      곧 열려요
                    </p>
                  ) : pay ? (
                    // 선물을 이미 쓴 회원 - 가격을 분명히
                    <a href={`/person/${encodeURIComponent(pay.personId)}/exam`} className="btn-primary block text-center">
                      가볍게 보기 · {formatWon(pay.price)}
                    </a>
                  ) : member ? (
                    <div className="h-[56px]" />
                  ) : me && !me.isGuest && !me.termsAgreed ? (
                    <a href={`/consent?next=${encodeURIComponent(back)}`} onClick={remember} className="btn-primary block text-center">
                      카카오로 로그인하면 시험날 기운과 행운 꾸러미까지 무료로 볼 수 있어요
                    </a>
                  ) : (
                    <a href={`/api/auth/kakao/start?next=${encodeURIComponent(back)}`} onClick={remember} className="block rounded-xl px-3 py-4 text-center text-[16px] font-bold leading-snug" style={{ backgroundColor: "#fee500", color: "#191600", wordBreak: "keep-all" }}>
                      카카오로 로그인하면 시험날 기운과 행운 꾸러미까지 무료로 볼 수 있어요
                    </a>
                  )}
                </div>
              </section>
            </>
          )}

          {/* 다음에 볼 운세 (2026-11-09 유샘) */}
          <section className="mt-6">
            <h3 className="text-center text-[18px] font-bold" style={{ fontFamily: "var(--font-serif)" }}>
              다음에 볼 운세
            </h3>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {NEXT_UNSE.map((n) => (
                <a key={n.href} href={n.href} className="block overflow-hidden rounded-xl" style={CARD}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- 다음 운세 카드 그림 */}
                  <div className="aspect-square w-full overflow-hidden">
                    <img src={n.image} alt="" className="h-full w-full object-cover" style={{ objectPosition: n.pos, transform: n.zoom > 1 ? `scale(${n.zoom})` : undefined, transformOrigin: "center bottom" }} />
                  </div>
                  <p className="px-1 py-2 text-center text-[13px] font-bold leading-snug" style={{ wordBreak: "keep-all" }}>
                    {n.title}
                  </p>
                </a>
              ))}
            </div>
          </section>

          <button type="button" onClick={() => setPv(null)} className="mx-auto mt-4 block text-[13px] underline underline-offset-4" style={{ color: "var(--color-ink-faint)" }}>
            다른 사람으로 다시 보기
          </button>
        </div>
      )}
    </div>
  );
}
