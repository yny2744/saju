"use client";

import { useEffect, useState } from "react";
import { BRAND } from "@/tenants";
import { ELEMENT_HANJA, ELEMENT_NATURE } from "@/lib/manseView";
import {
  TAROT_CARDS,
  TAROT_QUESTIONS,
  TAROT_STORAGE_KEY,
  isTarotSaved,
  kstToday,
  shuffleDeck,
  type TarotQuestion,
  type TarotSaved,
} from "@/lib/fun/tarot";
import { TarotCard, TAROT_CARD_CSS } from "./TarotCard";
import { FunTool } from "./FunTool";

/**
 * 타로관 화면 (2026-10-31 유샘) - 질문 고르기 → 섞기 → 22장 중 한 장 고르기 → 고른 카드 → 나머지 21장 모두 공개 → 사주와 겹쳐 보기.
 * 신뢰 원칙: 섞는 순간(기기 안의 암호 난수) 순서가 정해지고, 고른 자리의 카드가 그대로 나오며, 나머지도 제자리에서 모두 뒤집는다.
 * 하루 한 번: 뽑은 결과(섞인 순서·고른 자리)를 이 기기에 저장해 두고 오늘 다시 오면 그대로 보여 준다. 서버에는 저장하지 않는다.
 */

const GOLD = "var(--color-gold)";
const CARD = {
  border: "1px solid var(--color-gold-line)",
  backgroundColor: "var(--color-card)",
  boxShadow: "inset 0 0 0 3px var(--color-card), inset 0 0 0 4px var(--color-gold-soft)",
} as const;

const CSS = `${TAROT_CARD_CSS}
.tt-row{display:flex;flex-wrap:wrap;justify-content:center;gap:6px}
.tt-row>.tc{width:calc((100% - 30px) / 6)}
.tt-shuf>.tc{animation:tt-shuf .75s ease-in-out both}
@keyframes tt-shuf{0%{transform:none}35%{transform:translate(var(--dx),var(--dy)) rotate(var(--r))}70%{transform:translate(calc(var(--dx) * -.4),calc(var(--dy) * -.4))}100%{transform:none}}
@media (prefers-reduced-motion:reduce){.tt-shuf>.tc{animation:none}}
`;

/** 기기 안의 암호 난수 [0,1) - 서버가 카드를 고르지 않는다 */
function cryptoRand(): number {
  const a = new Uint32Array(1);
  crypto.getRandomValues(a);
  return a[0] / 2 ** 32;
}

/** 아직 섞기 전 - 뒷면만 보이므로 순서는 의미가 없다 */
const UNSHUFFLED = TAROT_CARDS.map((c) => c.no);

export function TarotTool() {
  const [question, setQuestion] = useState<TarotQuestion | null>(null);
  const [deck, setDeck] = useState<number[] | null>(null);
  const [shuffles, setShuffles] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [revealAll, setRevealAll] = useState(false);
  const [already, setAlready] = useState(false);

  // 오늘 이미 뽑았으면 그 결과를 그대로 (하루 한 번)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(TAROT_STORAGE_KEY);
      const saved: unknown = raw ? JSON.parse(raw) : null;
      if (isTarotSaved(saved, kstToday())) {
        setQuestion(saved.question);
        setDeck(saved.deck);
        setPicked(saved.picked);
        setRevealAll(true);
        setAlready(true);
      }
    } catch {
      /* 저장소를 못 쓰면 새로 뽑는다 */
    }
  }, []);

  function shuffle() {
    if (picked !== null) return;
    setDeck(shuffleDeck(cryptoRand));
    setShuffles((n) => n + 1);
  }

  function pick(slot: number) {
    if (!deck || !question || picked !== null) return;
    setPicked(slot);
    const saved: TarotSaved = { date: kstToday(), question, deck, picked: slot };
    try {
      localStorage.setItem(TAROT_STORAGE_KEY, JSON.stringify(saved));
    } catch {
      /* 저장을 못 해도 결과는 보여 준다 */
    }
    window.setTimeout(() => setRevealAll(true), 900);
    window.setTimeout(() => document.getElementById("tarot-result")?.scrollIntoView({ behavior: "smooth", block: "start" }), 2600);
  }

  const shown = deck ?? UNSHUFFLED;
  const card = deck && picked !== null ? TAROT_CARDS[deck[picked]] : null;
  const q = TAROT_QUESTIONS.find((x) => x.key === question);

  return (
    <main className="mx-auto min-h-screen max-w-xl px-5 pb-16 pt-10">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <p className="text-center text-[13px]" style={{ color: GOLD }}>
        {`${BRAND} · 무료`}
      </p>
      <h1 className="mt-1 text-center text-[26px] font-bold" style={{ fontFamily: "var(--font-serif)" }}>
        타로 · 오늘의 한 장
      </h1>
      <p className="mt-2 text-center text-[14px]" style={{ color: "var(--color-ink-soft)", wordBreak: "keep-all" }}>
        22장 가운데 마음 가는 한 장을 직접 고르세요. 고른 뒤에는 나머지 21장도 모두 뒤집어 보여 드려요.
      </p>

      {/* ① 질문 */}
      {!already && (
        <section className="mt-7 rounded-2xl p-5" style={CARD}>
          <p className="mb-3 text-[14px] font-semibold">무엇이 궁금하세요?</p>
          <div className="grid grid-cols-2 gap-2">
            {TAROT_QUESTIONS.map((x) => (
              <button
                key={x.key}
                type="button"
                disabled={picked !== null}
                aria-pressed={question === x.key}
                onClick={() => setQuestion(x.key)}
                className="rounded-xl px-2 py-3 text-[15px] font-bold disabled:opacity-60"
                style={
                  question === x.key
                    ? { backgroundColor: "var(--color-band)", color: "#fff", border: `1px solid ${GOLD}` }
                    : { border: "1px solid var(--color-line)", backgroundColor: "var(--color-card)" }
                }
              >
                {x.label}
              </button>
            ))}
          </div>
          {q && (
            <p className="mt-3 text-center text-[14px]" style={{ color: "var(--color-ink-soft)" }}>
              「{q.ask}」 마음속으로 한 번 떠올려 보세요.
            </p>
          )}
        </section>
      )}

      {/* ② 섞기 · ③ 고르기 · ④ 모두 공개 */}
      {question && (
        <section className="mt-5 rounded-2xl p-4" style={{ background: "linear-gradient(160deg, #1b2f52, #16294a)", boxShadow: "inset 0 0 0 1px var(--color-gold-line)" }}>
          <p className="mb-3 text-center text-[14px]" style={{ color: "#f6ecd2", wordBreak: "keep-all" }}>
            {already
              ? "오늘 뽑은 카드예요. 나머지 21장도 모두 공개되어 있어요."
              : picked !== null
                ? revealAll
                  ? "나머지 21장도 모두 뒤집었어요. 다른 자리를 골랐다면 그 카드가 나왔을 거예요."
                  : "고른 카드를 뒤집는 중이에요..."
                : deck
                  ? "마음 가는 한 장을 고르세요."
                  : "먼저 카드를 섞어 주세요."}
          </p>
          <div key={shuffles} className={`tt-row${deck && picked === null && shuffles > 0 ? " tt-shuf" : ""}`}>
            {shown.map((no, slot) => {
              const isPicked = picked === slot;
              const flipped = isPicked || revealAll;
              return (
                <TarotCard
                  key={slot}
                  no={no}
                  size={9}
                  flipped={flipped}
                  picked={isPicked}
                  dim={revealAll && picked !== null && !isPicked}
                  delayMs={revealAll && !isPicked && !already ? (slot % 22) * 55 : 0}
                  label={flipped ? `${slot + 1}번째 자리 · ${TAROT_CARDS[no].name}` : `${slot + 1}번째 카드`}
                  onClick={deck && picked === null ? () => pick(slot) : undefined}
                  // 섞일 때 카드마다 다른 방향으로 흔들린다 (모양만 - 순서는 shuffleDeck 이 정한다)
                  shuffleVars={{ dx: ((slot * 37) % 21) - 10, dy: ((slot * 53) % 17) - 8, r: ((slot * 29) % 13) - 6 }}
                />
              );
            })}
          </div>
          {!already && picked === null && (
            <div className="mt-4 flex justify-center">
              <button type="button" onClick={shuffle} className="rounded-xl px-6 py-3 text-[15px] font-bold" style={{ backgroundColor: "#f6ecd2", color: "#16294a", border: `1px solid ${GOLD}`, fontFamily: "var(--font-serif)" }}>
                {deck ? "다시 섞기" : "카드 섞기"}
              </button>
            </div>
          )}
          <p className="mt-3 text-center text-[11.5px] leading-relaxed" style={{ color: "rgba(246,236,210,.7)", wordBreak: "keep-all" }}>
            카드는 섞는 순간 이 기기 안에서 순서가 정해지고, 고른 뒤에는 나머지 카드도 제자리에서 모두 공개돼요.
          </p>
        </section>
      )}

      {/* ⑤ 풀이 */}
      {card && q && revealAll && (
        <section id="tarot-result" className="mt-6 scroll-mt-6 rounded-2xl p-5" style={CARD}>
          <div className="mx-auto w-[150px]">
            <TarotCard no={card.no} size={22} flipped picked />
          </div>
          <h2 className="mt-4 text-center text-[22px] font-bold" style={{ fontFamily: "var(--font-serif)" }}>
            {`${card.roman} · ${card.name} (${card.hanja})`}
          </h2>
          <p className="mt-1 text-center text-[12.5px]" style={{ color: "var(--color-ink-faint)" }}>
            {q.label}
          </p>
          <p className="mt-4 text-[16px] font-semibold leading-relaxed" style={{ fontFamily: "var(--font-serif)", wordBreak: "keep-all" }}>
            {card.reading[q.key]}
          </p>
          <p className="mt-3 text-[14px] leading-relaxed" style={{ color: "var(--color-ink-soft)", wordBreak: "keep-all" }}>
            {card.core}
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {card.keywords.map((k) => (
              <span key={k} className="rounded-full px-2.5 py-0.5 text-[12px]" style={{ backgroundColor: "var(--color-paper-soft)", border: "1px solid var(--color-line)" }}>
                {k}
              </span>
            ))}
          </div>
          <p className="mt-3 text-[13px]" style={{ color: "var(--color-ink-soft)" }}>
            <b>{ELEMENT_HANJA[card.element]}</b> {`${card.name} 카드는 ${card.elementWhy}, ${ELEMENT_NATURE[card.element]}의 기운이에요.`}
          </p>
          <p className="mt-4 rounded-xl px-3 py-2.5 text-center text-[12.5px] leading-relaxed" style={{ backgroundColor: "var(--color-paper-soft)", color: "var(--color-ink-soft)", wordBreak: "keep-all" }}>
            오늘의 카드는 이 기기에 저장돼요. 내일 다시 한 장을 뽑아 보세요.
            <br />
            타로는 마음을 비춰 보는 재미로 보는 이야기예요.
          </p>
        </section>
      )}

      {/* ⑥ 사주와 겹쳐 보기 - 무료 묶음 화면을 그대로 쓴다 */}
      {card && q && revealAll && <FunTool kind="tarot" tarot={{ card: card.no, question: q.key }} />}
    </main>
  );
}
