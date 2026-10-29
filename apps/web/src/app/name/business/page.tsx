"use client";


import { BRAND, josa } from "@/tenants";
import { SaleNote } from "@/components/SaleNote";
import { useEffect, useState } from "react";
import { HanjaPicker } from "@/components/HanjaPicker";
import { BusinessChars, BusinessFacts, BUSINESS_VERDICT } from "@/components/BusinessReadingCard";
import { INDUSTRIES, businessSyllables, type BusinessReading } from "@/lib/businessName";
import { CURRENCY_NAME, PRICE, formatNyang } from "@/lib/yeopjeon";
import { isAuthEnabled } from "@/lib/launchMode";

/**
 * 무료 상호 풀이 (2026-10-13 수정안 63) - 엔진만 (AI 없음).
 *   상호(한글) · 한자(선택) · 업종 · 대표자(로그인하면 저장한 사람 중에서, 선택) → 업종 오행 · 소리 흐름 · 총획 수리 · 사주 어울림
 */

const CARD = { border: "1px solid var(--color-gold-line)", backgroundColor: "var(--color-card)" } as const;
type Profile = { id: string; name: string };

export default function BusinessReadingPage() {
  const [name, setName] = useState("");
  const [hanja, setHanja] = useState("");
  const [industry, setIndustry] = useState("");
  const [profiles, setProfiles] = useState<Profile[] | null>(null);
  const [profileId, setProfileId] = useState("");
  const [picker, setPicker] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ reading: BusinessReading; who: string | null } | null>(null);

  useEffect(() => {
    if (!isAuthEnabled()) return;
    fetch("/api/profiles")
      .then((r) => (r.ok ? r.json() : null))
      .then((b) => setProfiles(b?.profiles?.map((p: Profile) => ({ id: p.id, name: p.name })) ?? null))
      .catch(() => setProfiles(null));
  }, []);

  const syl = businessSyllables(name);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (syl.length < 1) return setError("상호를 한글로 넣어 주세요.");
    setBusy(true);
    try {
      const r = await fetch("/api/name/business", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, hanja: hanja || undefined, industry: industry || undefined, profileId: profileId || undefined }),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) setError(body?.error?.message ?? "잠시 후 다시 시도해 주세요.");
      else {
        setResult(body);
        setTimeout(() => document.getElementById("business-result")?.scrollIntoView({ behavior: "smooth" }), 50);
      }
    } catch {
      setError("연결이 끊겼어요. 다시 눌러 주세요.");
    }
    setBusy(false);
  }

  const r = result?.reading;
  return (
    <main className="mx-auto min-h-screen max-w-xl px-5 pb-20 pt-12 sm:pt-16">
      <header className="mb-8 text-center">
        <div className="gold-ornament" aria-hidden>
          <i />
        </div>
        <h1 className="mt-3 text-[26px] font-bold leading-snug" style={{ fontFamily: "var(--font-serif)" }}>
          상호 풀이
        </h1>
        <p className="mt-2 text-[14px] leading-relaxed" style={{ color: "var(--color-ink-soft)" }}>
          가게·회사 이름이 업종의 기운과 맞는지 무료로 풀어 드려요.
        </p>
      </header>

      <form onSubmit={submit} className="space-y-5 rounded-2xl p-5" style={CARD}>
        <div>
          <label className="mb-1.5 block text-sm font-medium" htmlFor="biz-name">
            상호 (한글)
          </label>
          <input
            id="biz-name"
            value={name}
            maxLength={30}
            onChange={(e) => {
              setName(e.target.value);
              setHanja("");
            }}
            className="field-input"
            placeholder="예: 다온 (식당·카페 같은 업종 말은 빼고)"
          />
        </div>
        <div>
          <p className="mb-1.5 text-sm font-medium">
            한자 상호 <span style={{ color: "var(--color-ink-faint)" }}>(선택)</span>
          </p>
          <button type="button" disabled={syl.length < 1} onClick={() => setPicker(true)} className="field-input w-full text-left disabled:opacity-50" style={{ fontFamily: "var(--font-serif)" }}>
            {hanja || "한자로 쓰는 상호면 눌러서 골라 주세요"}
          </button>
          <p className="mt-1.5 text-xs" style={{ color: "var(--color-ink-faint)" }}>
            한자 상호면 모든 글자 획수를 더한 총획 수리까지 봐요.
          </p>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium" htmlFor="biz-industry">
            업종
          </label>
          <select id="biz-industry" value={industry} onChange={(e) => setIndustry(e.target.value)} className="field-input">
            <option value="">업종을 골라 주세요 (선택)</option>
            {INDUSTRIES.map((x) => (
              <option key={x.key} value={x.key}>
                {x.label}
              </option>
            ))}
          </select>
        </div>
        {profiles && profiles.length > 0 && (
          <div>
            <label className="mb-1.5 block text-sm font-medium" htmlFor="biz-owner">
              대표자 사주 <span style={{ color: "var(--color-ink-faint)" }}>(선택)</span>
            </label>
            <select id="biz-owner" value={profileId} onChange={(e) => setProfileId(e.target.value)} className="field-input">
              <option value="">고르지 않기</option>
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        )}
        {error && (
          <p className="text-[13.5px]" style={{ color: "var(--color-danger)" }}>
            {error}
          </p>
        )}
        <button type="submit" disabled={busy} className="btn-primary disabled:opacity-50">
          {busy ? "풀고 있어요..." : "무료로 상호 풀이 보기"}
        </button>
      </form>

      {r && (
        <section id="business-result" className="mt-8 scroll-mt-6 space-y-5 rounded-2xl p-5" style={CARD}>
          <div className="text-center">
            <p className="text-[12px] font-semibold" style={{ color: "var(--color-gold)" }}>
              {result?.who ? `${result.who} 대표님의 상호` : "상호 풀이"}
            </p>
            <h2 className="mt-1 text-[28px] font-bold" style={{ fontFamily: "var(--font-serif)" }}>
              {r.name}
              {r.hanja && <span className="ml-2 text-[22px]">{r.hanja}</span>}
            </h2>
          </div>
          <BusinessChars r={r} />
          <div className="rounded-xl px-4 py-3 text-center" style={{ backgroundColor: "var(--color-gold-soft)" }}>
            <p className="text-[17px] font-bold" style={{ fontFamily: "var(--font-serif)" }}>
              {BUSINESS_VERDICT[r.verdict].label}
            </p>
            <p className="mt-1 text-[13.5px]" style={{ color: "var(--color-ink-soft)" }}>
              {BUSINESS_VERDICT[r.verdict].text}
            </p>
          </div>
          <BusinessFacts r={r} />
          {!r.industry && (
            <p className="text-[13px]" style={{ color: "var(--color-ink-faint)" }}>
              업종을 고르면 상호 소리가 업종의 기운과 맞는지도 볼 수 있어요.
            </p>
          )}
          <p className="text-[12.5px] leading-relaxed" style={{ color: "var(--color-ink-faint)" }}>
            같은 이름이 상표로 등록돼 있는지는 {josa(BRAND, "이/가")} 확인하지 못해요.{" "}
            <a href="https://www.kipris.or.kr" target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">
              특허청 키프리스
            </a>
            에서 꼭 찾아보세요.
          </p>
        </section>
      )}

      <section className="mt-8 rounded-2xl p-5 text-center" style={CARD}>
        <p className="text-[17px] font-bold" style={{ fontFamily: "var(--font-serif)" }}>
          새 상호가 필요하세요?
        </p>
        <p className="mt-1.5 text-[13.5px] leading-relaxed" style={{ color: "var(--color-ink-soft)" }}>
          대표자 사주와 업종 오행을 함께 맞춘 상호 후보 7개 · 상호 작명서 PDF
        </p>
        <a href="/go?name=business" className="btn-primary mt-4 block text-center">
          상호 작명 받기 · {CURRENCY_NAME} {formatNyang(PRICE.BUSINESS)}
        </a>
        <SaleNote k="BUSINESS" />
        <a href="/name" className="mt-4 block text-[13px] underline underline-offset-4" style={{ color: "var(--color-ink-faint)" }}>
          이름 풀이 · 개명 · 작명으로
        </a>
      </section>

      {picker && (
        <HanjaPicker
          name={syl.join("")}
          value={hanja}
          onClose={() => setPicker(false)}
          onDone={(h) => {
            setHanja(h);
            setPicker(false);
          }}
        />
      )}
    </main>
  );
}
