"use client";

import { useEffect, useState } from "react";
import type { SajuJson } from "saju-engine";
import { RoomHeader } from "@/components/room/RoomShell";
import { useRoomBackGuard, useStepBack } from "@/components/room/useStepBack";
import { SajuPillarsCard } from "@/components/SajuPillarsCard";
import { WritingOverlay } from "@/components/yeopjeon/WritingOverlay";
import { reportClientError } from "@/components/yeopjeon/useYeopjeon";
import { isAuthEnabled } from "@/lib/launchMode";
import { BirthFields, EMPTY_BIRTH, analyzeBirth, birthFromProfile, birthIssues, type Birth, type SavedProfile } from "./BirthFields";
import { LoveLadder } from "./LoveLadder";

/**
 * 크리스마스 연애운 (2026-11-09 유샘 지시서) - /go/gunghap 대문을 지나 들어오는 관 화면.
 *   관 제목 → 홍보 영상(맨 위 홍보 자리) → 바로 아래 두 단추
 *     "아직 그 사람을 기다려요" → 솔로 길 "내 인연은 어디서 오나"
 *     "함께하는 사람이 있어요" → 커플 길 "이 사람이 내 인연일까"
 *   비회원: 맛보기만 → 카카오 로그인 뒤 같은 결과를 끝까지 (이 창에 입력과 결과 토큰을 기억해 둔다)
 *   회원: 맛보기 없이 끝까지 (무료, 엔진 문장만) → 아래에 상품 사다리 (LoveLadder)
 */

type Me = { termsAgreed: boolean; isGuest?: boolean } | null;
type Path = "solo" | "couple";
const RESUME_KEY = "ryugyeol_love_resume";
type Resume = { kind: "solo"; resultId: string; birth: Birth } | { kind: "couple"; aId: string; bId: string; a: Birth; b: Birth };

const NAVY = "#16213a";
const GOLD = "#d4b265";
const GOLD_L = "#f3e7c6";
const CARD = { border: "1px solid var(--color-gold-line)", backgroundColor: "var(--color-card)" } as const;
const WAIT_MS = 9000;
const CONSENT_LINE = "상대방의 이름·생년월일을 궁합 풀이에 쓰는 것에 대해 상대방의 동의를 받았어요.";

export function XmasLanding() {
  // 링크로 바로 들어왔으면 휴대폰 뒤로 버튼이 메인의 이 관 위치로
  useRoomBackGuard();
  const [path, setPath] = useState<Path | null>(null);
  const [resume, setResume] = useState<Resume | null>(null);
  const [me, setMe] = useState<Me | "loading">("loading");
  const member = me !== "loading" && !!me && me.termsAgreed && !me.isGuest;

  useEffect(() => {
    if (!isAuthEnabled()) return setMe(null);
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : { user: null }))
      .then((b) => setMe(b.user ?? null))
      .catch(() => setMe(null));
  }, []);

  // 카카오 로그인에서 돌아오면(?resume=solo|couple) 넣었던 값과 결과를 그대로
  useEffect(() => {
    const want = new URLSearchParams(location.search).get("resume");
    if (want !== "solo" && want !== "couple") return;
    try {
      const r = JSON.parse(sessionStorage.getItem(RESUME_KEY) ?? "null") as Resume | null;
      if (r && r.kind === want) {
        setResume(r);
        setPath(want);
      }
    } catch {
      /* 무시 */
    }
  }, []);

  const pick = (p: Path) => {
    setPath(p);
    window.setTimeout(() => document.getElementById("xmas-flow")?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
  };

  return (
    <main className="min-h-screen pb-10">
      <div className="mx-auto max-w-xl px-5">
        <RoomHeader roomKey="gunghap" />
        <div className="grid gap-2.5">
          {(
            [
              ["solo", "아직 그 사람을 기다려요"],
              ["couple", "함께하는 사람이 있어요"],
            ] as const
          ).map(([p, label]) => (
            <button
              key={p}
              type="button"
              onClick={() => pick(p)}
              aria-pressed={path === p}
              className="rounded-2xl px-4 py-4 text-[18px] font-bold"
              style={{
                fontFamily: "var(--font-serif)",
                backgroundColor: path === p ? NAVY : "var(--color-card)",
                color: path === p ? GOLD_L : "var(--color-ink)",
                border: `1px solid ${path === p ? GOLD : "var(--color-gold-line)"}`,
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <section id="xmas-flow" className="scroll-mt-4 pb-8 pt-6">
          {path === "solo" && <SoloFlow key="solo" me={me} member={member} resume={resume?.kind === "solo" ? resume : null} />}
          {path === "couple" && <CoupleFlow key="couple" me={me} member={member} resume={resume?.kind === "couple" ? resume : null} />}
        </section>
      </div>
    </main>
  );
}

// ───────────────────────── 공통 조각 ─────────────────────────

function Section({ heading, body }: { heading: string; body: string }) {
  return (
    <section className="rounded-2xl p-5" style={CARD}>
      <h3 className="text-[17px] font-bold" style={{ fontFamily: "var(--font-serif)" }}>
        {heading}
      </h3>
      <p className="mt-2 text-[15px] leading-[1.85]" style={{ color: "var(--color-ink-soft)", wordBreak: "keep-all" }}>
        {body}
      </p>
    </section>
  );
}

function Issues({ list }: { list: string[] }) {
  if (!list.length) return null;
  return (
    <ul className="mt-4 space-y-1 rounded-xl px-4 py-3 text-[13.5px]" style={{ backgroundColor: "var(--color-gold-soft)" }} role="alert">
      {list.map((t) => (
        <li key={t}>{t}</li>
      ))}
    </ul>
  );
}

function SubmitButton({ busy, label }: { busy: boolean; label: string }) {
  return (
    <button
      type="submit"
      disabled={busy}
      className="mt-5 block w-full rounded-xl py-4 text-[17px] font-bold disabled:opacity-60"
      style={{ backgroundColor: NAVY, color: GOLD_L, border: `1px solid ${GOLD}`, fontFamily: "var(--font-serif)" }}
    >
      {busy ? "기운을 살피는 중..." : label}
    </button>
  );
}

/** 흐린 소제목 + 카카오 로그인 단추 (비회원) */
function LockedBox({ headings, blurLine, me, kakaoLabel, back, remember }: { headings: string[]; blurLine: string; me: Me | "loading"; kakaoLabel: string; back: string; remember: () => void }) {
  return (
    <section className="mt-4 rounded-2xl p-5" style={{ ...CARD, boxShadow: `0 0 0 2px ${GOLD} inset` }}>
      <ul className="space-y-3">
        {headings.map((h) => (
          <li key={h}>
            <p className="text-[14.5px] font-bold">{h}</p>
            <p className="mt-1 select-none text-[13.5px] leading-relaxed" aria-hidden="true" style={{ filter: "blur(5px)", color: "var(--color-ink-soft)" }}>
              {blurLine}
            </p>
          </li>
        ))}
      </ul>
      <div className="mt-5">
        {me === "loading" ? (
          <div className="h-[56px]" />
        ) : !isAuthEnabled() ? (
          <p className="text-center text-[13px]" style={{ color: "var(--color-ink-faint)" }}>
            곧 열려요
          </p>
        ) : me && !me.isGuest && !me.termsAgreed ? (
          <a href={`/consent?next=${encodeURIComponent(back)}`} onClick={remember} className="btn-primary block text-center">
            {kakaoLabel}
          </a>
        ) : (
          <a
            href={`/api/auth/kakao/start?next=${encodeURIComponent(back)}`}
            onClick={remember}
            className="block rounded-xl px-3 py-4 text-center text-[16px] font-bold leading-snug"
            style={{ backgroundColor: "#fee500", color: "#191600", wordBreak: "keep-all" }}
          >
            {kakaoLabel}
          </a>
        )}
      </div>
    </section>
  );
}

const post = (url: string, body: unknown) => fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
const waitFrom = async (started: number) => {
  const left = WAIT_MS - (Date.now() - started);
  if (left > 0) await new Promise((r) => window.setTimeout(r, left));
};
const saveResume = (r: Resume) => {
  try {
    sessionStorage.setItem(RESUME_KEY, JSON.stringify(r));
  } catch {
    /* 못 남기면 돌아와서 다시 넣으면 된다 */
  }
};
const backTo = (kind: Path) => (typeof window !== "undefined" ? `${location.pathname}?resume=${kind}` : `/go/gunghap?resume=${kind}`);

// ───────────────────────── 솔로 길 ─────────────────────────

type SoloPreview = { nickname: string; saju: SajuJson; preview: { heading: string; body: string }; lockedHeadings: string[] };

function SoloFlow({ me, member, resume }: { me: Me | "loading"; member: boolean; resume: Extract<Resume, { kind: "solo" }> | null }) {
  const [birth, setBirth] = useState<Birth>(resume?.birth ?? EMPTY_BIRTH);
  const [issues, setIssues] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [resultId, setResultId] = useState<string | null>(null);
  const [pv, setPv] = useState<SoloPreview | null>(null);
  const [full, setFull] = useState<{ personId: string; sections: Array<{ heading: string; body: string }> } | null>(null);
  useStepBack("love-solo-result", pv !== null, () => {
    setPv(null);
    setFull(null);
  });

  const load = async (id: string) => {
    const p = await post("/api/love/preview", { kind: "solo", id });
    const b = await p.json().catch(() => ({}));
    if (!p.ok) return b?.error?.message ?? "잠시 후 다시 시도해 주세요.";
    setResultId(id);
    setFull(null);
    setPv(b as SoloPreview);
    window.setTimeout(() => document.getElementById("xmas-flow")?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
    return null;
  };

  useEffect(() => {
    if (resume) load(resume.resultId).catch(() => {});
    // 돌아왔을 때 한 번만
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 회원이면 같은 결과를 끝까지 (무료)
  useEffect(() => {
    if (!member || !resultId || full) return;
    post("/api/love/open", { kind: "solo", id: resultId })
      .then((r) => (r.ok ? r.json() : null))
      .then((b) => b?.personId && setFull({ personId: b.personId, sections: b.sections }))
      .catch((e) => reportClientError("크리스마스 연애운 솔로", String(e)));
  }, [member, resultId, full]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    const errs = birthIssues(birth);
    if (errs.length) return setIssues(errs);
    setIssues([]);
    setBusy(true);
    const started = Date.now();
    try {
      const a = await analyzeBirth(birth);
      if ("issues" in a) setIssues(a.issues);
      else {
        await waitFrom(started);
        const msg = await load(a.id);
        if (msg) setIssues([msg]);
      }
    } catch (err) {
      reportClientError("크리스마스 연애운 솔로", String(err));
      setIssues(["연결이 끊겼어요. 잠시 후 다시 시도해 주세요."]);
    }
    setBusy(false);
  }

  const remember = () => resultId && saveResume({ kind: "solo", resultId, birth });

  return (
    <div>
      {busy && <WritingOverlay title={`${birth.name.trim() || "손님"}님의 인연을 살피고 있어요`} steps={["만세력 여덟 글자를 펼치고 있어요", "배우자 자리와 배우자 별을 찾고 있어요", "인연이 오는 길을 헤아리고 있어요", "이번 겨울의 기운과 견주고 있어요"]} durationMs={WAIT_MS} />}
      {!pv && (
        <form onSubmit={submit} className="rounded-2xl p-5" style={CARD} noValidate>
          <p className="mb-5 text-center text-[19px] font-bold" style={{ fontFamily: "var(--font-serif)" }}>
            내 인연은 어디서 오나
          </p>
          <BirthFields id="ls" value={birth} onChange={setBirth} />
          <Issues list={issues} />
          <SubmitButton busy={busy} label="내 인연은 어디서 오나" />
        </form>
      )}

      {pv && (
        <div>
          <section className="rounded-2xl p-5" style={CARD}>
            <p className="text-[12px] tracking-[0.2em]" style={{ color: GOLD }}>
              무료 만세력
            </p>
            <h2 className="mt-1 text-[22px] font-bold" style={{ fontFamily: "var(--font-serif)" }}>
              {pv.nickname}님의 만세력
            </h2>
            <div className="mt-4">
              <SajuPillarsCard saju={pv.saju} />
            </div>
          </section>
          <h2 className="mt-7 text-center text-[21px] font-bold" style={{ fontFamily: "var(--font-serif)" }}>
            내 인연은 어디서 오나
          </h2>
          <div className="mt-4 space-y-4">
            {full ? full.sections.map((s) => <Section key={s.heading} heading={s.heading} body={s.body} />) : <Section heading={pv.preview.heading} body={pv.preview.body} />}
          </div>
          {full ? (
            <LoveLadder kind="solo" meId={full.personId} />
          ) : member ? (
            <div className="h-[56px]" />
          ) : (
            <LockedBox
              headings={pv.lockedHeadings}
              blurLine={`${pv.nickname}님의 인연은 이 길로 다가오고, 이런 사람이 곁에 와요. 이번 겨울과 내년의 흐름까지 담았어요.`}
              me={me}
              kakaoLabel="카카오로 로그인하면 내 인연의 모든 길을 무료로 볼 수 있어요"
              back={backTo("solo")}
              remember={remember}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ───────────────────────── 커플 길 ─────────────────────────

type CouplePreview = { a: string; b: string; attraction: string; lockedHeadings: string[] };

function ProfilePick({ profiles, onPick, id }: { profiles: SavedProfile[]; onPick: (b: Birth) => void; id: string }) {
  if (!profiles.length) return null;
  return (
    <div className="mb-4">
      <label className="block text-[13px] font-bold" htmlFor={id} style={{ color: "var(--color-ink-soft)" }}>
        저장한 사람에서 고르기
      </label>
      <select
        id={id}
        defaultValue=""
        onChange={(e) => {
          const p = profiles.find((x) => x.id === e.target.value);
          if (p) onPick(birthFromProfile(p));
        }}
        className="mt-1.5 w-full rounded-xl px-4 py-3 text-[16px]"
        style={{ border: "1px solid var(--color-line)", backgroundColor: "var(--color-paper)" }}
      >
        <option value="">직접 넣기</option>
        {profiles.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
    </div>
  );
}

function CoupleFlow({ me, member, resume }: { me: Me | "loading"; member: boolean; resume: Extract<Resume, { kind: "couple" }> | null }) {
  const [a, setA] = useState<Birth>(resume?.a ?? EMPTY_BIRTH);
  const [b, setB] = useState<Birth>(resume?.b ?? EMPTY_BIRTH);
  const [consent, setConsent] = useState(!!resume);
  const [profiles, setProfiles] = useState<SavedProfile[]>([]);
  const [issues, setIssues] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [ids, setIds] = useState<{ aId: string; bId: string } | null>(null);
  const [pv, setPv] = useState<CouplePreview | null>(null);
  const [full, setFull] = useState<{ meId: string; partnerId: string; attraction: string; sections: Array<{ heading: string; body: string }> } | null>(null);
  useStepBack("love-couple-result", pv !== null, () => {
    setPv(null);
    setFull(null);
  });

  // 회원은 저장한 사람에서 고를 수 있다
  useEffect(() => {
    if (!member) return;
    fetch("/api/profiles")
      .then((r) => (r.ok ? r.json() : null))
      .then((x) => setProfiles(x?.profiles ?? []))
      .catch(() => {});
  }, [member]);

  const load = async (aId: string, bId: string) => {
    const p = await post("/api/love/preview", { kind: "couple", aId, bId });
    const x = await p.json().catch(() => ({}));
    if (!p.ok) return x?.error?.message ?? "잠시 후 다시 시도해 주세요.";
    setIds({ aId, bId });
    setFull(null);
    setPv(x as CouplePreview);
    window.setTimeout(() => document.getElementById("xmas-flow")?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
    return null;
  };

  useEffect(() => {
    if (resume) load(resume.aId, resume.bId).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!member || !ids || full) return;
    post("/api/love/open", { kind: "couple", ...ids })
      .then((r) => (r.ok ? r.json() : null))
      .then((x) => x?.meId && setFull(x))
      .catch((e) => reportClientError("크리스마스 연애운 커플", String(e)));
  }, [member, ids, full]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    const errs = [...birthIssues(a, "내"), ...birthIssues(b, "상대")];
    if (!consent) errs.push("상대방의 동의를 받았는지 확인해 주세요.");
    if (errs.length) return setIssues(errs);
    setIssues([]);
    setBusy(true);
    const started = Date.now();
    try {
      const [ra, rb] = await Promise.all([analyzeBirth(a), analyzeBirth(b)]);
      if ("issues" in ra || "issues" in rb) setIssues([...("issues" in ra ? ra.issues : []), ...("issues" in rb ? rb.issues : [])]);
      else {
        await waitFrom(started);
        const msg = await load(ra.id, rb.id);
        if (msg) setIssues([msg]);
      }
    } catch (err) {
      reportClientError("크리스마스 연애운 커플", String(err));
      setIssues(["연결이 끊겼어요. 잠시 후 다시 시도해 주세요."]);
    }
    setBusy(false);
  }

  const remember = () => ids && saveResume({ kind: "couple", ...ids, a, b });

  return (
    <div>
      {busy && <WritingOverlay title="두 사람의 인연을 살피고 있어요" steps={["두 사람의 만세력을 펼치고 있어요", "일간과 오행의 관계를 견주고 있어요", "배우자 자리의 합과 충을 살피고 있어요", "이번 겨울의 기운과 견주고 있어요"]} durationMs={WAIT_MS} />}
      {!pv && (
        <form onSubmit={submit} className="rounded-2xl p-5" style={CARD} noValidate>
          <p className="mb-5 text-center text-[19px] font-bold" style={{ fontFamily: "var(--font-serif)" }}>
            이 사람이 내 인연일까
          </p>
          <p className="mb-3 text-[15px] font-bold" style={{ color: GOLD }}>
            나
          </p>
          <ProfilePick id="lc-a-pick" profiles={profiles} onPick={setA} />
          <BirthFields id="lca" value={a} onChange={setA} />
          <div className="my-6 h-px" style={{ backgroundColor: "var(--color-gold-line)" }} />
          <p className="mb-3 text-[15px] font-bold" style={{ color: GOLD }}>
            상대
          </p>
          <ProfilePick id="lc-b-pick" profiles={profiles} onPick={setB} />
          <BirthFields id="lcb" value={b} onChange={setB} namePlaceholder="예: 이바다" />
          <label className="mt-5 flex items-start gap-2 text-[13.5px] leading-relaxed" style={{ wordBreak: "keep-all" }}>
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1 h-4 w-4 shrink-0" />
            {CONSENT_LINE}
          </label>
          <Issues list={issues} />
          <SubmitButton busy={busy} label="이 사람이 내 인연일까" />
        </form>
      )}

      {pv && (
        <div>
          <h2 className="text-center text-[21px] font-bold" style={{ fontFamily: "var(--font-serif)" }}>
            {pv.a} ♡ {pv.b}
          </h2>
          <section className="mt-4 rounded-2xl px-5 py-6 text-center" style={{ backgroundColor: NAVY, border: `1px solid ${GOLD}` }}>
            <p className="text-[17px] font-bold leading-relaxed" style={{ fontFamily: "var(--font-serif)", color: GOLD_L, wordBreak: "keep-all" }}>
              {pv.attraction}
            </p>
          </section>
          {full ? (
            <>
              <div className="mt-4 space-y-4">
                {full.sections.map((s) => (
                  <Section key={s.heading} heading={s.heading} body={s.body} />
                ))}
              </div>
              <LoveLadder kind="couple" meId={full.meId} partnerId={full.partnerId} />
            </>
          ) : member ? (
            <div className="h-[56px]" />
          ) : (
            <LockedBox
              headings={pv.lockedHeadings}
              blurLine={`${pv.a}님과 ${pv.b}님이 서로 끌린 까닭과, 이번 겨울 두 사람에게 들어오는 기운을 담았어요.`}
              me={me}
              kakaoLabel="카카오로 로그인하면 두 사람의 크리스마스 궁합을 무료로 볼 수 있어요"
              back={backTo("couple")}
              remember={remember}
            />
          )}
        </div>
      )}
    </div>
  );
}


