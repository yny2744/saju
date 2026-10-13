"use client";

import { useRef, useState } from "react";
import { analyzeFace } from "@/lib/faceLandmarks";
import type { FaceMapResult } from "@/lib/faceMap";
import { SamJeongBar } from "@/components/face/SamJeongBar";

/**
 * 관리자 시험 화면 (2026-10-13 수정안 58) - 인연 관상도.
 *   1) 내 사진 → 무료 관상과 같은 기능으로 내 관상도 + 얼굴 비율
 *   2) 사진·비율을 서버로 → AI(Gemini 이미지 모델)가 가상의 인연 얼굴 사진을 그림
 *   3) 그 사진을 같은 기능으로 연필 스케치 관상도로 → 손님이 보게 될 인연 관상도
 * 결과는 이 화면에만 보이고 저장하지 않는다.
 */

type Gender = "female" | "male";
type Step = "idle" | "me" | "drawing" | "sketch" | "done" | "error";

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("사진을 열지 못했어요."));
    img.src = src;
  });
}

function shrink(img: HTMLImageElement, max: number): string {
  const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
  const c = document.createElement("canvas");
  c.width = Math.round(img.naturalWidth * scale);
  c.height = Math.round(img.naturalHeight * scale);
  c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", 0.85);
}

const STEP_TEXT: Record<Step, string> = {
  idle: "",
  me: "내 사진을 분석하고 있어요...",
  drawing: "AI가 인연 얼굴을 그리고 있어요... (20~40초)",
  sketch: "인연 얼굴을 연필 스케치로 바꾸고 있어요...",
  done: "",
  error: "",
};

function MapCard({ title, map }: { title: string; map: FaceMapResult }) {
  return (
    <section className="gold-card rounded-2xl p-4">
      <h2 className="mb-2 text-[16px] font-bold">{title}</h2>
      {/* eslint-disable-next-line @next/next/no-img-element -- 이 기기 안에서 만든 data URL */}
      <img src={map.dataUrl} alt={title} className="w-full rounded-xl" style={{ border: "1px solid var(--color-line)" }} />
      {map.samjeong && <SamJeongBar s={map.samjeong} />}
    </section>
  );
}

export default function PartnerFaceTestPage() {
  const [gender, setGender] = useState<Gender>("female");
  const [step, setStep] = useState<Step>("idle");
  const [msg, setMsg] = useState<string | null>(null);
  const [mine, setMine] = useState<FaceMapResult | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [partner, setPartner] = useState<{ map: FaceMapResult | null; image: string; traits: string; info: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function run(file: File) {
    setMsg(null);
    setMine(null);
    setPartner(null);
    setPhoto(null);
    setStep("me");
    const url = URL.createObjectURL(file);
    try {
      const img = await loadImage(url);
      const { features, faceMap } = await analyzeFace(img);
      setMine(faceMap);
      const small = shrink(img, 768);
      setPhoto(small);

      setStep("drawing");
      const r = await fetch("/api/admin/partner-face", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photo: small, gender, features }),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(body?.error?.message ?? `실패 (${r.status})`);

      setStep("sketch");
      const pImg = await loadImage(body.image);
      let map: FaceMapResult | null = null;
      try {
        map = (await analyzeFace(pImg)).faceMap;
      } catch (e) {
        setMsg(`AI 그림은 나왔는데 스케치로 바꾸지 못했어요: ${e instanceof Error ? e.message : e}`);
      }
      setPartner({ map, image: body.image, traits: body.partner, info: `${body.model} · ${(body.ms / 1000).toFixed(1)}초` });
      setStep("done");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
      setStep("error");
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  const busy = step === "me" || step === "drawing" || step === "sketch";

  return (
    <main className="mx-auto min-h-screen max-w-xl space-y-5 px-5 pb-20 pt-10">
      <header>
        <p className="section-label mb-1">관리자 · 수정안 58 시험</p>
        <h1 className="text-[24px] font-bold" style={{ fontFamily: "var(--font-serif)" }}>
          인연 관상도 시험
        </h1>
        <p className="mt-2 text-[13.5px] leading-relaxed" style={{ color: "var(--color-ink-soft)" }}>
          정면 사진을 올리면, AI가 그 사진과 음양이 맞는 <b>가상의 인연 얼굴</b>을 그리고, 무료 관상과 같은 기능으로 연필 스케치 관상도를 만들어요. 손님이
          4,900냥 심층 풀이에서 보게 될 그림이에요. 결과는 저장하지 않아요. 한 번 누를 때마다 AI 그림 비용이 조금 들어요.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-2">
        {(["female", "male"] as const).map((g) => (
          <button
            key={g}
            type="button"
            disabled={busy}
            onClick={() => setGender(g)}
            className="rounded-xl py-3 text-[15px] font-semibold"
            style={{ border: gender === g ? "2px solid var(--color-accent)" : "1px solid var(--color-line)", backgroundColor: gender === g ? "var(--color-accent-soft)" : "var(--color-card)" }}
          >
            {g === "female" ? "여성상 (머리 긴)" : "남성상 (단정한 머리)"}
          </button>
        ))}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) run(f);
        }}
      />
      <button type="button" disabled={busy} onClick={() => inputRef.current?.click()} className="btn-primary disabled:opacity-50">
        {busy ? STEP_TEXT[step] : "정면 사진 올리기"}
      </button>

      {msg && (
        <p className="whitespace-pre-wrap break-words rounded-xl px-4 py-3 text-[13px]" style={{ backgroundColor: "var(--color-danger-soft)", color: "var(--color-danger)" }}>
          {msg}
        </p>
      )}

      {partner?.map && <MapCard title="인연 관상도 (손님이 보게 될 그림)" map={partner.map} />}
      {partner && (
        <section className="rounded-2xl p-4" style={{ border: "1px solid var(--color-line)" }}>
          <h2 className="mb-2 text-[15px] font-bold">AI가 그린 인연 얼굴 (원본)</h2>
          {/* eslint-disable-next-line @next/next/no-img-element -- 서버가 돌려준 data URL */}
          <img src={partner.image} alt="AI가 그린 인연 얼굴" className="mx-auto w-2/3 rounded-xl" />
          <p className="mt-2 text-[13px]" style={{ color: "var(--color-ink-soft)" }}>
            넣은 특징: {partner.traits}
          </p>
          <p className="mt-1 text-[12px]" style={{ color: "var(--color-ink-faint)" }}>
            {partner.info}
          </p>
        </section>
      )}
      {mine && <MapCard title="내 관상도 (비교용)" map={mine} />}
      {photo && !mine && (
        // eslint-disable-next-line @next/next/no-img-element -- 이 기기 안의 data URL
        <img src={photo} alt="" className="w-1/3 rounded-xl" />
      )}

      <a href="/admin" className="block text-center text-[13px] underline underline-offset-4" style={{ color: "var(--color-ink-faint)" }}>
        관리자 화면으로
      </a>
    </main>
  );
}
