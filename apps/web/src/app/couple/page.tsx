"use client";

import { useEffect, useState } from "react";
import { isAuthEnabled } from "@/lib/launchMode";
import { ComingSoon } from "@/components/ComingSoon";
import { LoadingState } from "@/components/StatusScreens";
import { CURRENCY_NAME, PRICE, formatNyang } from "@/lib/yeopjeon";

/**
 * 연인 궁합 시작 (2026-10-14 수정안 10, 19,900냥).
 *   나 = 저장한 사람 중에서 · 상대 = 저장한 사람 또는 바로 입력 → 무료 미리보기(/couple/[id]) → 19,900냥으로 긴 풀이
 */

type Profile = { id: string; name: string };
const CARD = { border: "1px solid var(--color-gold-line)", backgroundColor: "var(--color-card)" } as const;

function Body() {
  const [profiles, setProfiles] = useState<Profile[] | null>(null);
  const [me, setMe] = useState("");
  const [partner, setPartner] = useState("");
  const [input, setInput] = useState({ nickname: "", gender: "female", calendarType: "solar", date: "", time: "" });
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/profiles")
      .then((r) => {
        if (r.status === 401) {
          window.location.replace(`/login?next=${encodeURIComponent("/couple")}`);
          return null;
        }
        return r.ok ? r.json() : null;
      })
      .then((b) => {
        if (!b) return;
        const list: Profile[] = (b.profiles ?? []).map((p: Profile) => ({ id: p.id, name: p.name }));
        setProfiles(list);
        if (list[0]) setMe(list[0].id);
      })
      .catch(() => setProfiles([]));
  }, []);

  if (profiles === null) return <LoadingState message="불러오고 있어요..." />;

  const typing = partner === "new";
  const ready = me && (typing ? input.nickname.trim() && /^\d{4}-\d{2}-\d{2}$/.test(input.date) : partner) && consent;

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/couple", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          me: { profileId: me },
          partner: typing ? { input: { ...input, nickname: input.nickname.trim(), time: input.time || undefined } } : { profileId: partner },
          consent,
        }),
      });
      const body = await r.json().catch(() => ({}));
      if (r.ok) window.location.href = `/couple/${body.id}`;
      else setError(body?.error?.message ?? "잠시 후 다시 시도해 주세요.");
    } catch {
      setError("연결이 끊겼어요. 다시 눌러 주세요.");
    }
    setBusy(false);
  }

  return (
    <main className="mx-auto min-h-screen max-w-xl px-5 pb-20 pt-12 sm:pt-16">
      <header className="mb-8 text-center">
        <div className="gold-ornament" aria-hidden>
          <i />
        </div>
        <h1 className="mt-3 text-[26px] font-bold" style={{ fontFamily: "var(--font-serif)" }}>
          연인 궁합
        </h1>
        <p className="mt-2 text-[14px] leading-relaxed" style={{ color: "var(--color-ink-soft)" }}>
          두 사람의 사주로 서로 끌리는 힘, 부딪히는 자리, 채워 주는 기운을 풀어 드려요.
          <br />
          궁합 점수와 항목별 미리보기는 무료예요.
        </p>
      </header>

      {profiles.length === 0 ? (
        <section className="rounded-2xl p-5 text-center" style={CARD}>
          <p className="text-[15px]">먼저 내 사주를 저장해 주세요.</p>
          <a href="/start" className="btn-primary mt-4 block">
            내 사주 넣고 저장하기
          </a>
        </section>
      ) : (
        <section className="space-y-5 rounded-2xl p-5" style={CARD}>
          <div>
            <label className="mb-1.5 block text-sm font-medium" htmlFor="c-me">
              나
            </label>
            <select id="c-me" value={me} onChange={(e) => setMe(e.target.value)} className="field-input">
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium" htmlFor="c-partner">
              상대
            </label>
            <select id="c-partner" value={partner} onChange={(e) => setPartner(e.target.value)} className="field-input">
              <option value="">골라 주세요</option>
              {profiles
                .filter((p) => p.id !== me)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              <option value="new">새로 입력하기</option>
            </select>
          </div>
          {typing && (
            <div className="space-y-3 rounded-xl p-4" style={{ backgroundColor: "var(--color-paper-soft)" }}>
              <input className="field-input" placeholder="상대 이름" value={input.nickname} maxLength={20} onChange={(e) => setInput({ ...input, nickname: e.target.value })} />
              <div className="grid grid-cols-2 gap-2">
                {(["female", "male"] as const).map((g) => (
                  <button key={g} type="button" onClick={() => setInput({ ...input, gender: g })} className="rounded-xl py-2.5 text-[14px] font-semibold" style={{ border: input.gender === g ? "2px solid var(--color-accent)" : "1px solid var(--color-line)" }}>
                    {g === "female" ? "여성(女)" : "남성(男)"}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {(["solar", "lunar"] as const).map((c) => (
                  <button key={c} type="button" onClick={() => setInput({ ...input, calendarType: c })} className="rounded-xl py-2.5 text-[14px] font-semibold" style={{ border: input.calendarType === c ? "2px solid var(--color-accent)" : "1px solid var(--color-line)" }}>
                    {c === "solar" ? "양력" : "음력"}
                  </button>
                ))}
              </div>
              <label className="block text-[13px]" style={{ color: "var(--color-ink-soft)" }}>
                생년월일
                <input type="date" className="field-input mt-1" value={input.date} onChange={(e) => setInput({ ...input, date: e.target.value })} />
              </label>
              <label className="block text-[13px]" style={{ color: "var(--color-ink-soft)" }}>
                태어난 시간 (모르면 비워 두세요)
                <input type="time" className="field-input mt-1" value={input.time} onChange={(e) => setInput({ ...input, time: e.target.value })} />
              </label>
            </div>
          )}
          <label className="flex items-start gap-2 text-[13.5px] leading-relaxed">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1 h-4 w-4 shrink-0" />
            상대방의 이름·생년월일을 궁합 풀이에 쓰는 것에 대해 상대방의 동의를 받았어요.
          </label>
          {error && (
            <p className="text-[13.5px]" style={{ color: "var(--color-danger)" }}>
              {error}
            </p>
          )}
          <button type="button" disabled={!ready || busy} onClick={submit} className="btn-primary disabled:opacity-50">
            {busy ? "두 사람의 사주를 세우고 있어요..." : "무료로 궁합 미리보기"}
          </button>
          <p className="text-center text-[12.5px]" style={{ color: "var(--color-ink-faint)" }}>
            깊은 궁합 풀이 · {CURRENCY_NAME} {formatNyang(PRICE.COUPLE)}
          </p>
        </section>
      )}
    </main>
  );
}

export default function CouplePage() {
  if (!isAuthEnabled()) return <ComingSoon title="연인 궁합" />;
  return <Body />;
}
