"use client";

import { useEffect, useMemo, useState } from "react";
import { SURNAME_HANJA } from "@/lib/hanjaSurnames";

/**
 * 한자이름 선택 팝업 (용사주 방식 참고).
 * 이름 글자 수만큼 단계를 밟는다(1/3 → 2/3 → 3/3). 글자마다 그 소리의 한자 후보를 뜻과 함께 보여주고,
 * 첫 칸 "없음/모름"을 고르면 그 글자는 한글로 둔다. 첫 글자는 성씨 한자를 맨 앞에 보여준다.
 *
 * 사전: public/hanja/dict.json (libhangul 한자 사전, BSD 3-Clause - public/hanja/LICENSE-libhangul.txt).
 * 팝업을 처음 열 때만 내려받는다(약 180KB, 압축 전송 시 더 작음).
 */

type Dict = Record<string, Array<[string, string]>>;
let dictCache: Promise<Dict> | null = null;
function loadDict(): Promise<Dict> {
  if (!dictCache) {
    dictCache = fetch("/hanja/dict.json")
      .then((r) => {
        if (!r.ok) throw new Error("dict");
        return r.json() as Promise<Dict>;
      })
      .catch((e) => {
        dictCache = null; // 다음에 다시 시도
        throw e;
      });
  }
  return dictCache;
}

const PAGE = 11; // "없음/모름" 1칸 + 후보 11칸 = 2열 × 6줄

function isHangulSyllable(ch: string): boolean {
  const c = ch.charCodeAt(0);
  return c >= 0xac00 && c <= 0xd7a3;
}

export function HanjaPicker({
  name,
  value,
  onDone,
  onClose,
}: {
  name: string;
  value: string;
  onDone: (hanja: string) => void;
  onClose: () => void;
}) {
  const syllables = useMemo(() => [...name.trim()].filter(isHangulSyllable), [name]);
  const [dict, setDict] = useState<Dict | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [step, setStep] = useState(0);
  const [shown, setShown] = useState(PAGE);
  // 글자별 선택: 한자 한 글자, 또는 null(없음/모름)
  const [picks, setPicks] = useState<Array<string | null>>(() => {
    const prev = [...value];
    return syllables.map((_, i) => (prev.length === syllables.length && /\p{Script=Han}/u.test(prev[i]) ? prev[i] : null));
  });

  useEffect(() => {
    loadDict().then(setDict).catch(() => setLoadError(true));
  }, []);

  useEffect(() => setShown(PAGE), [step]);

  const syl = syllables[step];
  const candidates = useMemo(() => {
    if (!dict || !syl) return [] as Array<{ ch: string; label: string }>;
    const list: Array<{ ch: string; label: string }> = [];
    if (step === 0) {
      for (const ch of SURNAME_HANJA[syl] ?? []) list.push({ ch, label: `성씨 ${syl}` });
    }
    for (const [ch, meaning] of dict[syl] ?? []) {
      if (!list.some((x) => x.ch === ch)) list.push({ ch, label: meaning });
    }
    return list;
  }, [dict, syl, step]);

  if (syllables.length === 0) {
    return (
      <Sheet onClose={onClose}>
        <p className="py-6 text-center text-sm">먼저 이름을 한글로 입력해 주세요.</p>
        <button type="button" onClick={onClose} className="btn-secondary">
          닫기
        </button>
      </Sheet>
    );
  }

  const last = step === syllables.length - 1;
  const current = picks[step];

  function choose(ch: string | null) {
    setPicks((p) => p.map((v, i) => (i === step ? ch : v)));
  }

  function finish() {
    const hasHanja = picks.some((p) => p !== null);
    onDone(hasHanja ? picks.map((p, i) => p ?? syllables[i]).join("") : "");
  }

  return (
    <Sheet onClose={onClose}>
      <h2 className="text-center text-[17px] font-bold">이름 한자를 선택해 주세요</h2>
      <p className="mt-1 text-center text-xs" style={{ color: "var(--color-ink-faint)" }}>
        {step + 1} / {syllables.length}
      </p>

      {/* 지금까지 고른 글자 */}
      <div className="mt-3 flex justify-center gap-2">
        {syllables.map((s, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setStep(i)}
            className="flex h-12 w-12 items-center justify-center rounded-lg text-[24px]"
            style={{
              fontFamily: "var(--font-serif)",
              border: i === step ? "2px solid var(--color-accent)" : "1px solid var(--color-line)",
              color: picks[i] ? "var(--color-ink)" : "var(--color-ink-faint)",
              backgroundColor: "var(--color-paper)",
            }}
          >
            {picks[i] ?? s}
          </button>
        ))}
      </div>

      {/* 후보 */}
      <div className="mt-4 max-h-[46vh] overflow-y-auto">
        {loadError ? (
          <p className="py-6 text-center text-sm" style={{ color: "var(--color-accent)" }}>
            한자 사전을 불러오지 못했어요. 잠시 후 다시 열어 주세요.
          </p>
        ) : !dict ? (
          <p className="py-6 text-center text-sm" style={{ color: "var(--color-ink-faint)" }}>
            한자 사전을 불러오는 중...
          </p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2">
              <CandidateButton big={syl} small="없음 / 모름" active={current === null} onClick={() => choose(null)} />
              {candidates.slice(0, shown).map((c) => (
                <CandidateButton key={c.ch} big={c.ch} small={c.label} active={current === c.ch} serif onClick={() => choose(c.ch)} />
              ))}
            </div>
            {candidates.length > shown && (
              <button
                type="button"
                onClick={() => setShown((n) => n + PAGE + 1)}
                className="mt-2 w-full rounded-lg py-2 text-sm"
                style={{ border: "1px dashed var(--color-line)", color: "var(--color-ink-soft)" }}
              >
                한자 더 보기 ({candidates.length - shown}개 더)
              </button>
            )}
          </>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button type="button" disabled={step === 0} onClick={() => setStep((s) => s - 1)} className="btn-secondary disabled:opacity-40">
          이전
        </button>
        <button type="button" onClick={() => (last ? finish() : setStep((s) => s + 1))} className="btn-primary">
          {last ? "완료" : "다음"}
        </button>
      </div>
      <button type="button" onClick={onClose} className="mt-3 block w-full text-center text-sm" style={{ color: "var(--color-ink-faint)" }}>
        취소
      </button>
    </Sheet>
  );
}

function Sheet({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end justify-center px-3 pb-3 sm:items-center"
      style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-sm rounded-2xl p-5" style={{ backgroundColor: "var(--color-paper)" }}>
        {children}
      </div>
    </div>
  );
}

function CandidateButton({
  big,
  small,
  active,
  serif,
  onClick,
}: {
  big: string;
  small: string;
  active: boolean;
  serif?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-xl px-2 py-2.5 text-center"
      style={{
        border: active ? "2px solid var(--color-accent)" : "1px solid var(--color-line)",
        backgroundColor: active ? "var(--color-accent-soft)" : "var(--color-paper-soft)",
      }}
    >
      <div className="text-[26px] leading-tight" style={serif ? { fontFamily: "var(--font-serif)" } : undefined}>
        {big}
      </div>
      <div className="mt-0.5 truncate text-[11px]" style={{ color: "var(--color-ink-soft)" }}>
        {small}
      </div>
    </button>
  );
}
