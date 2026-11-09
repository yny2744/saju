"use client";

import { HourPicker } from "@/components/form/HourPicker";
import { useEffect, useState } from "react";
import { useStepBack } from "@/components/room/useStepBack";
import { RoomShell } from "@/components/room/RoomShell";
import { BRAND } from "@/tenants";
import type { TaekilPurpose } from "saju-engine";
import type { TaekilResponse } from "@/server/taekil/taekilService";
import { CARD, SAVED_KEY, Select, Toggle, YEARS } from "./FunTool";

/**
 * 택일관 (2026-11-01 유샘 지시서, AI 없음, 지금은 무료) - 다른 재미관과 같은 화면 틀.
 * 목적·기간을 고르고 생년월일(다른 관에서 넣은 값이 있으면 그대로)을 넣으면 좋은 날 3~5개와 이유 한 줄.
 */

const GOLD = "var(--color-gold)";
const pad = (n: number | string) => String(n).padStart(2, "0");
const PURPOSES: Array<{ v: TaekilPurpose; label: string }> = [
  { v: "move", label: "이사" },
  { v: "wedding", label: "결혼" },
  { v: "opening", label: "개업" },
  { v: "contract", label: "계약" },
];

interface Birth {
  calendar: "solar" | "lunar";
  leap: boolean;
  y: string;
  m: string;
  d: string;
  hour: string;
}

export function TaekilTool() {
  const [purpose, setPurpose] = useState<TaekilPurpose>("move");
  const [period, setPeriod] = useState<"this" | "next">("this");
  const [form, setForm] = useState<Birth>({ calendar: "solar", leap: false, y: "", m: "", d: "", hour: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [answer, setAnswer] = useState<TaekilResponse | null>(null);
  // 2026-11-03 뒤로가기: 결과 → 입력 칸 (넣었던 값은 그대로)
  useStepBack("taekil-result", answer !== null, () => {
    setAnswer(null);
    window.scrollTo({ top: 0 });
  });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SAVED_KEY);
      if (raw) setForm((f) => ({ ...f, ...(JSON.parse(raw) as Partial<Birth>) }));
    } catch {
      /* 저장소를 못 써도 괜찮음 */
    }
  }, []);

  const set = <K extends keyof Birth>(k: K, v: Birth[K]) => setForm((f) => ({ ...f, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!form.y || !form.m || !form.d) return setError("생년월일을 모두 골라 주세요.");
    setBusy(true);
    setError(null);
    try {
      localStorage.setItem(SAVED_KEY, JSON.stringify(form));
    } catch {
      /* 무시 */
    }
    try {
      const r = await fetch("/api/taekil", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          purpose,
          period,
          calendarType: form.calendar,
          isLeapMonth: form.calendar === "lunar" && form.leap,
          date: `${form.y}-${pad(form.m)}-${pad(form.d)}`,
          time: form.hour === "" ? undefined : `${pad(form.hour)}:00`,
        }),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) setError(body?.error?.message ?? "잠시 후 다시 시도해 주세요.");
      else {
        setAnswer(body as TaekilResponse);
        setTimeout(() => document.getElementById("taekil-result")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
      }
    } catch {
      setError("연결이 끊겼어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  }

  const days = Array.from({ length: form.calendar === "lunar" ? 30 : 31 }, (_, i) => String(i + 1));

  return (
    <RoomShell
      roomKey="taekil"
      card={false}
      below={
        // 2026-11-03 관 통일: 예전 머리말은 아래로
        <p className="pb-8 text-center text-[14px] leading-relaxed" style={{ color: "var(--color-ink-soft)", wordBreak: "keep-all" }}>
          택일 · 좋은 날 고르기 - 이사·결혼·개업·계약에 맞는 날을, 내 띠와 사주에 부딪히지 않는 날 가운데에서 골라 드려요.
        </p>
      }
    >
      <form onSubmit={submit} className="space-y-4 rounded-2xl p-5" style={CARD}>
        <div>
          <p className="mb-2 text-[14px] font-semibold">무엇을 할 날인가요</p>
          <Toggle value={purpose} onChange={setPurpose} items={PURPOSES} />
        </div>
        <div>
          <p className="mb-2 text-[14px] font-semibold">언제쯤인가요</p>
          <Toggle value={period} onChange={setPeriod} items={[{ v: "this", label: "이번 달" }, { v: "next", label: "다음 달" }]} />
        </div>
        <div>
          <p className="mb-2 text-[14px] font-semibold">생년월일</p>
          <Toggle value={form.calendar} onChange={(v) => set("calendar", v)} items={[{ v: "solar", label: "양력" }, { v: "lunar", label: "음력" }]} />
          <div className="mt-2 grid grid-cols-[1.3fr_1fr_1fr] gap-2">
            <Select label="태어난 해" value={form.y} onChange={(v) => set("y", v)} options={YEARS} placeholder="년" />
            <Select label="태어난 달" value={form.m} onChange={(v) => set("m", v)} options={Array.from({ length: 12 }, (_, i) => String(i + 1))} placeholder="월" />
            <Select label="태어난 날" value={form.d} onChange={(v) => set("d", v)} options={days} placeholder="일" />
          </div>
          {form.calendar === "lunar" && (
            <label className="mt-2 flex items-center gap-2 text-[14px]">
              <input type="checkbox" checked={form.leap} onChange={(e) => set("leap", e.target.checked)} />
              윤달이에요
            </label>
          )}
        </div>
        <div>
          {/* 2026-11-09 유샘: 시간은 기본 사주 입력과 같은 버튼 방식 (몰라요/알아요 → 오전/오후 → 시), 값은 그대로 ""·"0"~"23" */}
          <HourPicker value={form.hour} onChange={(v) => set("hour", v)} idPrefix="tk-hour" />
        </div>
        <button type="submit" disabled={busy} className="btn-band block w-full rounded-xl py-4 text-[17px] font-bold disabled:opacity-60" style={{ fontFamily: "var(--font-serif)" }}>
          {busy ? "날을 고르는 중..." : "무료로 좋은 날 보기"}
        </button>
        {error && (
          <p className="rounded-xl px-4 py-3 text-center text-[14px]" style={{ backgroundColor: "var(--color-danger-soft)", color: "var(--color-danger)" }}>
            {error}
          </p>
        )}
        <p className="text-center text-[12px]" style={{ color: "var(--color-ink-faint)" }}>
          무료
        </p>
      </form>

      {answer && (
        <section id="taekil-result" className="mt-8 scroll-mt-6 rounded-2xl p-5" style={{ background: "linear-gradient(160deg, #1b2f52, #16294a)", color: "#f6ecd2", boxShadow: "inset 0 0 0 1px var(--color-gold-line)" }}>
          <p className="text-center text-[12px] tracking-[0.3em]" style={{ color: "var(--color-gold-light)" }}>
            좋은 날
          </p>
          <h2 className="mt-1 text-center text-[19px] font-bold" style={{ fontFamily: "var(--font-serif)", wordBreak: "keep-all" }}>
            {answer.year}년 {answer.month}월 · {answer.purposeName}하기 좋은 날
          </h2>
          <p className="mt-1 text-center text-[13px]" style={{ color: "rgba(246,236,210,.75)", wordBreak: "keep-all" }}>
            {answer.tti} · 내 사주에 부딪히지 않는 날 가운데에서 골랐어요
          </p>
          {answer.days.length === 0 ? (
            <p className="mt-5 rounded-xl px-4 py-4 text-center text-[14.5px]" style={{ backgroundColor: "rgba(246,236,210,0.06)" }}>
              이 기간에는 추천할 날이 없어요. 다른 달로 살펴보세요.
            </p>
          ) : (
            <ul className="mt-5 space-y-2.5">
              {answer.days.map((d) => {
                const [, mm, dd] = d.date.split("-").map(Number);
                return (
                  <li key={d.date} className="rounded-xl p-3.5" style={{ backgroundColor: "rgba(246,236,210,0.06)", border: "1px solid rgba(212,178,101,0.35)" }}>
                    <p className="flex flex-wrap items-baseline gap-x-2">
                      <span className="text-[19px] font-bold" style={{ fontFamily: "var(--font-serif)", color: "#f4e2b8" }}>
                        {mm}월 {dd}일 ({d.weekday})
                      </span>
                      <span className="text-[12.5px]" style={{ color: "rgba(246,236,210,.7)" }}>
                        {d.lunar} · {d.ganzhi}일 · 건제 {d.zhiXing}
                      </span>
                    </p>
                    <p className="mt-1 text-[14px] leading-relaxed" style={{ wordBreak: "keep-all" }}>
                      {d.reason}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
          {answer.days.length > 0 && answer.days.length < 3 && (
            <p className="mt-3 text-center text-[13px]" style={{ color: "rgba(246,236,210,.75)" }}>
              이 기간에는 추천할 날이 적어요. 다음 달도 함께 살펴보세요.
            </p>
          )}
          <p className="mt-5 border-t pt-4 text-center text-[12.5px] leading-relaxed" style={{ borderColor: "rgba(212,178,101,0.35)", color: "rgba(246,236,210,.8)", wordBreak: "keep-all" }}>
            참고용이며 중요한 일정은 전문가와 상의하세요.
          </p>
        </section>
      )}
    </RoomShell>
  );
}
