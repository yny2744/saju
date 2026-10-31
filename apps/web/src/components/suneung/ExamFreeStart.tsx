"use client";

import { useEffect, useState } from "react";
import { isAuthEnabled } from "@/lib/launchMode";
import { CONTINUE_PATH, savePendingIntent } from "@/lib/intent";
import { CURRENCY_NAME, PRICE, WELCOME_GIFT, formatNyang } from "@/lib/yeopjeon";
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
type Me = { termsAgreed: boolean } | null;

const NAVY = "#16213a";
const GOLD = "#d4b265";
const GOLD_L = "#f3e7c6";
const CARD = { border: "1px solid var(--color-gold-line)", backgroundColor: "var(--color-card)" } as const;
const EL = (e: ElementKo) => `var(--color-element-${ELEMENT_TOKEN[e]})`;
const HOURS = Array.from({ length: 24 }, (_, h) => h);
function birthLine(saju: SajuJson): string {
  const [y, m, d] = saju.birth.date.split("-").map(Number);
  const cal = saju.birth.calendarType === "solar" ? "양력" : "음력";
  return `${cal} ${y}년 ${m}월 ${d}일${saju.birth.time ? ` ${saju.birth.time}` : " · 시간 모름"}`;
}
const hourLabel = (h: number) => `${h < 12 ? "오전" : "오후"} ${h % 12 === 0 ? 12 : h % 12}시`;

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
  const [me, setMe] = useState<Me | "loading">("loading");

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
    if (resultId) savePendingIntent(resultId, { kind: "exam" });
  };

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
            로그인 없이 무료로 보기
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

          <label className="mt-4 block text-[14px] font-bold" htmlFor="ef-hour">
            태어난 시간 <span className="font-normal" style={{ color: "var(--color-ink-faint)" }}>(몰라도 돼요)</span>
          </label>
          <select id="ef-hour" value={hour} onChange={(e) => setHour(e.target.value)} className="mt-1.5 w-full rounded-xl px-4 py-3 text-[16px]"
            style={{ border: "1px solid var(--color-line)", backgroundColor: "var(--color-paper)" }}>
            <option value="">몰라요</option>
            {HOURS.map((h) => (
              <option key={h} value={h}>
                {hourLabel(h)}
              </option>
            ))}
          </select>

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

          {/* ② 수능대박운 - 사주와 엮어서 (무료) */}
          <section className="mt-2 rounded-2xl px-5 py-6 text-center" style={{ backgroundColor: NAVY, border: `1px solid ${GOLD}` }}>
            <p className="text-[13px] tracking-[0.2em]" style={{ color: GOLD }}>
              {pv.title}
              {pv.dday !== null ? ` · 수능 ${pv.dday === 0 ? "D-DAY" : `D-${pv.dday}`}` : ""}
            </p>
            <h2 className="mt-1 text-[24px] font-bold" style={{ fontFamily: "var(--font-serif)", color: GOLD_L }}>
              {pv.nickname}님의 {pv.season === "suneung" ? "시험날 기운" : pv.title}
            </h2>
            {/* 2026-10-31 유샘: "남은 작은 빈자리" 게이지 - 여섯 칸이 차오르고 마지막 칸은 절반쯤, 빈 곳은 필요한 기운 색으로 숨 쉰다 */}
            <div className="mt-5">
              <FillGauge elements={[pv.fill.element]} gap={pv.fill.gap} tone="dark" showLine={false} />
            </div>
            <p className="mt-4 text-[19px] font-bold" style={{ color: GOLD_L, fontFamily: "var(--font-serif)" }}>
              {pv.season === "suneung" ? "시험날 기운이 활짝 열려 있어요" : "나아갈 기운이 활짝 열려 있어요"}
            </p>
            <p className="mt-1.5 text-[16px]" style={{ color: GOLD_L, wordBreak: "keep-all" }}>
              남은 작은 빈자리는{" "}
              <b style={{ color: "#fff" }}>
                {pv.fill.nature}({pv.fill.hanja})의 기운
              </b>
              으로 채워요
            </p>
            <p className="mx-auto mt-4 max-w-[30em] text-[14px] leading-relaxed" style={{ color: GOLD_L, opacity: 0.92, wordBreak: "keep-all" }}>
              {pv.nickname}님의 일간은 {pv.dayMaster.hanja}({pv.dayMaster.stem}) {pv.dayMaster.element}
              {pv.examDay ? `, 11월 19일 ${pv.examDay.hanja}(${pv.examDay.ganzhi})일은 나에게 ${pv.examDay.group}의 날이에요.` : "이에요."}
              <br />
              {pv.summary}
            </p>
          </section>
          <div className="mt-4 space-y-4">
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

          {/* ③ 남은 작은 빈자리 채우기 - 가입하면 오픈 행사 선물 990냥으로 (2026-10-31 말투 통일) */}
          <section className="mt-4 rounded-2xl p-5" style={{ ...CARD, boxShadow: `0 0 0 2px ${GOLD} inset` }}>
            <p className="text-center text-[12px] tracking-[0.2em]" style={{ color: GOLD }}>
              가볍게 보기
            </p>
            <p className="mt-1 text-center text-[19px] font-bold" style={{ fontFamily: "var(--font-serif)" }}>
              남은 작은 빈자리 채우기 · {pv.fill.nature}({pv.fill.hanja})
            </p>
            <ul className="mt-4 space-y-3">
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
              <p className="mb-3 text-center">
                <span className="inline-block rounded-full px-3 py-1 text-[12.5px] font-bold" style={{ backgroundColor: "var(--color-danger)", color: "#fff" }}>
                  오픈 행사 · 가입하면 {CURRENCY_NAME} {formatNyang(WELCOME_GIFT)} 선물
                </span>
              </p>
              {me === "loading" ? (
                <div className="h-[56px]" />
              ) : !isAuthEnabled() ? (
                <p className="text-center text-[13px]" style={{ color: "var(--color-ink-faint)" }}>
                  곧 열려요
                </p>
              ) : !me ? (
                <>
                  <a href={`/api/auth/kakao/start?next=${encodeURIComponent(CONTINUE_PATH)}`} onClick={remember} className="block rounded-xl py-4 text-center text-[17px] font-bold" style={{ backgroundColor: "#fee500", color: "#191600" }}>
                    카카오로 가입하고 무료로 채우기
                  </a>
                  <p className="mt-2 text-center text-[13px]" style={{ color: "var(--color-ink-soft)", wordBreak: "keep-all" }}>
                    선물 {formatNyang(WELCOME_GIFT)}으로 가볍게 보기({formatNyang(PRICE.EXAM)})가 바로 열려요
                  </p>
                  <a href={`/login?next=${encodeURIComponent(CONTINUE_PATH)}`} onClick={remember} className="mt-1 block text-center text-[12px] underline underline-offset-4" style={{ color: "var(--color-ink-faint)" }}>
                    이메일로 로그인하기
                  </a>
                </>
              ) : !me.termsAgreed ? (
                <a href={`/consent?next=${encodeURIComponent(CONTINUE_PATH)}`} onClick={remember} className="btn-primary block text-center">
                  약관 동의하고 채우기
                </a>
              ) : (
                <a href={CONTINUE_PATH} onClick={remember} className="btn-primary block text-center">
                  남은 작은 빈자리 채우기 · 가볍게 보기 {formatNyang(PRICE.EXAM)}
                </a>
              )}
            </div>
          </section>

          {/* ④ 깊게 보기 5,500냥 - 오픈 특가 */}
          <section className="mt-4 rounded-2xl p-5" style={CARD}>
            <p className="text-center text-[12px] tracking-[0.2em]" style={{ color: GOLD }}>
              깊게 보기
            </p>
            <p className="mt-1 text-center text-[19px] font-bold" style={{ fontFamily: "var(--font-serif)" }}>
              {pv.title} 깊게 보기 · {formatNyang(PRICE.EXAM_DEEP)}
            </p>
            <SaleNote k="EXAM_DEEP" />
            <ul className="mx-auto mt-3 max-w-xs space-y-1.5 text-[14.5px]">
              {pv.deeper.map((d) => (
                <li key={d} className="flex gap-2">
                  <span style={{ color: GOLD }}>◆</span>
                  <span>{d}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-center text-[12.5px] leading-relaxed" style={{ color: "var(--color-ink-soft)", wordBreak: "keep-all" }}>
              가입 뒤 수능대박운 화면에서 과목(계열·수학·탐구)을 고르면 그에 맞춰 풀어 드려요. 결제는 보호자께 부탁할 수 있어요.
            </p>
          </section>

          <button type="button" onClick={() => setPv(null)} className="mx-auto mt-4 block text-[13px] underline underline-offset-4" style={{ color: "var(--color-ink-faint)" }}>
            다른 사람으로 다시 보기
          </button>
        </div>
      )}
    </div>
  );
}
