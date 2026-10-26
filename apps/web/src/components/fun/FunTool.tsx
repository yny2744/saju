"use client";

import { useEffect, useState } from "react";
import { BRAND } from "@/tenants";
import { ELEMENT_TOKEN, type ElementKo } from "@/lib/pillarView";
import { ELEMENT_HANJA, ELEMENT_NATURE } from "@/lib/manseView";
import { BLOOD_TYPES, FUN_KINDS, FUN_META, type BloodType, type FunKind, type FunResult } from "@/lib/fun/types";
import type { OverlayView } from "@/lib/fun/overlay";
import { GoodsPicks } from "@/components/GoodsPicks";

/**
 * 무료 묶음 화면 (2026-10-26) - 수비학·별자리·혈액형·탄생화.
 * 생년월일(양력·음력) 한 번 입력 → 무료 결과 + 사주와 겹쳐 보기(일간·부족한 기운) → 이어지는 12가지 운세.
 * 입력값은 서버에 저장하지 않는다. 같은 기기에서 다른 묶음을 볼 때 다시 입력하지 않도록 이 브라우저에만 기억한다.
 */

const GOLD = "var(--color-gold)";
const SAVED_KEY = "ryugyeol_fun_birth";
const CARD = {
  border: "1px solid var(--color-gold-line)",
  backgroundColor: "var(--color-card)",
  boxShadow: "inset 0 0 0 3px var(--color-card), inset 0 0 0 4px var(--color-gold-soft)",
} as const;
const color = (el: ElementKo) => `var(--color-element-${ELEMENT_TOKEN[el]})`;

interface Saved {
  calendar: "solar" | "lunar";
  leap: boolean;
  y: string;
  m: string;
  d: string;
  hour: string;
  blood?: BloodType;
}

interface Answer {
  solarDate: string;
  result: FunResult;
  overlay: OverlayView;
}

const NOW_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: NOW_YEAR - 1920 + 1 }, (_, i) => String(NOW_YEAR - i));
const pad = (n: number | string) => String(n).padStart(2, "0");

function Select({ value, onChange, options, label, placeholder }: { value: string; onChange: (v: string) => void; options: string[]; label: string; placeholder: string }) {
  return (
    <label className="block">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl px-3 py-3 text-[16px]"
        style={{ border: "1px solid var(--color-line)", backgroundColor: "var(--color-card)" }}
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

function Toggle<T extends string>({ value, onChange, items }: { value: T; onChange: (v: T) => void; items: Array<{ v: T; label: string }> }) {
  return (
    <div className="grid gap-2 rounded-2xl p-1" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))`, backgroundColor: "var(--color-paper-soft)" }}>
      {items.map((it) => (
        <button
          key={it.v}
          type="button"
          onClick={() => onChange(it.v)}
          aria-pressed={value === it.v}
          className="rounded-xl py-2.5 text-[15px] font-bold"
          style={value === it.v ? { backgroundColor: "var(--color-card)", color: "var(--color-ink)", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" } : { color: "var(--color-ink-faint)" }}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}

export function FunTool({ kind }: { kind: FunKind }) {
  const meta = FUN_META[kind];
  const [form, setForm] = useState<Saved>({ calendar: "solar", leap: false, y: "", m: "", d: "", hour: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [answer, setAnswer] = useState<Answer | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SAVED_KEY);
      if (raw) setForm((f) => ({ ...f, ...(JSON.parse(raw) as Partial<Saved>) }));
    } catch {
      /* 저장소를 못 써도 괜찮음 */
    }
  }, []);

  function set<K extends keyof Saved>(k: K, v: Saved[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!form.y || !form.m || !form.d) return setError("생년월일을 모두 골라 주세요.");
    if (kind === "blood" && !form.blood) return setError("혈액형을 골라 주세요.");
    setBusy(true);
    setError(null);
    try {
      localStorage.setItem(SAVED_KEY, JSON.stringify(form));
    } catch {
      /* 무시 */
    }
    try {
      const r = await fetch("/api/fun", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          calendarType: form.calendar,
          isLeapMonth: form.calendar === "lunar" && form.leap,
          date: `${form.y}-${pad(form.m)}-${pad(form.d)}`,
          time: form.hour === "" ? undefined : `${pad(form.hour)}:00`,
          blood: form.blood,
        }),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(body?.error?.message ?? "잠시 후 다시 시도해 주세요.");
      } else {
        setAnswer(body as Answer);
        setTimeout(() => document.getElementById("fun-result")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
      }
    } catch {
      setError("연결이 끊겼어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  }

  const days = Array.from({ length: form.calendar === "lunar" ? 30 : 31 }, (_, i) => String(i + 1));
  const hours = Array.from({ length: 24 }, (_, i) => String(i));

  return (
    <main className="mx-auto min-h-screen max-w-xl px-5 pb-16 pt-10">
      <p className="text-center text-[13px]" style={{ color: GOLD }}>
        {`${BRAND} · 무료`}
      </p>
      <h1 className="mt-1 text-center text-[26px] font-bold" style={{ fontFamily: "var(--font-serif)" }}>
        {meta.title}
      </h1>
      <p className="mt-2 text-center text-[14px]" style={{ color: "var(--color-ink-soft)", wordBreak: "keep-all" }}>
        {meta.desc}
      </p>

      <form onSubmit={submit} className="mt-7 space-y-4 rounded-2xl p-5" style={CARD}>
        {kind === "blood" && (
          <div>
            <p className="mb-2 text-[14px] font-semibold">혈액형</p>
            <div className="grid grid-cols-4 gap-2">
              {BLOOD_TYPES.map((b) => (
                <button
                  key={b}
                  type="button"
                  aria-pressed={form.blood === b}
                  onClick={() => set("blood", b)}
                  className="rounded-xl py-3 text-[17px] font-bold"
                  style={form.blood === b ? { backgroundColor: "var(--color-band)", color: "#fff", border: `1px solid ${GOLD}` } : { border: "1px solid var(--color-line)", backgroundColor: "var(--color-card)" }}
                >
                  {b}
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <p className="mb-2 text-[14px] font-semibold">생년월일</p>
          <Toggle
            value={form.calendar}
            onChange={(v) => set("calendar", v)}
            items={[
              { v: "solar", label: "양력" },
              { v: "lunar", label: "음력" },
            ]}
          />
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
          <p className="mb-2 text-[14px] font-semibold">
            태어난 시 <span className="text-[12px] font-normal" style={{ color: "var(--color-ink-faint)" }}>(몰라도 괜찮아요)</span>
          </p>
          <Select label="태어난 시" value={form.hour} onChange={(v) => set("hour", v)} options={hours} placeholder="모름" />
        </div>

        <button type="submit" disabled={busy} className="btn-band block w-full rounded-xl py-4 text-[17px] font-bold disabled:opacity-60" style={{ fontFamily: "var(--font-serif)" }}>
          {busy ? "살펴보는 중..." : `무료로 ${meta.title.split(" · ")[0]} 보기`}
        </button>
        {error && (
          <p className="rounded-xl px-4 py-3 text-center text-[14px]" style={{ backgroundColor: "var(--color-danger-soft)", color: "var(--color-danger)" }}>
            {error}
          </p>
        )}
        <p className="text-center text-[12px]" style={{ color: "var(--color-ink-faint)" }}>
          로그인 없이 무료 · 입력한 생년월일은 저장하지 않아요
        </p>
      </form>

      {answer && <FunAnswer kind={kind} answer={answer} />}

      <nav className="mt-12">
        <p className="mb-3 text-center text-[14px] font-semibold">다른 것도 무료로 보기</p>
        <div className="grid grid-cols-2 gap-2">
          {FUN_KINDS.filter((k) => k !== kind).map((k) => (
            <a key={k} href={`/fun/${k}`} className="rounded-xl px-3 py-3 text-center text-[14px] font-semibold" style={CARD}>
              {FUN_META[k].title}
            </a>
          ))}
          <a href="/start" className="rounded-xl px-3 py-3 text-center text-[14px] font-semibold" style={CARD}>
            무료 만세력
          </a>
        </div>
      </nav>
    </main>
  );
}

function FunAnswer({ kind, answer }: { kind: FunKind; answer: Answer }) {
  const { result: r, overlay: o } = answer;
  return (
    <div id="fun-result" className="scroll-mt-6">
      {/* 무료 결과 */}
      <section className="mt-8 rounded-2xl p-5" style={CARD}>
        <div className="flex items-center gap-4">
          <span
            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-[26px] font-bold"
            style={{ backgroundColor: "var(--color-band)", color: "var(--color-gold-light)", boxShadow: `0 0 0 2px ${GOLD}`, fontFamily: "var(--font-serif)" }}
          >
            {r.badge}
          </span>
          <div className="min-w-0">
            <h2 className="text-[20px] font-bold leading-snug" style={{ fontFamily: "var(--font-serif)" }}>
              {r.title}
            </h2>
            <p className="mt-0.5 text-[12px]" style={{ color: "var(--color-ink-faint)", wordBreak: "keep-all" }}>
              {r.subtitle}
            </p>
          </div>
        </div>
        <div className="mt-4 space-y-2 text-[15px] leading-relaxed">
          {r.body.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {r.tags.map((t) => (
            <span key={t} className="rounded-full px-2.5 py-0.5 text-[12px]" style={{ backgroundColor: "var(--color-paper-soft)", border: "1px solid var(--color-line)" }}>
              {t}
            </span>
          ))}
        </div>
        {r.element && r.elementNote && (
          <p className="mt-3 text-[13px]" style={{ color: "var(--color-ink-soft)" }}>
            <b style={{ color: color(r.element) }}>{ELEMENT_HANJA[r.element]}</b> {r.elementNote}
          </p>
        )}
      </section>

      {/* 사주와 겹쳐 보기 */}
      <section className="mt-5 rounded-2xl p-5" style={{ background: "linear-gradient(160deg, #1b2f52, #16294a)", color: "#f6ecd2", boxShadow: "inset 0 0 0 1px var(--color-gold-line)" }}>
        <p className="text-center text-[12px] tracking-[0.3em]" style={{ color: "var(--color-gold-light)" }}>
          사주와 겹쳐 보기
        </p>
        <p className="mt-2 text-center text-[14px]" style={{ wordBreak: "keep-all" }}>
          {FUN_META[kind].overlayLead}
        </p>

        <div className="mt-4 flex items-center gap-3">
          <span className="text-[34px] font-bold leading-none" style={{ fontFamily: "var(--font-serif)", color: "var(--color-gold-light)" }}>
            {o.dayStemHanja}
          </span>
          <span className="text-[14px]">
            나의 일간 <b>{`${o.dayStem}${o.dayElement}`}</b> · {o.dayImage}
          </span>
        </div>
        <p className="mt-2 text-[14px] leading-relaxed">{o.dayCore}</p>

        {o.relation && (
          <div className="mt-4 rounded-xl p-3" style={{ backgroundColor: "rgba(246,236,210,0.06)", border: "1px solid rgba(212,178,101,0.35)" }}>
            <p className="text-[13px] font-bold" style={{ color: "var(--color-gold-light)", wordBreak: "keep-all" }}>
              {o.relation.head}
            </p>
            <p className="mt-1 text-[14px] leading-relaxed">{o.relation.body}</p>
          </div>
        )}

        <p className="mt-4 text-[14px] leading-relaxed">{o.needLine}</p>

        {o.fillFlowers && o.fillFlowers.length > 0 && (
          <div className="mt-3 space-y-2">
            {o.fillFlowers.map((f) => (
              <div key={f.element} className="rounded-xl p-3" style={{ backgroundColor: "rgba(246,236,210,0.06)", border: "1px solid rgba(212,178,101,0.35)" }}>
                <p className="text-[12px]" style={{ color: "var(--color-gold-light)" }}>
                  나를 채우는 꽃 · {ELEMENT_NATURE[f.element]}({ELEMENT_HANJA[f.element]})
                </p>
                <p className="mt-0.5 text-[17px] font-bold" style={{ fontFamily: "var(--font-serif)" }}>
                  {f.name}
                </p>
                <p className="mt-1 text-[13px] leading-relaxed">{f.why}</p>
                <p className="mt-1 text-[12px]" style={{ color: "var(--color-gold-light)" }}>
                  {f.tip}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* 2026-10-26 굿즈 추천 - 탄생화(나를 채우는 꽃)에서만, 고객사 설정에 링크가 있을 때만 */}
        {kind === "flower" && <GoodsPicks elements={o.need.elements} tone="dark" />}

        <p className="mt-5 border-t pt-4 text-[14px] leading-relaxed" style={{ borderColor: "rgba(212,178,101,0.35)", wordBreak: "keep-all" }}>
          {o.next.line}
        </p>
        <a
          href={o.next.href}
          className="mt-3 block rounded-xl py-3.5 text-center text-[16px] font-bold"
          style={{ backgroundColor: "#f6ecd2", color: "#16294a", border: `1px solid ${GOLD}`, fontFamily: "var(--font-serif)" }}
        >
          {o.next.title} 풀이 보기
        </a>
        <a href="/start" className="mt-2 block text-center text-[13px] underline underline-offset-4" style={{ color: "var(--color-gold-light)" }}>
          내 사주 여덟 글자 전체 보기 (무료 만세력)
        </a>
      </section>
    </div>
  );
}
