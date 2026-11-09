"use client";

import { useState } from "react";
import { PRICE } from "@/lib/yeopjeon";
import { formatWon } from "@/lib/pricingList";
import { LOVE_CAL, LOVE_PAIR, lovePrice } from "@/lib/love/loveProducts";
import { reportClientError } from "@/components/yeopjeon/useYeopjeon";
import { BirthFields, EMPTY_BIRTH, analyzeBirth, birthIssues, type Birth } from "./BirthFields";

/**
 * 크리스마스 연애운 상품 사다리 (2026-11-09 유샘 지시서 3번) - 회원 결과 맨 아래, 이 순서 그대로.
 *   솔로: ① 마음에 둔 사람과 짧은 궁합 990 ② 내 연애 관상 보기 5,500(관상 심층) ③ 2027 연애 달력 9,900 "인연이 오는 달"
 *   커플: ① 다른 사람과도 짧은 궁합 990 ② 인연의 관상 보기 5,500(관상 심층 · 인연 궁합) ③ 2027 연애 달력 9,900 "두 사람의 좋은 달과 조심할 달" ④ 연인 궁합 긴 풀이 19,800
 *   그 아래 "다음에 볼 운세": 2027 신년운세 · 오늘의 타로
 * 가격은 설정(prices)에서 읽어 원으로. 엽전·냥은 화면에 쓰지 않는다.
 */

const NAVY = "#16213a";
const GOLD = "#d4b265";
const GOLD_L = "#f3e7c6";
const CARD = { border: "1px solid var(--color-gold-line)", backgroundColor: "var(--color-card)" } as const;
const CONSENT_LINE = "상대방의 이름·생년월일을 궁합 풀이에 쓰는 것에 대해 상대방의 동의를 받았어요.";

const NEXT_UNSE = [
  { title: "2027 신년운세", href: "/go/newyear2027", image: "/rooms/newyear2027/poster.jpg" },
  { title: "오늘의 타로", href: "/go/tarot", image: "/rooms/tarot/poster.jpg" },
];

const BTN = "block w-full rounded-xl px-3 py-4 text-center text-[16px] font-bold leading-snug";
const btnStyle = { backgroundColor: NAVY, color: GOLD_L, border: `1px solid ${GOLD}`, wordBreak: "keep-all" } as const;

export function LoveLadder({ kind, meId, partnerId }: { kind: "solo" | "couple"; meId: string; partnerId?: string }) {
  const [pairOpen, setPairOpen] = useState(false);
  const [partner, setPartner] = useState<Birth>(EMPTY_BIRTH);
  const [consent, setConsent] = useState(false);
  const [issues, setIssues] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const pairLabel = `${kind === "solo" ? "마음에 둔 사람과 짧은 궁합" : "다른 사람과도 짧은 궁합"} · ${formatWon(lovePrice(LOVE_PAIR))}`;
  const calHref = `/person/${encodeURIComponent(meId)}/love?show=cal${partnerId ? `&partner=${encodeURIComponent(partnerId)}` : ""}&open=1`;

  // ① 상대만 넣으면 → 사람을 만들고 짧은 궁합 화면에서 연다 (엽전이 모자라면 그 화면의 결제 창)
  async function pairSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    const errs = birthIssues(partner);
    if (!consent) errs.push("상대방의 동의를 받았는지 확인해 주세요.");
    if (errs.length) return setIssues(errs);
    setIssues([]);
    setBusy(true);
    try {
      const a = await analyzeBirth(partner);
      if ("issues" in a) {
        setIssues(a.issues);
        setBusy(false);
        return;
      }
      const r = await fetch("/api/persons", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ resultId: a.id }) });
      const b = await r.json().catch(() => ({}));
      if (!r.ok || !b.id) {
        setIssues([b?.error?.message ?? "잠시 후 다시 시도해 주세요."]);
        setBusy(false);
        return;
      }
      window.location.href = `/person/${encodeURIComponent(meId)}/love?show=pair&partner=${encodeURIComponent(b.id)}&open=1`;
    } catch (err) {
      reportClientError("짧은 궁합 상대 입력", String(err));
      setIssues(["연결이 끊겼어요. 잠시 후 다시 시도해 주세요."]);
      setBusy(false);
    }
  }

  // ④ 연인 궁합 긴 풀이 - 이 두 사람으로 궁합을 만들고 연인 궁합 화면으로
  async function coupleLong() {
    if (busy || !partnerId) return;
    setBusy(true);
    try {
      const r = await fetch("/api/couple", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ me: { personId: meId }, partner: { personId: partnerId }, consent: true }),
      });
      const b = await r.json().catch(() => ({}));
      if (r.ok && b.id) {
        window.location.href = `/couple/${encodeURIComponent(b.id)}`;
        return;
      }
      setIssues([b?.error?.message ?? "잠시 후 다시 시도해 주세요."]);
    } catch (err) {
      reportClientError("연인 궁합 긴 풀이", String(err));
      setIssues(["연결이 끊겼어요. 잠시 후 다시 시도해 주세요."]);
    }
    setBusy(false);
  }

  return (
    <>
      <section className="mt-6 space-y-4 rounded-2xl p-5" style={CARD}>
        {/* ① 짧은 궁합 */}
        <div>
          <button type="button" onClick={() => setPairOpen((v) => !v)} aria-expanded={pairOpen} className={BTN} style={btnStyle}>
            {pairLabel}
          </button>
          {pairOpen && (
            <form onSubmit={pairSubmit} className="mt-3 rounded-xl p-4" style={{ border: "1px solid var(--color-line)", backgroundColor: "var(--color-paper-soft)" }} noValidate>
              <BirthFields id="lp" value={partner} onChange={setPartner} namePlaceholder="예: 이바다" />
              <label className="mt-4 flex items-start gap-2 text-[13.5px] leading-relaxed" style={{ wordBreak: "keep-all" }}>
                <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1 h-4 w-4 shrink-0" />
                {CONSENT_LINE}
              </label>
              <button type="submit" disabled={busy} className={`${BTN} mt-4 disabled:opacity-60`} style={btnStyle}>
                {busy ? "기운을 살피는 중..." : pairLabel}
              </button>
            </form>
          )}
        </div>

        {/* ② 관상 (기존 관상 심층 풀이 · 인연 궁합) */}
        <div>
          <p className="mb-2 text-center text-[15px] leading-relaxed" style={{ wordBreak: "keep-all" }}>
            {kind === "solo" ? "사주가 말하는 인연의 길, 얼굴에도 나타나 있어요." : "사주가 맞는 두 사람, 얼굴은 어떨까요?"}
          </p>
          <a href="/face" className={BTN} style={btnStyle}>
            {kind === "solo" ? "내 연애 관상 보기" : "인연의 관상 보기"} · {formatWon(PRICE.FACE)}
          </a>
        </div>

        {/* ③ 2027 연애 달력 */}
        <div>
          <a href={calHref} className={BTN} style={btnStyle}>
            2027 연애 달력 · {formatWon(lovePrice(LOVE_CAL))}
          </a>
          <p className="mt-1.5 text-center text-[13px]" style={{ color: "var(--color-ink-soft)" }}>
            {kind === "solo" ? "인연이 오는 달" : "두 사람의 좋은 달과 조심할 달"}
          </p>
        </div>

        {/* ④ 연인 궁합 긴 풀이 (커플만) */}
        {kind === "couple" && (
          <div>
            <button type="button" onClick={coupleLong} disabled={busy} className={`${BTN} disabled:opacity-60`} style={btnStyle}>
              연인 궁합 긴 풀이 · {formatWon(PRICE.COUPLE)}
            </button>
          </div>
        )}

        {issues.length > 0 && (
          <ul className="space-y-1 rounded-xl px-4 py-3 text-[13.5px]" style={{ backgroundColor: "var(--color-gold-soft)" }} role="alert">
            {issues.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        )}
      </section>

      {/* 다음에 볼 운세 */}
      <section className="mt-6">
        <h3 className="text-center text-[18px] font-bold" style={{ fontFamily: "var(--font-serif)" }}>
          다음에 볼 운세
        </h3>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {NEXT_UNSE.map((n) => (
            <a key={n.href} href={n.href} className="block overflow-hidden rounded-xl" style={CARD}>
              <div className="aspect-video w-full overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element -- 다음 운세 카드 그림 */}
                <img src={n.image} alt="" className="h-full w-full object-cover" />
              </div>
              <p className="px-1 py-2 text-center text-[13.5px] font-bold leading-snug" style={{ wordBreak: "keep-all" }}>
                {n.title}
              </p>
            </a>
          ))}
        </div>
      </section>
    </>
  );
}
