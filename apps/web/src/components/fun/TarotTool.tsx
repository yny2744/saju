"use client";

import { useEffect, useState } from "react";
import { BRAND } from "@/tenants";
import { ELEMENT_HANJA } from "@/lib/manseView";
import {
  TAROT_CARDS,
  TAROT_MODES,
  TAROT_QUESTIONS,
  TAROT_STORAGE_KEY,
  isTarotSaved,
  normalizeTarotSaved,
  kstToday,
  shuffleDeck,
  spreadLine,
  type TarotMode,
  type TarotQuestion,
  type TarotSaved,
} from "@/lib/fun/tarot";
import { TarotCard, TAROT_CARD_CSS } from "./TarotCard";
import { TarotWheel, TarotReels, SPIN_CSS } from "./TarotSpin";
import { FunTool } from "./FunTool";

/**
 * 타로관 화면 (2026-10-31 유샘) - 질문 → 뽑는 방식(수레바퀴·카드 고르기·세 줄 두루마리, 처음엔 수레바퀴) → 결과 → 사주와 겹쳐 보기.
 * 신뢰 원칙: 섞는 순간(기기 안의 암호 난수) 순서가 정해지고, 내가 멈추거나 고른 칸의 카드가 그대로 나오며, 22장을 모두 보여 준다.
 * 하루 한 번: 뽑은 결과(방식·섞인 순서·자리)를 이 기기에 저장해 두고 오늘 다시 오면 그대로 보여 준다. 서버에는 저장하지 않는다.
 * 색: 옻칠 · 금박 · 자개 (TarotCard.tsx TAROT_LUX_CSS).
 */

const GOLD = "var(--color-gold)";
const CARD = {
  border: "1px solid var(--color-gold-line)",
  backgroundColor: "var(--color-card)",
  boxShadow: "inset 0 0 0 3px var(--color-card), inset 0 0 0 4px var(--color-gold-soft)",
} as const;

const CSS = `${TAROT_CARD_CSS}${SPIN_CSS}
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

/** 아직 섞기 전 - 순서는 의미가 없다 (섞는 순간 새로 정해진다) */
const UNSHUFFLED = TAROT_CARDS.map((c) => c.no);

const POSITION_LABELS = ["과거", "현재", "미래"];

export function TarotTool() {
  const [mode, setMode] = useState<TarotMode>("wheel");
  const [question, setQuestion] = useState<TarotQuestion | null>(null);
  const [deck, setDeck] = useState<number[] | null>(null);
  const [shuffles, setShuffles] = useState(0);
  /** 결과 자리 (카드 고르기: 고른 자리, 수레바퀴: 멈춘 칸, 세 줄: 현재 줄의 자리) */
  const [picked, setPicked] = useState<number | null>(null);
  const [spread, setSpread] = useState<Array<number | null>>([null, null, null]);
  const [spinning, setSpinning] = useState(false);
  const [stopSignal, setStopSignal] = useState(0);
  const [revealAll, setRevealAll] = useState(false);
  const [already, setAlready] = useState(false);

  // 오늘 이미 뽑았으면 그 결과를 그대로 (하루 한 번)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(TAROT_STORAGE_KEY);
      const saved: unknown = raw ? JSON.parse(raw) : null;
      if (isTarotSaved(saved, kstToday())) {
        const s = normalizeTarotSaved(saved);
        setMode(s.mode);
        setQuestion(s.question);
        setDeck(s.deck);
        setPicked(s.picked);
        if (s.spread) setSpread(s.spread);
        setRevealAll(true);
        setAlready(true);
      }
    } catch {
      /* 저장소를 못 쓰면 새로 뽑는다 */
    }
  }, []);

  const finished = mode === "reels" ? spread.every((v) => v !== null) : picked !== null;
  const started = spinning || finished || shuffles > 0;

  function save(s: Omit<TarotSaved, "date">) {
    try {
      localStorage.setItem(TAROT_STORAGE_KEY, JSON.stringify({ date: kstToday(), ...s }));
    } catch {
      /* 저장을 못 해도 결과는 보여 준다 */
    }
  }

  function scrollToResult(delay: number) {
    window.setTimeout(() => document.getElementById("tarot-result")?.scrollIntoView({ behavior: "smooth", block: "start" }), delay);
  }

  /* 카드 고르기 */
  function shuffle() {
    if (picked !== null) return;
    setDeck(shuffleDeck(cryptoRand));
    setShuffles((n) => n + 1);
  }
  function pick(slot: number) {
    if (!deck || !question || picked !== null) return;
    setPicked(slot);
    save({ mode: "pick", question, deck, picked: slot });
    window.setTimeout(() => setRevealAll(true), 900);
    scrollToResult(2600);
  }

  /* 수레바퀴 · 세 줄 두루마리: 돌리기 = 섞기 + 돌기 시작 */
  function spin() {
    if (spinning || finished) return;
    setDeck(shuffleDeck(cryptoRand));
    setSpinning(true);
  }
  function wheelStopped(slot: number) {
    if (!deck || !question) return;
    setSpinning(false);
    setPicked(slot);
    setRevealAll(true);
    save({ mode: "wheel", question, deck, picked: slot });
    scrollToResult(1200);
  }
  function reelStopped(reel: number, slot: number) {
    setSpread((prev) => prev.map((v, i) => (i === reel ? slot : v)));
  }
  // 세 줄이 모두 멈추면 결과를 저장하고 22장을 공개한다
  useEffect(() => {
    if (already || mode !== "reels" || picked !== null || !deck || !question || !spread.every((v) => v !== null)) return;
    setSpinning(false);
    setPicked(spread[1]);
    save({ mode: "reels", question, deck, picked: spread[1] as number, spread: spread as number[] });
    window.setTimeout(() => setRevealAll(true), 500);
    scrollToResult(1800);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spread]);

  const shown = deck ?? UNSHUFFLED;
  const card = deck && picked !== null ? TAROT_CARDS[deck[picked]] : null;
  const q = TAROT_QUESTIONS.find((x) => x.key === question);
  const done = finished && revealAll;

  const status = already
    ? "오늘 뽑은 카드예요. 22장이 모두 그대로 보여요."
    : mode === "wheel"
      ? picked !== null
        ? "금빛 화살표가 멈춘 칸의 카드예요. 바퀴의 22장이 모두 그대로 보여요."
        : spinning
          ? "원하는 순간에 멈춤을 누르세요."
          : "바퀴를 돌린 뒤, 원하는 순간에 멈추세요."
      : mode === "reels"
        ? finished
          ? "세 줄이 모두 멈췄어요. 아래에 세 줄에 들어 있던 22장을 모두 보여 드려요."
          : spinning
            ? "줄마다 원하는 순간에 멈춤을 누르세요."
            : "두루마리를 돌린 뒤, 과거 · 현재 · 미래 줄을 하나씩 멈추세요."
        : picked !== null
          ? revealAll
            ? "나머지 21장도 모두 뒤집었어요. 다른 자리를 골랐다면 그 카드가 나왔을 거예요."
            : "고른 카드를 뒤집는 중이에요..."
          : deck
            ? "마음 가는 한 장을 고르세요."
            : "먼저 카드를 섞어 주세요.";

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
        내가 직접 멈추거나 골라서 정하는 카드. 정한 뒤에는 22장을 모두 보여 드려요.
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
                disabled={started}
                aria-pressed={question === x.key}
                onClick={() => setQuestion(x.key)}
                className="lux-tab rounded-xl px-2 py-3 text-[15px] font-bold disabled:opacity-60"
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

      {question && (
        <>
          {/* ② 뽑는 방식 - 고객이 고른다 (처음엔 수레바퀴) */}
          {!already && (
            <div className="mt-5 grid grid-cols-3 gap-1.5" role="group" aria-label="뽑는 방식">
              {TAROT_MODES.map((m) => (
                <button
                  key={m.key}
                  type="button"
                  disabled={started}
                  aria-pressed={mode === m.key}
                  onClick={() => setMode(m.key)}
                  className="lux-tab rounded-xl px-1 py-2.5 text-[13.5px] font-bold disabled:opacity-60"
                  title={m.desc}
                >
                  {m.label}
                </button>
              ))}
            </div>
          )}

          {/* ③ 뽑기 */}
          <section className="lux-panel mt-3 rounded-2xl px-3 py-4">
            <p className="lux-note mb-3 text-center text-[14px]" style={{ wordBreak: "keep-all" }}>
              {status}
            </p>

            {mode === "wheel" && (
              <>
                <TarotWheel deck={shown} spinning={spinning} stopSignal={stopSignal} stoppedSlot={already ? picked : null} onStopped={wheelStopped} />
                {!already && picked === null && (
                  <div className="mt-4 flex justify-center">
                    <button
                      type="button"
                      onClick={() => (spinning ? setStopSignal((n) => n + 1) : spin())}
                      className="lux-btn rounded-full px-12 py-3 text-[17px] font-bold"
                      style={{ fontFamily: "var(--font-serif)" }}
                    >
                      {spinning ? "멈춤" : "바퀴 돌리기"}
                    </button>
                  </div>
                )}
              </>
            )}

            {mode === "reels" && (
              <>
                <TarotReels deck={shown} spinning={spinning} stopped={already ? spread : [null, null, null]} onStopped={reelStopped} />
                {!already && !spinning && !finished && (
                  <div className="mt-4 flex justify-center">
                    <button type="button" onClick={spin} className="lux-btn rounded-full px-10 py-3 text-[16px] font-bold" style={{ fontFamily: "var(--font-serif)" }}>
                      두루마리 돌리기
                    </button>
                  </div>
                )}
              </>
            )}

            {(mode === "pick" || (mode === "reels" && done)) && (
              <div key={shuffles} className={`tt-row${mode === "reels" ? " mt-5" : ""}${mode === "pick" && deck && picked === null && shuffles > 0 ? " tt-shuf" : ""}`}>
                {shown.map((no, slot) => {
                  const isPicked = mode === "reels" ? spread.includes(slot) : picked === slot;
                  const flipped = isPicked || revealAll;
                  return (
                    <TarotCard
                      key={slot}
                      no={no}
                      size={9}
                      flipped={flipped}
                      picked={isPicked}
                      dim={revealAll && !isPicked}
                      delayMs={revealAll && !isPicked && !already && mode === "pick" ? slot * 55 : 0}
                      label={flipped ? `${slot + 1}번째 자리 · ${TAROT_CARDS[no].name}` : `${slot + 1}번째 카드`}
                      onClick={mode === "pick" && deck && picked === null ? () => pick(slot) : undefined}
                      shuffleVars={{ dx: ((slot * 37) % 21) - 10, dy: ((slot * 53) % 17) - 8, r: ((slot * 29) % 13) - 6 }}
                    />
                  );
                })}
              </div>
            )}
            {mode === "pick" && !already && picked === null && (
              <div className="mt-4 flex justify-center">
                <button type="button" onClick={shuffle} className="lux-btn rounded-full px-10 py-3 text-[16px] font-bold" style={{ fontFamily: "var(--font-serif)" }}>
                  {deck ? "다시 섞기" : "카드 섞기"}
                </button>
              </div>
            )}

            <p className="lux-note mt-3 text-center text-[11.5px] leading-relaxed" style={{ wordBreak: "keep-all" }}>
              카드 순서는 섞는 순간 이 기기 안에서 정해지고, 내가 멈추거나 고른 칸의 카드가 그대로 나와요. 정한 뒤에는 22장을 모두 보여 드려요.
            </p>
          </section>
        </>
      )}

      {/* ④ 풀이 */}
      {done && card && q && deck && (
        <section id="tarot-result" className="mt-6 scroll-mt-6 rounded-2xl p-5" style={CARD}>
          {mode === "reels" ? (
            <>
              <div className="grid grid-cols-3 gap-3">
                {spread.map((slot, i) => (
                  <div key={i} className="text-center">
                    <p className="mb-1.5 text-[12.5px] font-bold" style={{ color: GOLD, letterSpacing: ".2em" }}>
                      {POSITION_LABELS[i]}
                    </p>
                    <TarotCard no={deck[slot as number]} size={12} flipped picked={i === 1} />
                  </div>
                ))}
              </div>
              <div className="mt-5 space-y-4">
                {spread.map((slot, i) => {
                  const line = spreadLine(deck[slot as number], i as 0 | 1 | 2, q.key);
                  return (
                    <div key={i}>
                      <p className="text-[15px] font-bold" style={{ fontFamily: "var(--font-serif)" }}>
                        {line.head}
                      </p>
                      <p className="mt-1 text-[14px] leading-relaxed" style={{ color: "var(--color-ink-soft)", wordBreak: "keep-all" }}>
                        {line.body}
                      </p>
                    </div>
                  );
                })}
              </div>
              <p className="mt-4 text-[12.5px]" style={{ color: "var(--color-ink-faint)" }}>
                {q.label} · 사주와 겹쳐 보기는 「현재」 카드로 봐요.
              </p>
            </>
          ) : (
            <>
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
                <b>{ELEMENT_HANJA[card.element]}</b> {`${card.name} 카드는 ${card.elementWhy}의 기운이에요.`}
              </p>
            </>
          )}
          <p className="mt-4 rounded-xl px-3 py-2.5 text-center text-[12.5px] leading-relaxed" style={{ backgroundColor: "var(--color-paper-soft)", color: "var(--color-ink-soft)", wordBreak: "keep-all" }}>
            오늘의 카드는 이 기기에 저장돼요. 내일 다시 뽑아 보세요.
            <br />
            타로는 마음을 비춰 보는 재미로 보는 이야기예요.
          </p>
        </section>
      )}

      {/* ⑤ 사주와 겹쳐 보기 - 무료 묶음 화면을 그대로 쓴다 (세 줄은 현재 카드) */}
      {done && card && q && <FunTool kind="tarot" tarot={{ card: card.no, question: q.key }} />}
    </main>
  );
}
