"use client";

import { useEffect, useState } from "react";
import type { TtiDay } from "@/server/ttiService";
import { BRANCHES, TTI, ttiOfYear, type Branch } from "@/lib/tti";

const GOLD = "#9a7a45";
const SAVED_KEY = "ryugyeol_my_tti";

/**
 * 띠별 운세 화면. 오늘/내일 탭 → 12띠 → 내 띠 풀이.
 * 띠 그림은 유샘이 만들어 주면 public/tti/<지지>.webp 로 넣고 TTI_IMAGE 를 켠다 (그 전에는 한자로 표시).
 */
const TTI_IMAGE = false;

function dateLabel(date: string): string {
  const [, m, d] = date.split("-").map(Number);
  // 날짜 문자열 자체의 요일 (정오 UTC로 계산해 시간대 영향을 받지 않게)
  const wd = ["일", "월", "화", "수", "목", "금", "토"][new Date(`${date}T12:00:00Z`).getUTCDay()];
  return `${m}월 ${d}일 (${wd})`;
}

export function TtiBoard({ today, tomorrow }: { today: TtiDay; tomorrow: TtiDay }) {
  const [tab, setTab] = useState<"today" | "tomorrow">("today");
  const [mine, setMine] = useState<Branch | null>(null);
  const [year, setYear] = useState("");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(SAVED_KEY);
      if (saved && (BRANCHES as readonly string[]).includes(saved)) setMine(saved as Branch);
    } catch {
      /* 저장소를 못 써도 괜찮음 */
    }
    // 저녁 6시 이후에 들어오면 내일 탭을 먼저 보여 준다
    const hourKst = (new Date().getUTCHours() + 9) % 24;
    if (hourKst >= 18) setTab("tomorrow");
  }, []);

  function choose(b: Branch) {
    setMine(b);
    try {
      localStorage.setItem(SAVED_KEY, b);
    } catch {
      /* 무시 */
    }
    setTimeout(() => document.getElementById("tti-detail")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }

  const day = tab === "today" ? today : tomorrow;
  const f = mine ? day.fortunes.find((x) => x.branch === mine) : null;
  const yearNum = Number(year);
  const yearTti = /^\d{4}$/.test(year) && yearNum >= 1900 && yearNum <= 2100 ? ttiOfYear(yearNum) : null;

  return (
    <main className="mx-auto min-h-screen max-w-xl px-5 pb-16 pt-10">
      <p className="text-center text-[13px]" style={{ color: GOLD }}>
        류결사주 · 무료
      </p>
      <h1 className="mt-1 text-center text-[26px] font-bold" style={{ fontFamily: "var(--font-serif)" }}>
        띠별 운세
      </h1>

      {/* 오늘 / 내일 */}
      <div className="mt-6 grid grid-cols-2 gap-2 rounded-2xl p-1" style={{ backgroundColor: "var(--color-paper-soft)" }}>
        {(["today", "tomorrow"] as const).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setTab(k)}
            className="rounded-xl py-3 text-[15px] font-bold"
            style={tab === k ? { backgroundColor: "#fffdf8", color: "var(--color-ink)", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" } : { color: "var(--color-ink-faint)" }}
          >
            {k === "today" ? "오늘" : "내일"}
            <span className="block text-[12px] font-normal">{dateLabel(k === "today" ? today.date : tomorrow.date)}</span>
          </button>
        ))}
      </div>
      <p className="mt-2 text-center text-[13px]" style={{ color: "var(--color-ink-faint)" }}>
        {tab === "today" ? "오늘" : "내일"}의 일진 <b style={{ fontFamily: "var(--font-serif)", color: "var(--color-ink-soft)" }}>{day.dayGanzhi}일</b>
      </p>

      {/* 12띠 */}
      <ul className="mt-5 grid grid-cols-4 gap-2">
        {TTI.map((t) => {
          const sel = mine === t.branch;
          return (
            <li key={t.branch}>
              <button
                type="button"
                onClick={() => choose(t.branch)}
                className="block w-full rounded-xl py-2.5 text-center"
                style={{ border: sel ? "2px solid var(--color-accent)" : "1px solid var(--color-line)", backgroundColor: sel ? "var(--color-accent-soft)" : "#fffdf8" }}
              >
                {TTI_IMAGE ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`/tti/${t.branch}.webp`} alt="" className="mx-auto h-11 w-11" />
                ) : (
                  <span className="block text-[24px] leading-tight" style={{ fontFamily: "var(--font-serif)", color: GOLD }}>
                    {t.hanja}
                  </span>
                )}
                <span className="block text-[13px] font-semibold">{t.animal}띠</span>
              </button>
            </li>
          );
        })}
      </ul>

      {/* 내 띠 찾기 */}
      <div className="mt-4 rounded-xl px-4 py-3" style={{ backgroundColor: "var(--color-paper-soft)" }}>
        <label className="flex items-center gap-2 text-[14px]">
          <span className="shrink-0">태어난 해</span>
          <input
            inputMode="numeric"
            maxLength={4}
            value={year}
            onChange={(e) => setYear(e.target.value.replace(/\D/g, ""))}
            placeholder="예: 1965"
            className="field-input min-w-0 flex-1"
          />
          {yearTti && (
            <button type="button" onClick={() => choose(yearTti.branch)} className="shrink-0 rounded-lg px-3 py-2 text-[13px] font-bold text-white" style={{ backgroundColor: "var(--color-accent)" }}>
              {yearTti.animal}띠 보기
            </button>
          )}
        </label>
        <p className="mt-1.5 text-[12px]" style={{ color: "var(--color-ink-faint)" }}>
          1월~2월 초(입춘 전)에 태어나셨다면 그 전해의 띠일 수 있어요.
        </p>
      </div>

      {/* 풀이 */}
      <div id="tti-detail" className="scroll-mt-4">
        {f ? (
          <section className="mt-6 rounded-2xl p-5" style={{ border: "1px solid #d8c49a", backgroundColor: "#fffdf8" }}>
            <div className="flex items-center justify-between">
              <h2 className="text-[20px] font-bold" style={{ fontFamily: "var(--font-serif)" }}>
                {f.animal}띠 <span style={{ color: GOLD }}>{f.hanja}</span>
              </h2>
              <span className="text-[16px]" aria-label={`별 ${f.stars}개`} style={{ color: GOLD }}>
                {"★".repeat(f.stars)}
                <span style={{ color: "var(--color-line)" }}>{"★".repeat(5 - f.stars)}</span>
              </span>
            </div>
            <p className="mt-1 text-[12px]" style={{ color: "var(--color-ink-faint)" }}>
              {f.relation === "평" || f.relation === "같은 띠" ? `${f.relation === "같은 띠" ? "같은 띠의 날" : "무난한 날"}` : `${day.dayGanzhi}일과 ${f.relation}`}
            </p>
            <p className="mt-3 text-[16px] leading-relaxed" style={{ fontFamily: "var(--font-serif)" }}>
              {f.total}
            </p>
            <dl className="mt-4 space-y-2 text-[14px]">
              {[
                ["재물", f.money],
                ["사람", f.people],
                ["건강", f.health],
                ["한마디", f.advice],
              ].map(([k, v]) => (
                <div key={k} className="flex gap-3">
                  <dt className="w-12 shrink-0 font-bold" style={{ color: GOLD }}>
                    {k}
                  </dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 rounded-lg px-3 py-2 text-[13px]" style={{ backgroundColor: "var(--color-paper-soft)" }}>
              행운의 색 <b>{f.luckyColor}</b> · 방향 <b>{f.luckyDirection}</b> · 숫자 <b>{f.luckyNumber}</b>
            </p>
          </section>
        ) : (
          <p className="mt-6 text-center text-[14px]" style={{ color: "var(--color-ink-soft)" }}>
            내 띠를 눌러 보세요.
          </p>
        )}
      </div>

      {/* 내 사주로 */}
      <a href="/start" className="mt-6 block rounded-2xl p-5 text-center" style={{ backgroundColor: "var(--color-accent)", color: "#fff" }}>
        <span className="block text-[17px] font-bold" style={{ fontFamily: "var(--font-serif)" }}>
          띠는 열두 가지, 사주는 한 사람뿐
        </span>
        <span className="mt-1 block text-[13px] opacity-90">내 생년월일시로 더 정확하게 · 무료 만세력 보기</span>
      </a>

      <p className="mt-6 text-center text-[11px]" style={{ color: "var(--color-ink-faint)" }}>
        띠와 그날 일진의 합·충으로 본 참고용 운세예요.
      </p>
    </main>
  );
}
