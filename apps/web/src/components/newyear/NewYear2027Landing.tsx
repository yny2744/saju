"use client";

import { HourPicker } from "@/components/form/HourPicker";
import { useEffect, useRef, useState } from "react";
import type { SajuJson } from "saju-engine";
import { isAuthEnabled } from "@/lib/launchMode";
import { CONTINUE_PATH, savePendingIntent, type Intent } from "@/lib/intent";
import { NY_GIFT_BUTTON, nyFullButton, nyLightPrice, nySaleLine, nySellOn } from "@/lib/newyear2027";
import type { ElementKo } from "@/lib/pillarView";
import { neededEnergy } from "@/lib/neededEnergy";
import { daeunCells, elementShares, kstDateString, relationRows, yinYangCount } from "@/lib/manseView";
import { useWelcomeHere } from "@/components/app/useWelcomeHere";
import { useRoomBackGuard, useStepBack } from "@/components/room/useStepBack";
import { reportClientError } from "@/components/yeopjeon/useYeopjeon";
import { bgm } from "@/components/bgm/bgm";
import { SGATE_DONE, SGATE_UNLOCK, isGateOn } from "@/components/gate/GateOverlay";
import { SajuPillarsCard } from "@/components/SajuPillarsCard";
import { DaeunTimeline, ElementBalance, NeededEnergySection, RelationsTable } from "@/components/ManseSections";

/**
 * 2027 신년운 링크 대문 (/go/newyear2027, 2026-11-03 유샘 지시서)
 *   1) 2026-11-08 유샘: 수능대박운처럼 먼저 대문(GateOverlay) → 대문 버튼으로 문이 열리면 신년 영상이 처음부터 소리와 함께
 *      (예전의 "멈춘 첫 장면 + 무료로 보기" 단계는 없앰)
 *   2) 재생 3초 뒤 영상 아래에서 "만세력과 무료 맛보기" 단추가 올라온다 (영상을 가리지 않음)
 *   3) 이름·성별·생년월일·시를 한 번 입력 → 만세력과 2027 총운 맛보기를 함께
 *   4) 맛보기 아래 단추 하나 (선물 안 쓴 손님: 선물 엽전으로 총운 끝까지 / 쓴 손님: 전체 보기 오픈 특가) + "12가지 전부 보기" 링크
 *   처음부터 로그인을 요구하지 않는다: 입력 → 맛보기 → 로그인 또는 결제.
 */

const VIDEO = "/rooms/newyear2027/ryugyeol-2027";
const POSTER = "/rooms/newyear2027/poster.jpg";
const RISE_MS = 3000;

type Preview = {
  nickname: string;
  saju: SajuJson;
  seun: { year: number; stem: string; branch: string; tenGod: string };
  preview: { title: string; summary: string; keywords: string[]; free: { heading: string; body: string }; locked: string[] };
};
/** 선물을 아직 쓸 수 있나: 로그인 안 함 → true (가입 선물), 로그인 → 가진 엽전으로 총운(990)을 열 수 있나 */
type Me = { loggedIn: boolean; termsAgreed: boolean; gift: boolean };

const NAVY = "#16213a";
const GOLD = "#d4b265";
const GOLD_L = "#f3e7c6";
const CARD = { border: "1px solid var(--color-gold-line)", backgroundColor: "var(--color-card)" } as const;
const pad = (n: number) => String(n).padStart(2, "0");

export function NewYear2027Landing() {
  useRoomBackGuard();
  const giftHere = useWelcomeHere();
  const vid = useRef<HTMLVideoElement>(null);
  const [stage, setStage] = useState<"playing" | "form">("playing");
  const started = useRef(false);
  const [rise, setRise] = useState(false);

  // 입력
  const [name, setName] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "">("");
  const [cal, setCal] = useState<"solar" | "lunar">("solar");
  const [leap, setLeap] = useState(false);
  const [y, setY] = useState("");
  const [m, setM] = useState("");
  const [d, setD] = useState("");
  const [hour, setHour] = useState("");
  const [issues, setIssues] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [resultId, setResultId] = useState<string | null>(null);
  const [pv, setPv] = useState<Preview | null>(null);
  const [me, setMe] = useState<Me | "loading">("loading");

  // 뒤로가기: 맛보기 → 입력 칸 (넣었던 값 그대로)
  useStepBack("ny-result", pv !== null, () => {
    setPv(null);
    window.setTimeout(() => document.getElementById("ny-form")?.scrollIntoView({ block: "start" }), 30);
  });

  // 손님 상태 (단추 하나를 고르는 데만 쓴다)
  useEffect(() => {
    if (!isAuthEnabled()) return setMe({ loggedIn: false, termsAgreed: false, gift: false });
    (async () => {
      const a = await fetch("/api/auth/me")
        .then((r) => (r.ok ? r.json() : { user: null }))
        .catch(() => ({ user: null }));
      if (!a.user) return setMe({ loggedIn: false, termsAgreed: false, gift: true });
      const y = a.user.termsAgreed
        ? await fetch("/api/yeopjeon")
            .then((r) => (r.ok ? r.json() : null))
            .catch(() => null)
        : null;
      setMe({ loggedIn: true, termsAgreed: !!a.user.termsAgreed, gift: !a.user.termsAgreed || (typeof y?.balance === "number" && y.balance >= nyLightPrice()) });
    })();
  }, []);

  // 소리 있는 영상이 도는 동안 배경음은 잠깐 멈춘다
  useEffect(() => {
    const v = vid.current;
    if (!v) return;
    const off = () => bgm().pauseForHidden(false);
    v.addEventListener("ended", off);
    return () => {
      v.removeEventListener("ended", off);
      off();
    };
  }, []);

  // 2026-11-08 유샘: 수능대박운과 같은 대문 방식 - 대문 버튼으로 문이 열리면(SGATE_DONE) 신년 영상이 처음부터 소리와 함께.
  //   대문이 없으면(이 창에서 이미 봄 등) 화면이 뜨자마자 재생한다 (소리가 막히는 기기는 소리 없이).
  useEffect(() => {
    const v = vid.current;
    if (!v) return;
    const unlock = () => {
      v.muted = false;
      v.play()
        .then(() => v.pause())
        .catch(() => {});
    };
    const start = () => play();
    if (isGateOn()) {
      window.addEventListener(SGATE_UNLOCK, unlock);
      window.addEventListener(SGATE_DONE, start);
    } else start();
    return () => {
      window.removeEventListener(SGATE_UNLOCK, unlock);
      window.removeEventListener(SGATE_DONE, start);
    };
    // 처음 한 번만
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function play() {
    if (started.current) return;
    started.current = true;
    const v = vid.current;
    window.setTimeout(() => setRise(true), RISE_MS);
    if (!v) return;
    bgm().pauseForHidden(true);
    v.muted = false;
    v.currentTime = 0;
    v.play().catch(() => {
      // 소리 재생이 막힌 기기에서는 소리 없이라도 처음부터
      v.muted = true;
      v.play().catch(() => {});
    });
  }

  function openForm() {
    setStage("form");
    window.setTimeout(() => document.getElementById("ny-form")?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    const errs: string[] = [];
    const yy = Number(y);
    const mm = Number(m);
    const dd = Number(d);
    if (!name.trim()) errs.push("이름을 넣어 주세요.");
    if (!gender) errs.push("성별을 골라 주세요.");
    if (!/^\d{4}$/.test(y) || yy < 1900 || yy > 2100) errs.push("태어난 해를 4자리로 넣어 주세요. (예: 1990)");
    if (!(mm >= 1 && mm <= 12)) errs.push("태어난 달을 1~12로 넣어 주세요.");
    if (!(dd >= 1 && dd <= 31)) errs.push("태어난 날을 1~31로 넣어 주세요.");
    if (errs.length) return setIssues(errs);
    setIssues([]);
    setBusy(true);
    try {
      const res = await fetch("/api/saju/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nickname: name.trim(),
          gender,
          calendarType: cal,
          isLeapMonth: cal === "lunar" ? leap : undefined,
          date: `${yy}-${pad(mm)}-${pad(dd)}`,
          time: hour === "" ? undefined : `${pad(Number(hour))}:00`,
        }),
      });
      const a = await res.json().catch(() => ({}));
      if (!res.ok || !a.id) {
        setIssues(
          a?.error?.code === "SAJU_CALCULATION_FAILED"
            ? ["입력한 날짜를 계산할 수 없어요. 연·월·일(음력이면 윤달 여부)을 다시 확인해 주세요."]
            : (a?.error?.issues ?? [a?.error?.message ?? "잠시 후 다시 시도해 주세요."])
        );
        setBusy(false);
        return;
      }
      const p = await fetch("/api/newyear/preview", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: a.id }) });
      const b = await p.json().catch(() => ({}));
      if (!p.ok) {
        setIssues([b?.error?.message ?? "잠시 후 다시 시도해 주세요."]);
        setBusy(false);
        return;
      }
      setResultId(a.id);
      setPv(b as Preview);
      window.setTimeout(() => document.getElementById("ny-result")?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
    } catch (err) {
      reportClientError("2027 신년운 맛보기", String(err));
      setIssues(["연결이 끊겼어요. 잠시 후 다시 시도해 주세요."]);
    }
    setBusy(false);
  }

  /** 로그인·결제 뒤 /continue 가 이 결과로 사람을 만들고 이어 간다 */
  const remember = (i: Intent) => {
    if (resultId) savePendingIntent(resultId, i);
  };

  // 맛보기 아래 단추 하나 (2026-11-03 지시서 문구 그대로)
  const gift = me !== "loading" && giftHere !== false && me.gift;
  // 2026-11-04 유샘: 판매가 끝나면(2028-01-01) 사는 단추를 두지 않는다
  const selling = nySellOn();
  const saleLine = nySaleLine();
  const cta = !selling
    ? null
    : me === "loading" || giftHere === null
      ? null
      : gift
        ? {
            label: NY_GIFT_BUTTON,
            href: !me.loggedIn
              ? `/login?next=${encodeURIComponent(CONTINUE_PATH)}`
              : !me.termsAgreed
                ? `/consent?next=${encodeURIComponent(CONTINUE_PATH)}`
                : CONTINUE_PATH,
            intent: { kind: "ny", full: false } as Intent,
          }
        : { label: nyFullButton(), href: CONTINUE_PATH, intent: { kind: "ny", full: true } as Intent };

  const chip = (on: boolean) =>
    ({
      border: `1px solid ${on ? GOLD : "var(--color-line)"}`,
      backgroundColor: on ? NAVY : "var(--color-card)",
      color: on ? GOLD_L : "var(--color-ink)",
    }) as const;
  const field = { border: "1px solid var(--color-line)", backgroundColor: "var(--color-paper)" } as const;

  return (
    <main className="mx-auto min-h-screen max-w-xl px-5 pb-16 pt-6">
      {/* 영상: 멈춘 첫 장면 → 누르면 소리와 함께 처음부터 */}
      <div className="overflow-hidden rounded-2xl" style={{ aspectRatio: "16 / 9", backgroundColor: "#0b1020", boxShadow: "0 8px 28px rgba(22,33,58,.25)" }}>
        <video ref={vid} className="h-full w-full object-cover" poster={POSTER} playsInline muted preload="auto" controls={false} disablePictureInPicture>
          <source src={`${VIDEO}.webm`} type="video/webm" />
          <source src={`${VIDEO}.mp4`} type="video/mp4" />
        </video>
      </div>

      {/* 영상 아래 단추 자리 - 영상을 가리지 않는다 */}
      <div className="mt-5 flex min-h-[60px] items-start justify-center">
        {stage === "playing" && (
          <button
            type="button"
            onClick={openForm}
            className="btn-primary w-full"
            style={{ opacity: rise ? 1 : 0, transform: rise ? "translateY(0)" : "translateY(24px)", transition: "opacity .6s ease, transform .6s ease", pointerEvents: rise ? "auto" : "none" }}
            aria-hidden={!rise}
            tabIndex={rise ? 0 : -1}
          >
            만세력과 무료 맛보기
          </button>
        )}
      </div>

      {stage === "form" && !pv && (
        <form id="ny-form" onSubmit={submit} className="scroll-mt-4 rounded-2xl p-5" style={CARD} noValidate>
          <label className="block text-[14px] font-bold" htmlFor="ny-name">
            이름
          </label>
          <input id="ny-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={20} autoComplete="off" placeholder="예: 홍길동" className="mt-1.5 w-full rounded-xl px-4 py-3 text-[16px]" style={field} />

          <p className="mt-4 text-[14px] font-bold">성별</p>
          <div className="mt-1.5 grid grid-cols-2 gap-2">
            {([["male", "남"], ["female", "여"]] as const).map(([v, t]) => (
              <button key={v} type="button" onClick={() => setGender(v)} aria-pressed={gender === v} className="rounded-xl py-3 text-[15px] font-bold" style={chip(gender === v)}>
                {t}
              </button>
            ))}
          </div>

          <p className="mt-4 text-[14px] font-bold">생년월일</p>
          <div className="mt-1.5 grid grid-cols-2 gap-2">
            {([["solar", "양력"], ["lunar", "음력"]] as const).map(([v, t]) => (
              <button key={v} type="button" onClick={() => setCal(v)} aria-pressed={cal === v} className="rounded-xl py-2.5 text-[14px] font-bold" style={chip(cal === v)}>
                {t}
              </button>
            ))}
          </div>
          <div className="mt-2 grid grid-cols-[1.4fr_1fr_1fr] gap-2">
            {(
              [
                ["ny-y", y, setY, "년 (1990)", 4],
                ["ny-m", m, setM, "월", 2],
                ["ny-d", d, setD, "일", 2],
              ] as const
            ).map(([id, v, set, ph, max]) => (
              <input key={id} id={id} aria-label={ph} value={v} onChange={(e) => set(e.target.value.replace(/\D/g, "").slice(0, max))} inputMode="numeric" placeholder={ph} className="w-full rounded-xl px-3 py-3 text-center text-[16px]" style={field} />
            ))}
          </div>
          {cal === "lunar" && (
            <label className="mt-2 flex items-center gap-2 text-[14px]">
              <input type="checkbox" checked={leap} onChange={(e) => setLeap(e.target.checked)} /> 윤달에 태어났어요
            </label>
          )}

          {/* 2026-11-09 유샘: 시간은 기본 사주 입력과 같은 버튼 방식 (몰라요/알아요 → 오전/오후 → 시) */}
          <div className="mt-4">
            <HourPicker value={hour} onChange={setHour} idPrefix="ny-hour" />
          </div>

          {issues.length > 0 && (
            <ul className="mt-4 space-y-1 rounded-xl px-4 py-3 text-[14px]" role="alert" style={{ backgroundColor: "var(--color-danger-soft)", color: "var(--color-danger)" }}>
              {issues.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          )}

          <button type="submit" disabled={busy} className="btn-primary mt-5 disabled:opacity-60">
            {busy ? "기운을 살피는 중..." : "만세력과 무료 맛보기"}
          </button>
        </form>
      )}

      {pv && (
        <div id="ny-result" className="scroll-mt-4">
          {/* 만세력 */}
          <section className="rounded-2xl p-5" style={CARD}>
            <h2 className="text-[22px] font-bold" style={{ fontFamily: "var(--font-serif)" }}>
              {pv.nickname}님의 만세력
            </h2>
            <div className="mt-4">
              <SajuPillarsCard saju={pv.saju} />
            </div>
          </section>
          <div className="mt-6">
            <ElementBalance
              shares={elementShares(pv.saju)}
              dominant={pv.saju.elements.summary.dominant as ElementKo}
              lacking={pv.saju.elements.summary.lacking as ElementKo[]}
              yinYang={yinYangCount(pv.saju)}
            />
            <NeededEnergySection need={neededEnergy(pv.saju)} />
            <RelationsTable rows={relationRows(pv.saju)} />
            <DaeunTimeline cells={daeunCells(pv.saju, kstDateString())} seun={pv.seun} />
          </div>

          {/* 2027 총운 맛보기 */}
          <section className="rounded-2xl px-5 py-6 text-center" style={{ backgroundColor: NAVY, border: `1px solid ${GOLD}` }}>
            <h2 className="text-[22px] font-bold" style={{ fontFamily: "var(--font-serif)", color: GOLD_L }}>
              {pv.preview.title}
            </h2>
            <p className="mx-auto mt-3 max-w-[30em] text-[15px] leading-relaxed" style={{ color: GOLD_L, wordBreak: "keep-all" }}>
              {pv.preview.summary}
            </p>
          </section>
          <section className="mt-4 rounded-2xl p-5" style={CARD}>
            <h3 className="text-[17px] font-bold" style={{ fontFamily: "var(--font-serif)" }}>
              {pv.preview.free.heading}
            </h3>
            <p className="mt-2 text-[15px] leading-[1.85]" style={{ color: "var(--color-ink-soft)", wordBreak: "keep-all" }}>
              {pv.preview.free.body}
            </p>
            <ul className="mt-5 space-y-3">
              {pv.preview.locked.map((h) => (
                <li key={h}>
                  <p className="text-[14.5px] font-bold">{h}</p>
                  <p className="mt-1 select-none text-[13.5px] leading-relaxed" aria-hidden="true" style={{ filter: "blur(5px)", color: "var(--color-ink-soft)" }}>
                    {pv.nickname}님의 한 해는 이렇게 흐르고, 이 자리를 이렇게 채우면 한결 단단해져요.
                  </p>
                </li>
              ))}
            </ul>
          </section>

          {/* 단추 하나 + 12가지 전부 보기 링크 */}
          <div className="mt-5">
            {cta ? (
              <a href={cta.href} onClick={() => remember(cta.intent)} className="btn-primary block text-center">
                {cta.label}
              </a>
            ) : (
              selling && <div className="h-[56px]" />
            )}
            {selling && saleLine && (
              <p className="mt-2 text-center text-[13px]" style={{ color: "var(--color-ink-soft)" }}>
                {saleLine}
              </p>
            )}
            <a href={CONTINUE_PATH} onClick={() => remember({ kind: "all" })} className="mt-5 block text-center text-[14px] underline underline-offset-4" style={{ color: "var(--color-ink-soft)" }}>
              12가지 전부 보기
            </a>
          </div>
        </div>
      )}
    </main>
  );
}
