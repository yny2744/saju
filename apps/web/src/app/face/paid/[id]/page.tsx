"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { isAuthEnabled } from "@/lib/launchMode";
import { ComingSoon } from "@/components/ComingSoon";
import { ErrorState, LoadingState } from "@/components/StatusScreens";
import { PayDialog } from "@/components/yeopjeon/PayDialog";
import { WritingOverlay } from "@/components/yeopjeon/WritingOverlay";
import { ReviewBox } from "@/components/reviews/ReviewBox";
import { ReviewStrip } from "@/components/reviews/ReviewStrip";
import { notifyYeopjeonChanged, reportClientError } from "@/components/yeopjeon/useYeopjeon";
import { CURRENCY_NAME, formatNyang } from "@/lib/yeopjeon";
import { faceTypeName } from "@/lib/faceType";
import type { FaceFeatureBuckets, FaceRuleResult } from "@/server/face/types";
import type { FaceDeepResult } from "@/server/face/faceVision";
import type { FaceMapResult } from "@/lib/faceMap";
import { SamJeongBar } from "@/components/face/SamJeongBar";
import { PartnerPortrait, PartnerTeaser } from "@/components/face/PartnerPortrait";

/**
 * 관상 심층 풀이 · 인연 궁합 (2026-10-12 수정안 53) - 4,900냥.
 *   잠김(누구의 사주로 볼지 + 사진 동의 한 번 + 사기) → 사면 바로 풀이 쓰기 → 풀이 보기 + 1004 천사의 한마디
 *   (2026-10-13 수정안 59: 사주를 함께 풀고, 동의는 한 번만 - 결제하고 돌아와도 바로 이어서 쓴다)
 * 사진은 이 탭의 임시 저장소에만 있고, 손님이 동의하고 "풀이 받기"를 누를 때 한 번만 서버(→AI)로 간다. 저장하지 않는다.
 */

type FacePerson = { id: string; nickname: string; hanjaName: string | null; birth: string };
type Base = { id: string; nickname: string; buckets: FaceFeatureBuckets; rule: FaceRuleResult; hasPreference: boolean; price: number; person: FacePerson | null };
type SavedProfile = { id: string; name: string; hanjaName: string | null; date: string; gender: "male" | "female" };
type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | (Base & { status: "locked"; balance: number })
  | (Base & { status: "write" })
  | (Base & { status: "ready"; content: FaceDeepResult });

const CARD = { border: "1px solid var(--color-line)", backgroundColor: "var(--color-card)" } as const;
const PARTS: Array<[keyof FaceDeepResult["selfAnalysis"], string]> = [
  ["faceShape", "얼굴형"],
  ["forehead", "이마"],
  ["eyes", "눈"],
  ["nose", "코"],
  ["mouth", "입"],
  ["jaw", "턱"],
];

/** 고른 사진을 긴 변 512px JPEG로 줄인다 (이 기기 안에서) */
function shrinkPhoto(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        const scale = Math.min(1, 512 / Math.max(img.naturalWidth, img.naturalHeight));
        const c = document.createElement("canvas");
        c.width = Math.round(img.naturalWidth * scale);
        c.height = Math.round(img.naturalHeight * scale);
        const ctx = c.getContext("2d");
        if (!ctx) throw new Error("canvas");
        ctx.drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL("image/jpeg", 0.8));
      } catch (e) {
        reject(e);
      } finally {
        URL.revokeObjectURL(url);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("사진을 열지 못했어요."));
    };
    img.src = url;
  });
}

function FaceBody({ id }: { id: string }) {
  const q = useSearchParams();
  const [state, setState] = useState<State>({ status: "loading" });
  const [busy, setBusy] = useState(false);
  const [writing, setWriting] = useState<"photo" | "plain" | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [payOpen, setPayOpen] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  const [faceMap, setFaceMap] = useState<FaceMapResult | null>(null);
  const [profiles, setProfiles] = useState<SavedProfile[]>([]);
  const [attaching, setAttaching] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const autoRan = useRef(false);
  const AUTO_KEY = `face_auto_${id}`;

  const load = useCallback(async () => {
    const r = await fetch(`/api/face/readings/${encodeURIComponent(id)}`).catch(() => null);
    if (!r) return setState({ status: "error", message: "연결이 끊겼어요." });
    if (r.status === 401) {
      window.location.replace(`/login?next=${encodeURIComponent(`/face/paid/${id}`)}`);
      return;
    }
    const body = await r.json().catch(() => ({}));
    if (!r.ok) return setState({ status: "error", message: body?.error?.message ?? "불러오지 못했어요." });
    setState(body);
  }, [id]);

  useEffect(() => {
    load();
    try {
      setPhoto(sessionStorage.getItem(`face_photo_paid_${id}`));
      const map = sessionStorage.getItem(`face_map_paid_${id}`);
      setFaceMap(map ? (JSON.parse(map) as FaceMapResult) : null);
    } catch {
      setPhoto(null);
    }
    if (q.get("paid") === "1") setNotice("결제가 끝나 열렸어요.");
    // 사주 새로 입력하고 돌아온 경우: 그 사주를 붙인다
    const resultId = q.get("resultId");
    if (resultId) {
      window.history.replaceState(null, "", `/face/paid/${id}`);
      attach({ resultId });
    }
    // 처음 한 번만
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load]);

  // 저장한 사람 (드롭다운)
  useEffect(() => {
    if (state.status !== "locked") return;
    fetch("/api/profiles")
      .then((r) => (r.ok ? r.json() : { profiles: [] }))
      .then((d: { profiles?: SavedProfile[] }) => setProfiles(d.profiles ?? []))
      .catch(() => {});
  }, [state.status]);

  // 카드 결제하고 돌아왔으면 결제 전에 고른 대로 바로 풀이를 쓴다 (동의를 두 번 받지 않는다)
  useEffect(() => {
    if (state.status !== "write" || autoRan.current) return;
    let mode: string | null = null;
    try {
      mode = sessionStorage.getItem(AUTO_KEY);
      sessionStorage.removeItem(AUTO_KEY);
    } catch {
      /* 무시 */
    }
    if (mode === "photo" || mode === "plain") {
      autoRan.current = true;
      write(mode === "photo");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.status]);

  async function attach(body: { profileId?: string; resultId?: string }) {
    setAttaching(true);
    setNotice(null);
    try {
      const r = await fetch(`/api/face/readings/${encodeURIComponent(id)}/saju`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const b = await r.json().catch(() => ({}));
      if (!r.ok) setNotice(b?.error?.message ?? "사주를 붙이지 못했어요. 다시 골라 주세요.");
      await load();
    } catch {
      setNotice("연결이 끊겼어요. 다시 골라 주세요.");
    }
    setAttaching(false);
  }

  async function buy() {
    setBusy(true);
    setNotice(null);
    try {
      const usePhoto = !!photo && consent;
      const r = await fetch(`/api/face/readings/${encodeURIComponent(id)}/purchase`, { method: "POST" });
      const body = await r.json().catch(() => ({}));
      if (r.ok) {
        notifyYeopjeonChanged();
        setBusy(false);
        await write(usePhoto); // 사자마자 바로 풀이
        return;
      } else if (body?.error?.code === "INSUFFICIENT_YEOPJEON") {
        try {
          sessionStorage.setItem(AUTO_KEY, usePhoto ? "photo" : "plain");
        } catch {
          /* 무시 */
        }
        setPayOpen(true);
      }
      else if (body?.error?.code === "ALREADY_OWNED") await load();
      else setNotice(body?.error?.message ?? "잠시 후 다시 시도해 주세요.");
    } catch (e) {
      reportClientError("관상 열기", String(e));
      setNotice("연결이 끊겼어요. 잠시 후 다시 시도해 주세요.");
    }
    setBusy(false);
  }

  async function write(withPhoto: boolean) {
    setNotice(null);
    setWriting(withPhoto ? "photo" : "plain");
    const minWait = new Promise((r) => setTimeout(r, 9000)); // 너무 뚝딱 나오지 않게 (수정안 32와 같은 뜻)
    try {
      const r = await fetch(`/api/face/readings/${encodeURIComponent(id)}/write`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(withPhoto && photo ? { photo, consent: true } : {}),
      });
      const body = await r.json().catch(() => ({}));
      await minWait;
      if (r.ok) {
        await load();
        window.scrollTo({ top: 0 });
      } else setNotice(body?.error?.message ?? "잠시 후 다시 눌러 주세요. 엽전은 다시 빠지지 않아요.");
    } catch (e) {
      reportClientError("관상 풀이 쓰기", String(e));
      setNotice("연결이 끊겼어요. 다시 눌러 주세요. 엽전은 다시 빠지지 않아요.");
    }
    setWriting(null);
  }

  async function pickPhoto(file: File | undefined) {
    if (!file) return;
    try {
      const url = await shrinkPhoto(file);
      setPhoto(url);
      setConsent(false);
      try {
        sessionStorage.setItem(`face_photo_paid_${id}`, url);
      } catch {
        /* 용량 초과는 무시 */
      }
    } catch {
      setNotice("사진을 열지 못했어요. 다른 사진으로 골라 주세요.");
    }
  }

  if (state.status === "loading") return <LoadingState message="불러오고 있어요..." />;
  if (state.status === "error") return <ErrorState message={state.message} linkHref="/face" linkLabel="관상 처음으로" />;
  if (writing)
    return (
      <WritingOverlay
        title={writing === "photo" ? "얼굴을 찬찬히 살펴보고 있어요" : "얼굴 비율로 관상을 풀고 있어요"}
        steps={
          writing === "photo"
            ? ["이마와 눈썹을 보고 있어요", "눈매와 콧방울을 살피고 있어요", "입꼬리와 턱선을 보고 있어요", "삼정의 균형을 재고 있어요", "어울리는 인연을 그려 보고 있어요"]
            : ["얼굴형과 이마를 풀고 있어요", "눈과 코를 풀고 있어요", "입과 턱을 풀고 있어요", "어울리는 인연을 그려 보고 있어요"]
        }
        durationMs={20000}
      />
    );

  const typeName = faceTypeName(state.buckets);

  return (
    <main className="mx-auto min-h-screen max-w-xl px-5 pb-20 pt-12 sm:pt-16">
      <header className="mb-6">
        <p className="section-label mb-1.5">류결사주 · 관상 심층 풀이</p>
        <div className="flex items-center gap-4">
          {photo && (
            // eslint-disable-next-line @next/next/no-img-element -- 이 기기 안의 data URL
            <img src={photo} alt="" className="h-20 w-20 shrink-0 rounded-full object-cover" style={{ border: "2px solid var(--color-gold-line)" }} />
          )}
          <div>
            <h1 className="text-[26px] font-bold leading-snug" style={{ fontFamily: "var(--font-serif)" }}>
              {state.nickname}님의 관상
            </h1>
            <span className="mt-2 inline-block rounded-full px-3 py-1 text-xs font-semibold" style={{ backgroundColor: "var(--color-accent-soft)", color: "var(--color-accent)" }}>
              관상 유형 · {typeName}
            </span>
          </div>
        </div>
      </header>

      {notice && (
        <p className="mb-5 rounded-xl px-4 py-3 text-center text-[14px]" style={{ backgroundColor: "var(--color-gold-soft)" }}>
          {notice}
        </p>
      )}

      {/* 수정안 57: 내 관상도 - 무료 관상에서 이 탭으로 넘어온 그림 (서버에 저장하지 않아 다른 기기·나중에는 안 보임) */}
      {faceMap && (
        <section className="mb-7">
          <p className="section-label mb-1">내 관상도</p>
          {/* eslint-disable-next-line @next/next/no-img-element -- 이 기기 안에서 만든 data URL */}
          <img src={faceMap.dataUrl} alt="내 관상도" className="w-full rounded-xl" style={{ border: "1px solid var(--color-line)" }} />
          {faceMap.samjeong && <SamJeongBar s={faceMap.samjeong} />}
          <p className="mt-2 text-[11px] leading-relaxed" style={{ color: "var(--color-ink-faint)" }}>
            사진을 이 기기 안에서 스케치로 바꾼 그림이에요. 서버에 저장하지 않아서, 이 창을 닫거나 다른 기기에서 열면 보이지 않아요.
          </p>
        </section>
      )}

      {state.status === "locked" && (
        <>
          <section className="mb-6 rounded-xl px-4 py-4" style={{ backgroundColor: "var(--color-ink)", color: "var(--color-paper)" }}>
            <p className="mb-1.5 text-[13px]" style={{ color: "var(--color-paper-soft)" }}>
              어울리는 인연 (미리보기)
            </p>
            <p className="text-[14px] leading-relaxed">{state.rule.idealPartnerPreview}</p>
          </section>
          <section className="mb-6">
            <p className="section-label mb-1">인연 관상도</p>
            <PartnerTeaser />
          </section>
          {/* 수정안 59: 누구의 사주로 볼까요 */}
          <section className="mb-5 rounded-2xl p-5" style={CARD}>
            <h2 className="text-[16px] font-bold" style={{ fontFamily: "var(--font-serif)" }}>
              ① 관상과 함께 볼 사주
            </h2>
            {state.person ? (
              <p className="mt-2 rounded-xl px-4 py-3 text-[14px]" style={{ backgroundColor: "var(--color-gold-soft)" }}>
                <b>
                  {state.person.nickname}
                  {state.person.hanjaName ? `(${state.person.hanjaName})` : ""}
                </b>
                <span className="block text-[12.5px]" style={{ color: "var(--color-ink-soft)" }}>
                  {state.person.birth}
                </span>
              </p>
            ) : (
              <p className="mt-1.5 text-[13px]" style={{ color: "var(--color-ink-soft)" }}>
                이름(한자)과 생년월일시로 사주를 함께 풀어 드려요.
              </p>
            )}
            {profiles.length > 0 && (
              <select
                aria-label="저장한 사람"
                value=""
                disabled={attaching}
                onChange={(e) => e.target.value && attach({ profileId: e.target.value })}
                className="field-input mt-3"
              >
                <option value="">{state.person ? "다른 사람으로 바꾸기" : "저장한 사람에서 고르기"}</option>
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                    {p.hanjaName ? `(${p.hanjaName})` : ""} · {p.date} · {p.gender === "male" ? "남" : "여"}
                  </option>
                ))}
              </select>
            )}
            <a href={`/start?face=${id}`} className="mt-2 block text-center text-[13px] underline underline-offset-4" style={{ color: "var(--color-ink-soft)" }}>
              {attaching ? "사주를 붙이는 중..." : "생년월일 새로 입력하기"}
            </a>
          </section>

          <section className="rounded-2xl p-5" style={CARD}>
            <h2 className="text-[18px] font-bold" style={{ fontFamily: "var(--font-serif)" }}>
              ② 관상 심층 풀이 · 인연 궁합 · {CURRENCY_NAME} {formatNyang(state.price)}
            </h2>
            <ul className="mt-3 space-y-1.5 text-[14px] leading-relaxed" style={{ color: "var(--color-ink-soft)" }}>
              <li>◆ 내 사주와 관상이 만나는 자리 · 아쉬운 기운을 채우는 법</li>
              <li>◆ AI가 사진을 직접 보고 쓰는 부위별 깊은 풀이 (동의하실 때만)</li>
              <li>◆ 사진에서 눈에 띈 특징 · 삼정과 얼굴 전체의 복</li>
              <li>◆ 연애 경향 · 잘 어울리는 인연의 관상과 성품</li>
              <li>◆ 함께할 때 살필 점{state.hasPreference ? " · 적어 주신 선호에 대한 한마디" : ""}</li>
              <li>◆ 내 복주머니에 보관 · 언제든 다시 보기</li>
            </ul>
            {photo ? (
              <label className="mt-4 flex items-start gap-2 rounded-xl px-3 py-3 text-[13px] leading-relaxed" style={{ backgroundColor: "var(--color-paper-soft)" }}>
                <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  찍은 사진을 AI 풀이에 쓰는 데 동의해요. 사진은 풀이를 쓰는 동안 AI(Google Gemini)에 한 번 보내지고, 류결사주는 사진을 <b>저장하지 않아요</b>. 체크하지 않으면 얼굴
                  비율로만 풀어 드려요.
                </span>
              </label>
            ) : (
              <p className="mt-4 text-[13px]" style={{ color: "var(--color-ink-faint)" }}>
                사진 없이 얼굴 비율로 풀어 드려요.{" "}
                <button type="button" onClick={() => fileRef.current?.click()} className="underline underline-offset-4">
                  사진 고르기
                </button>
              </p>
            )}
            <p className="mt-3 text-[13px]" style={{ color: "var(--color-ink-faint)" }}>
              내 {CURRENCY_NAME} {formatNyang(state.balance)}
              {state.balance < state.price && " · 모자란 만큼만 카드·간편결제"}
            </p>
            <button type="button" disabled={busy || attaching || !state.person} onClick={buy} className="btn-primary mt-4 disabled:opacity-50">
              {!state.person
                ? "① 사주를 먼저 골라 주세요"
                : busy
                  ? "여는 중..."
                  : state.balance >= state.price
                    ? `${CURRENCY_NAME}으로 열고 바로 풀이 받기`
                    : "결제하고 바로 풀이 받기"}
            </button>
          </section>
          <ReviewStrip face variant="mini" title="관상 심층 풀이를 받은 분들의 한마디" />
        </>
      )}

      {state.status === "write" && (
        <section className="space-y-4 rounded-2xl p-5" style={CARD}>
          <h2 className="text-[17px] font-bold" style={{ fontFamily: "var(--font-serif)" }}>
            풀이 받기
          </h2>
          <p className="text-[14px] leading-relaxed" style={{ color: "var(--color-ink-soft)" }}>
            사진을 함께 보내 주시면 AI가 눈썹 결, 눈매, 입꼬리, 점처럼 비율로는 알 수 없는 것까지 보고 풀어 드려요. 사진 없이 얼굴 비율로만 받을 수도 있어요.
          </p>
          {photo ? (
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element -- 이 기기 안의 data URL */}
              <img src={photo} alt="풀이에 쓸 사진" className="h-24 w-24 rounded-xl object-cover" style={{ border: "1px solid var(--color-line)" }} />
              <button type="button" onClick={() => fileRef.current?.click()} className="text-[13px] underline underline-offset-4" style={{ color: "var(--color-ink-soft)" }}>
                다른 사진 고르기
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => fileRef.current?.click()} className="btn-secondary">
              정면 사진 고르기
            </button>
          )}
          {photo && (
            <label className="flex items-start gap-2 rounded-xl px-3 py-3 text-[13px] leading-relaxed" style={{ backgroundColor: "var(--color-paper-soft)" }}>
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                이 사진을 관상 풀이에 쓰는 데 동의해요. 사진은 풀이를 쓰는 동안 AI(Google Gemini)에 한 번 보내지고, 류결사주는 사진을 <b>저장하지 않아요</b>.
              </span>
            </label>
          )}
          <button type="button" disabled={!photo || !consent} onClick={() => write(true)} className="btn-primary disabled:opacity-50">
            사진을 보고 풀이 받기
          </button>
          <button type="button" onClick={() => write(false)} className="block w-full py-1 text-center text-[13px] underline underline-offset-4" style={{ color: "var(--color-ink-faint)" }}>
            사진 없이 얼굴 비율로만 받기
          </button>
        </section>
      )}

      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => pickPhoto(e.target.files?.[0])} />
      {state.status === "ready" && <Report content={state.content} buckets={state.buckets} />}
      {state.status === "ready" && <ReviewBox personId={id} product="face" />}

      <div className="mt-8 space-y-2.5">
        <a href="/start" className="btn-secondary block text-center">
          무료 만세력도 보기
        </a>
        <a href="/mypage" className="block text-center text-[13px] underline underline-offset-4" style={{ color: "var(--color-ink-faint)" }}>
          내 복주머니
        </a>
      </div>

      {payOpen && (
        <PayDialog
          personId={id}
          mode="face"
          topics={[]}
          checkoutUrl={`/api/face/readings/${encodeURIComponent(id)}/checkout`}
          backTo={`/face/paid/${id}`}
          onEnough={() => {
            setPayOpen(false);
            buy();
          }}
          onClose={() => setPayOpen(false)}
        />
      )}
    </main>
  );
}

function Para({ title, body, gold = false }: { title: string; body: string; gold?: boolean }) {
  return (
    <section className="mb-4 rounded-2xl px-5 py-4" style={gold ? { border: "1px solid var(--color-gold-line)", backgroundColor: "var(--color-card)" } : CARD}>
      <h3 className="mb-1.5 text-[15px] font-bold" style={{ fontFamily: "var(--font-serif)", color: gold ? "var(--color-gold)" : undefined }}>
        {title}
      </h3>
      <p className="whitespace-pre-line text-[14.5px] leading-[1.8]">{body}</p>
    </section>
  );
}

function Report({ content, buckets }: { content: FaceDeepResult; buckets: FaceFeatureBuckets }) {
  const r = content.relationshipInsight;
  return (
    <div>
      <p className="mb-4 text-center text-[12px]" style={{ color: "var(--color-ink-faint)" }}>
        {content.photoUsed ? "사진을 직접 보고 쓴 풀이예요" : "얼굴 비율로 쓴 풀이예요"}
      </p>

      <p className="section-label mb-2">얼굴 전체</p>
      <Para title="종합 풀이" body={content.selfAnalysis.overallSummary} gold />
      {content.sajuLink && <Para title="관상과 사주가 만나는 자리" body={content.sajuLink} gold />}
      {content.photoHighlights && <Para title="사진에서 눈에 띈 것" body={content.photoHighlights} />}

      <p className="section-label mb-2 mt-6">부위별 풀이</p>
      {PARTS.map(([k, label]) => (
        <Para key={k} title={label} body={content.selfAnalysis[k]} />
      ))}

      <p className="section-label mb-2 mt-6">인연 궁합</p>
      <section className="mb-4 rounded-2xl px-4 py-4" style={{ border: "1px solid var(--color-gold-line)", backgroundColor: "var(--color-card)" }}>
        <h3 className="mb-3 text-center text-[15px] font-bold" style={{ fontFamily: "var(--font-serif)", color: "var(--color-gold)" }}>
          인연 관상도
        </h3>
        <PartnerPortrait me={buckets} />
      </section>
      <Para title="연애에서 보이는 모습" body={r.traditionalLoveTendency} />
      <Para title="잘 어울리는 인연의 관상" body={r.idealPartnerTraits} gold />
      <Para title="그런 인연의 성품" body={r.partnerFeatureNotes} />
      <Para title="함께할 때 살필 점" body={r.harmonyPoints} />
      {r.userPreferenceNote && <Para title="적어 주신 선호에 대해" body={r.userPreferenceNote} />}

      <p className="mt-6 text-center text-[11px] leading-relaxed" style={{ color: "var(--color-ink-faint)" }}>
        {content.disclaimer}
      </p>
    </div>
  );
}

function Page({ params }: { params: { id: string } }) {
  if (!isAuthEnabled()) return <ComingSoon title="관상 심층 풀이" />;
  return (
    <Suspense fallback={<LoadingState message="불러오는 중..." />}>
      <FaceBody id={params.id} />
    </Suspense>
  );
}

export default Page;
