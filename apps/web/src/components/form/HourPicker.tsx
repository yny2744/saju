"use client";

import { useEffect, useState } from "react";

/**
 * 태어난 시간 고르기 (2026-11-09 유샘: 기본 사주 입력 화면(StartScreen)과 같은 버튼 방식으로 통일).
 *   몰라요 / 알아요 → 오전 / 오후 → 시 (0~23시 중 하나)
 * 값은 지금까지와 같은 문자열: "" = 모름, "0"~"23" = 그 시 정각 (계산에 넘기는 값·저장 방식은 그대로).
 * 수능대박운 무료 입력 · 2027 신년운 맛보기 · 크리스마스 연애운(솔로·커플·짧은 궁합)이 함께 쓴다.
 */
export function HourPicker({ value, onChange, idPrefix = "hp" }: { value: string; onChange: (v: string) => void; idPrefix?: string }) {
  const hourNum = value === "" ? null : Number(value);
  const [known, setKnown] = useState(value !== "");
  const [ampm, setAmpm] = useState<"am" | "pm">(hourNum !== null && hourNum >= 12 ? "pm" : "am");
  // 밖에서 값이 바뀌면 (예: 저장한 사람 불러오기, 로그인 뒤 이어서 보기) 버튼도 따라간다
  useEffect(() => {
    if (value !== "") {
      setKnown(true);
      setAmpm(Number(value) >= 12 ? "pm" : "am");
    }
  }, [value]);
  const hours = ampm === "am" ? [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] : [12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23];
  return (
    <div role="group" aria-labelledby={`${idPrefix}-label`}>
      <span id={`${idPrefix}-label`} className="mb-1.5 block text-[14px] font-bold">
        태어난 시간 (時)
      </span>
      <div className="grid grid-cols-2 gap-2">
        <Choice
          active={!known}
          onClick={() => {
            setKnown(false);
            onChange("");
          }}
        >
          몰라요
        </Choice>
        <Choice active={known} onClick={() => setKnown(true)}>
          알아요
        </Choice>
      </div>
      {known && (
        <>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {([
              ["am", "오전", "자정 ~ 낮 12시"],
              ["pm", "오후", "낮 12시 ~ 자정"],
            ] as const).map(([v, label, sub]) => (
              <Choice
                key={v}
                active={ampm === v}
                onClick={() => {
                  setAmpm(v);
                  onChange("");
                }}
              >
                <span className="block text-[16px] font-bold">{label}</span>
                <span className="block text-[11px] font-normal" style={{ color: "var(--color-ink-faint)" }}>
                  {sub}
                </span>
              </Choice>
            ))}
          </div>
          <p className="mb-2 mt-4 text-center text-sm font-medium">몇 시에 태어나셨나요?</p>
          <div className="grid grid-cols-4 gap-2">
            {hours.map((h) => (
              <Choice key={h} small active={hourNum === h} onClick={() => onChange(String(h))}>
                {h}시
              </Choice>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/** StartScreen 의 ChoiceButton 과 같은 모양 */
function Choice({ active, onClick, small, children }: { active: boolean; onClick: () => void; small?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-xl text-center ${small ? "py-2.5 text-[14px]" : "py-3 text-[15px]"} font-semibold`}
      style={{
        border: active ? "2px solid var(--color-accent)" : "1px solid var(--color-line)",
        backgroundColor: active ? "var(--color-accent-soft)" : "var(--color-paper-soft)",
        color: active ? "var(--color-accent)" : "var(--color-ink)",
      }}
    >
      {children}
    </button>
  );
}
