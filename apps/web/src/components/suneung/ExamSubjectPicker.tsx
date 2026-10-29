"use client";

import { useState } from "react";
import { EXAM_MATH, EXAM_TRACKS, inquiryOptions, type ExamProfile, type ExamTrack } from "@/lib/examProfile";

/**
 * 깊게 보기 전에 과목 고르기 (2026-10-30 유샘) - 버튼만, 건너뛰기 가능.
 *   계열 → 수학 선택 → 탐구 두 과목 (예체능은 실기 여부). 고른 값은 AI 깊게 보기에 반영된다.
 */
const NAVY = "#16213a";
const GOLD = "#d4b265";
const GOLD_L = "#f3e7c6";

export function ExamSubjectPicker({ onDone, onClose }: { onDone: (p: ExamProfile | null) => void; onClose: () => void }) {
  const [track, setTrack] = useState<ExamTrack | null>(null);
  const [math, setMath] = useState<ExamProfile["math"]>(null);
  const [inquiry, setInquiry] = useState<string[]>([]);
  const [practical, setPractical] = useState(false);

  const chip = (on: boolean) =>
    ({
      border: `1px solid ${on ? GOLD : "var(--color-line)"}`,
      backgroundColor: on ? NAVY : "var(--color-card)",
      color: on ? GOLD_L : "var(--color-ink)",
    }) as const;

  const toggleInquiry = (s: string) =>
    setInquiry((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : cur.length >= 2 ? [cur[1], s] : [...cur, s]));

  const done = () => onDone(track ? { track, math, inquiry, practical: track === "예체능" && practical } : null);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" style={{ backgroundColor: "rgba(10,14,26,.6)" }} role="dialog" aria-modal="true" aria-labelledby="esp-h" onClick={onClose}>
      <div className="max-h-[88dvh] w-full max-w-md overflow-y-auto rounded-t-3xl px-5 pb-6 pt-5 sm:rounded-3xl" style={{ backgroundColor: "var(--color-paper)" }} onClick={(e) => e.stopPropagation()}>
        <p id="esp-h" className="text-center text-[19px] font-bold" style={{ fontFamily: "var(--font-serif)" }}>
          어떤 과목을 보나요?
        </p>
        <p className="mt-1 text-center text-[13px]" style={{ color: "var(--color-ink-soft)", wordBreak: "keep-all" }}>
          고른 과목에 맞춰 공부 리듬과 교시마다 기운을 풀어 드려요. 몰라도 건너뛸 수 있어요.
        </p>

        <p className="mt-5 text-[14px] font-bold">① 계열</p>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {EXAM_TRACKS.map((t) => (
            <button key={t} type="button" aria-pressed={track === t} onClick={() => { setTrack(t); setInquiry([]); }} className="rounded-xl py-3 text-[15px] font-bold" style={chip(track === t)}>
              {t}
            </button>
          ))}
        </div>

        {track && (
          <>
            <p className="mt-5 text-[14px] font-bold">② 수학 선택</p>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {EXAM_MATH.map((mm) => (
                <button key={mm} type="button" aria-pressed={math === mm} onClick={() => setMath(math === mm ? null : mm)} className="rounded-xl py-3 text-[14px] font-bold" style={chip(math === mm)}>
                  {mm}
                </button>
              ))}
            </div>

            <p className="mt-5 text-[14px] font-bold">
              ③ 탐구 두 과목 <span className="font-normal" style={{ color: "var(--color-ink-faint)" }}>({inquiry.length}/2)</span>
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {inquiryOptions(track).map((s) => (
                <button key={s} type="button" aria-pressed={inquiry.includes(s)} onClick={() => toggleInquiry(s)} className="rounded-full px-3.5 py-2 text-[13.5px] font-bold" style={chip(inquiry.includes(s))}>
                  {s}
                </button>
              ))}
            </div>

            {track === "예체능" && (
              <>
                <p className="mt-5 text-[14px] font-bold">④ 수능 뒤 실기 시험도 보나요?</p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {([[true, "네, 실기도 봐요"], [false, "아니요"]] as const).map(([v, t]) => (
                    <button key={t} type="button" aria-pressed={practical === v} onClick={() => setPractical(v)} className="rounded-xl py-3 text-[14px] font-bold" style={chip(practical === v)}>
                      {t}
                    </button>
                  ))}
                </div>
              </>
            )}
          </>
        )}

        <button type="button" onClick={done} disabled={!track} className="mt-6 block w-full rounded-xl py-4 text-[16px] font-bold disabled:opacity-40" style={{ backgroundColor: NAVY, color: GOLD_L, border: `1px solid ${GOLD}` }}>
          이 과목으로 깊게 보기
        </button>
        <button type="button" onClick={() => onDone(null)} className="mt-2 block w-full py-2 text-center text-[13.5px] underline underline-offset-4" style={{ color: "var(--color-ink-soft)" }}>
          건너뛰기
        </button>
      </div>
    </div>
  );
}
