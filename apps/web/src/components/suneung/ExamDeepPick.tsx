"use client";

import { useEffect, useState } from "react";
import { openPromo } from "@/components/promo/PromoTop";
import { DeepCards } from "@/components/suneung/DeepCards";
import { EXAM_DEEP_SUB, EXAM_EXTRA_SUB, EXAM_EXTRA_TITLE, type ExamExtraKind } from "@/lib/examProductsView";

/**
 * 랜딩 [시험날 깊게 보기] (2026-11-13 유샘 시안) - 이름 넣는 칸이 아니라 심층분석 네 가지와 묶음이 먼저 보인다.
 *   카드를 고르면 그 아래에 "누구의 풀이를 볼까요?" - 로그인했으면 저장된 수험생을 고르고, 처음이면 이름·생년월일을 넣는다.
 *   2026-11-13 유샘 확정: 저장된 사람은 내 복주머니(/api/yeopjeon)의 사람 목록에서 고른다.
 *   새 수험생이면 무료 보기 칸을 열어 이름·생년월일부터 (무료 풀이 뒤에 같은 카드가 다시 나온다).
 */
type Ex = { deep?: boolean; goal?: boolean; focus?: boolean; calm?: boolean };
type P = { id: string; nickname: string; birth: string; exam?: Ex };
/** 그 사람이 고른 상품을 이미 열었는지 - 열었으면 버튼을 "다시 보기"로 (2026-11-14 유샘) */
function ownedFor(p: P | undefined, path: string | null): boolean {
  const e = p?.exam;
  if (!e || !path) return false;
  if (path === "exam") return !!e.deep;
  if (path === "exam/x/all") return !!(e.deep && e.goal && e.focus && e.calm);
  const k = path.split("/").pop() as keyof Ex;
  return !!e[k];
}
const TITLE: Record<string, string> = { exam: "수능대박운 심층분석", "exam/x/all": "네 가지 모두 보기", ...Object.fromEntries((["goal", "focus", "calm"] as ExamExtraKind[]).map((k) => [`exam/x/${k}`, EXAM_EXTRA_TITLE[k]])) };
const SUB = (p: string) => (p === "exam" ? EXAM_DEEP_SUB : p === "exam/x/all" ? ["심층분석 1~4를 한 번에 (3+1)"] : EXAM_EXTRA_SUB[p.split("/").pop() as ExamExtraKind]);

export function ExamDeepPick() {
  const [path, setPath] = useState<string | null>(null);
  const [persons, setPersons] = useState<P[] | null>(null);
  const [login, setLogin] = useState<boolean | null>(null);
  const [pick, setPick] = useState("");

  useEffect(() => {
    fetch("/api/yeopjeon")
      .then(async (r) => {
        if (r.status === 401) return setLogin(false);
        const j = await r.json().catch(() => null);
        setLogin(true);
        const list: P[] = (j?.persons ?? []).map((x: P) => ({ id: x.id, nickname: x.nickname, birth: x.birth, exam: x.exam }));
        setPersons(list);
        if (list[0]) setPick(list[0].id);
      })
      .catch(() => setLogin(false));
  }, []);

  const chosen = (persons ?? []).find((p) => p.id === pick) ?? (persons ?? [])[0];
  const goNew = () => {
    if (!path) return;
    openPromo(0);
  };
  const go = () => {
    if (!path) return;
    if (!chosen) {
      openPromo(0);
      return;
    }
    window.location.href = `/person/${encodeURIComponent(chosen.id)}/${path}`;
  };

  return (
    <div>
      <DeepCards
        onPick={(p) => {
          setPath(p);
          window.setTimeout(() => document.getElementById("deep-who")?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
        }}
      />
      {path && (
        <section id="deep-who" className="mt-4 scroll-mt-4 rounded-2xl p-4" style={{ backgroundColor: "#fffaf0", border: "1px solid #d9c49a" }}>
          <p className="text-center text-[12px] tracking-[0.2em]" style={{ color: "#b8913f" }}>
            고른 풀이
          </p>
          <p className="mt-0.5 text-center text-[18px] font-bold" style={{ fontFamily: "var(--font-serif)" }}>
            {TITLE[path]}
          </p>
          <p className="mt-1 text-center text-[12px]" style={{ color: "var(--color-ink-soft)", wordBreak: "keep-all" }}>
            {SUB(path).join(" · ")}
          </p>
          <p className="mt-4 text-[15px] font-bold">누구의 풀이를 볼까요?</p>
          {login === false ? (
            <a href={`/login?next=${encodeURIComponent("/suneung?deep=1")}`} className="mt-2 block rounded-xl py-3 text-center text-[15px] font-bold" style={{ backgroundColor: "#fee500", color: "#191600" }}>
              카카오로 로그인하고 고르기
            </a>
          ) : (
            <>
              {/* 2026-11-14 유샘: 버튼에 고른 이름이 들어가고, 새 수험생은 아래 버튼으로 따로 */}
              {(persons ?? []).length > 0 && (
                <>
                  <select value={pick === "new" ? (persons ?? [])[0]?.id : pick} onChange={(e) => setPick(e.target.value)} className="mt-2 w-full rounded-lg border px-3 py-2.5 text-[15px]" style={{ borderColor: "#d9c49a" }}>
                    {(persons ?? []).map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nickname} · {p.birth}
                      </option>
                    ))}
                  </select>
                  <button type="button" onClick={go} disabled={login === null || !chosen} className="btn-primary mt-3 disabled:opacity-50">
                    {chosen ? `${chosen.nickname}님 풀이 ${ownedFor(chosen, path) ? "다시 보기" : "보기"}` : "풀이 보기"}
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={goNew}
                disabled={login === null}
                className={(persons ?? []).length > 0 ? "mt-2.5 block w-full rounded-xl py-3 text-center text-[15px] font-bold disabled:opacity-50" : "btn-primary mt-2 disabled:opacity-50"}
                style={(persons ?? []).length > 0 ? { border: "1.5px solid #13203f", color: "#13203f", backgroundColor: "#fff" } : undefined}
              >
                + 다른 수험생 넣기
              </button>
            </>
          )}
          <p className="mt-2 text-center text-[11.5px]" style={{ color: "var(--color-ink-faint)", wordBreak: "keep-all" }}>
            결제는 보호자(지인)께 부탁드려요.
          </p>
        </section>
      )}
    </div>
  );
}
