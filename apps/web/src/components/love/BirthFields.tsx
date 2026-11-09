"use client";

import { HourPicker } from "@/components/form/HourPicker";

/**
 * 크리스마스 연애운 입력 칸 한 사람분 (2026-11-09 유샘 지시서): 이름 · 성별 · 생년월일(양력/음력, 윤달) · 태어난 시간(버튼 방식).
 * 솔로 · 커플(두 사람) · 짧은 궁합 상대 입력이 같이 쓴다. 모양은 수능대박운 무료 입력과 같다.
 */

export type Birth = {
  name: string;
  gender: "male" | "female" | "";
  cal: "solar" | "lunar";
  leap: boolean;
  y: string;
  m: string;
  d: string;
  hour: string;
  /** 저장한 사람을 불러왔을 때 그 사람의 시각 그대로 (분까지) - 시간을 다시 고르면 지운다 */
  time?: string;
};
export const EMPTY_BIRTH: Birth = { name: "", gender: "", cal: "solar", leap: false, y: "", m: "", d: "", hour: "" };

const NAVY = "#16213a";
const GOLD = "#d4b265";
const GOLD_L = "#f3e7c6";

const chip = (on: boolean) =>
  ({
    border: `1px solid ${on ? GOLD : "var(--color-line)"}`,
    backgroundColor: on ? NAVY : "var(--color-card)",
    color: on ? GOLD_L : "var(--color-ink)",
  }) as const;

export function BirthFields({ id, value, onChange, namePlaceholder = "예: 김하늘" }: { id: string; value: Birth; onChange: (b: Birth) => void; namePlaceholder?: string }) {
  const set = <K extends keyof Birth>(k: K, v: Birth[K]) => onChange({ ...value, [k]: v });
  return (
    <div>
      <label className="block text-[14px] font-bold" htmlFor={`${id}-name`}>
        이름
      </label>
      <input
        id={`${id}-name`}
        value={value.name}
        onChange={(e) => set("name", e.target.value)}
        maxLength={20}
        autoComplete="off"
        placeholder={namePlaceholder}
        className="mt-1.5 w-full rounded-xl px-4 py-3 text-[16px]"
        style={{ border: "1px solid var(--color-line)", backgroundColor: "var(--color-paper)" }}
      />

      <p className="mt-4 text-[14px] font-bold">성별</p>
      <div className="mt-1.5 grid grid-cols-2 gap-2">
        {([["male", "남"], ["female", "여"]] as const).map(([v, t]) => (
          <button key={v} type="button" onClick={() => set("gender", v)} aria-pressed={value.gender === v} className="rounded-xl py-3 text-[15px] font-bold" style={chip(value.gender === v)}>
            {t}
          </button>
        ))}
      </div>

      <p className="mt-4 text-[14px] font-bold">생년월일</p>
      <div className="mt-1.5 grid grid-cols-2 gap-2">
        {([["solar", "양력"], ["lunar", "음력"]] as const).map(([v, t]) => (
          <button key={v} type="button" onClick={() => set("cal", v)} aria-pressed={value.cal === v} className="rounded-xl py-2.5 text-[14px] font-bold" style={chip(value.cal === v)}>
            {t}
          </button>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-[1.4fr_1fr_1fr] gap-2">
        {(
          [
            ["y", "년 (1995)", 4],
            ["m", "월", 2],
            ["d", "일", 2],
          ] as const
        ).map(([k, ph, max]) => (
          <input
            key={k}
            id={`${id}-${k}`}
            aria-label={ph}
            value={value[k]}
            onChange={(e) => set(k, e.target.value.replace(/\D/g, "").slice(0, max))}
            inputMode="numeric"
            placeholder={ph}
            className="w-full rounded-xl px-3 py-3 text-center text-[16px]"
            style={{ border: "1px solid var(--color-line)", backgroundColor: "var(--color-paper)" }}
          />
        ))}
      </div>
      {value.cal === "lunar" && (
        <label className="mt-2 flex items-center gap-2 text-[14px]">
          <input type="checkbox" checked={value.leap} onChange={(e) => set("leap", e.target.checked)} /> 윤달에 태어났어요
        </label>
      )}

      <div className="mt-4">
        <HourPicker value={value.hour} onChange={(h) => onChange({ ...value, hour: h, time: undefined })} idPrefix={`${id}-hour`} />
      </div>
    </div>
  );
}

/** 입력 확인 (who: 커플 입력에서 "나" / "상대" 앞말) */
export function birthIssues(b: Birth, who = ""): string[] {
  const p = who ? `${who} ` : "";
  const errs: string[] = [];
  const yy = Number(b.y);
  const mm = Number(b.m);
  const dd = Number(b.d);
  if (!b.name.trim()) errs.push(`${p}이름을 넣어 주세요.`);
  if (!b.gender) errs.push(`${p}성별을 골라 주세요.`);
  if (!/^\d{4}$/.test(b.y) || yy < 1900 || yy > 2100) errs.push(`${p}태어난 해를 4자리로 넣어 주세요.`);
  if (!(mm >= 1 && mm <= 12)) errs.push(`${p}태어난 달을 1~12로 넣어 주세요.`);
  if (!(dd >= 1 && dd <= 31)) errs.push(`${p}태어난 날을 1~31로 넣어 주세요.`);
  return errs;
}

/** 무료 사주 계산 (/api/saju/analyze) → 결과 토큰. 실패하면 안내 문장 */
export async function analyzeBirth(b: Birth): Promise<{ id: string } | { issues: string[] }> {
  const pad = (n: number) => String(n).padStart(2, "0");
  const res = await fetch("/api/saju/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      nickname: b.name.trim(),
      gender: b.gender,
      calendarType: b.cal,
      isLeapMonth: b.cal === "lunar" ? b.leap : undefined,
      date: `${Number(b.y)}-${pad(Number(b.m))}-${pad(Number(b.d))}`,
      time: b.time ?? (b.hour === "" ? undefined : `${pad(Number(b.hour))}:00`),
    }),
  });
  const a = await res.json().catch(() => ({}));
  if (res.ok && a.id) return { id: a.id as string };
  return {
    issues:
      a?.error?.code === "SAJU_CALCULATION_FAILED"
        ? [`${b.name.trim() || "입력한"}님의 날짜를 계산할 수 없어요. 연·월·일(음력이면 윤달 여부)을 다시 확인해 주세요.`]
        : (a?.error?.issues ?? [a?.error?.message ?? "잠시 후 다시 시도해 주세요."]),
  };
}

/** 저장한 사람(/api/profiles) → 입력 칸 값 */
export type SavedProfile = { id: string; name: string; gender?: string; calendarType?: string; isLeapMonth?: boolean; date?: string; time?: string | null };
export function birthFromProfile(p: SavedProfile): Birth {
  const [y = "", m = "", d = ""] = (p.date ?? "").split("-");
  const h = p.time ? String(Number(p.time.split(":")[0])) : "";
  return {
    name: p.name,
    gender: p.gender === "male" || p.gender === "female" ? p.gender : "",
    cal: p.calendarType === "lunar" ? "lunar" : "solar",
    leap: !!p.isLeapMonth,
    y,
    m: m ? String(Number(m)) : "",
    d: d ? String(Number(d)) : "",
    hour: h,
    time: p.time ?? undefined,
  };
}
