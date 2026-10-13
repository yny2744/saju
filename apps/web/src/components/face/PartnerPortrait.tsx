"use client";

import { useEffect, useState } from "react";
import type { FaceFeatureBuckets } from "@/server/face/types";
import type { FaceMapResult } from "@/lib/faceMap";
import { PARTNER_FEATURE_TEXT, PARTNER_PARTS, PARTNER_PART_LABEL, partnerBuckets } from "@/lib/facePartner";
import { SamJeongBar } from "./SamJeongBar";

/**
 * 인연 관상도 (2026-10-13 수정안 58).
 *   손님이 고른 성별·나이대의 가상 인물 사진(public/face/partners, AI로 만든 12장)을
 *   무료 관상과 같은 기능(analyzeFace → 연필 스케치·부위 이름표·삼정 선)으로 바꿔 보여 준다.
 *   그림은 분위기를 보여 주는 시각 자료이고, 인연의 특징은 아래 글(내 관상과 음양이 맞는 특징)로 풀어 준다.
 *   손님 사진은 쓰지 않는다. 나이는 사진으로 짐작하지 않고 손님이 고른다.
 */

export type PartnerGender = "w" | "m";
export const PARTNER_AGES = [20, 30, 40, 50, 60, 70] as const;
export type PartnerAge = (typeof PARTNER_AGES)[number];

const PREF_KEY = "ryugyeol_partner_pref";
const partnerSrc = (g: PartnerGender, a: PartnerAge) => `/face/partners/${g}${a}.jpg`;

function readPref(): { g: PartnerGender; a: PartnerAge } {
  try {
    const v = JSON.parse(localStorage.getItem(PREF_KEY) ?? "null");
    if (v && (v.g === "w" || v.g === "m") && PARTNER_AGES.includes(v.a)) return v;
  } catch {
    /* 무시 */
  }
  return { g: "w", a: 30 };
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("그림을 불러오지 못했어요."));
    img.src = src;
  });
}

/** 같은 그림은 이 탭에서 한 번만 스케치로 바꾼다 */
async function sketchOf(g: PartnerGender, a: PartnerAge): Promise<FaceMapResult | null> {
  const key = `partner_map_${g}${a}`;
  try {
    const hit = sessionStorage.getItem(key);
    if (hit) return JSON.parse(hit) as FaceMapResult;
  } catch {
    /* 무시 */
  }
  const { analyzeFace } = await import("@/lib/faceLandmarks");
  const img = await loadImage(partnerSrc(g, a));
  const map = (await analyzeFace(img)).faceMap;
  try {
    if (map) sessionStorage.setItem(key, JSON.stringify(map));
  } catch {
    /* 용량 초과는 무시 */
  }
  return map;
}

const CAPTION = "AI로 만든 가상 인물을 바탕으로 그린 상상화예요. 실제 인물이 아니에요.";

/** 심층 풀이(산 뒤): 성별·나이대 고르기 + 인연 관상도 + 특징 글 */
export function PartnerPortrait({ me }: { me: FaceFeatureBuckets }) {
  const [pref, setPref] = useState<{ g: PartnerGender; a: PartnerAge } | null>(null);
  const [map, setMap] = useState<FaceMapResult | null>(null);
  const [state, setState] = useState<"loading" | "ok" | "plain">("loading");
  const p = partnerBuckets(me);

  useEffect(() => setPref(readPref()), []);
  useEffect(() => {
    if (!pref) return;
    let cancelled = false;
    setState("loading");
    setMap(null);
    try {
      localStorage.setItem(PREF_KEY, JSON.stringify(pref));
    } catch {
      /* 무시 */
    }
    sketchOf(pref.g, pref.a)
      .then((m) => {
        if (cancelled) return;
        setMap(m);
        setState(m ? "ok" : "plain");
      })
      .catch(() => !cancelled && setState("plain"));
    return () => {
      cancelled = true;
    };
  }, [pref]);

  const chip = (on: boolean) => ({
    border: on ? "2px solid var(--color-accent)" : "1px solid var(--color-line)",
    backgroundColor: on ? "var(--color-accent-soft)" : "var(--color-card)",
  });

  return (
    <div>
      <div className="mb-2 grid grid-cols-2 gap-2" role="radiogroup" aria-label="인연 성별">
        {(["w", "m"] as const).map((g) => (
          <button key={g} type="button" role="radio" aria-checked={pref?.g === g} onClick={() => pref && setPref({ ...pref, g })} className="rounded-xl py-2.5 text-[14px] font-semibold" style={chip(pref?.g === g)}>
            {g === "w" ? "여성상" : "남성상"}
          </button>
        ))}
      </div>
      <div className="mb-3 grid grid-cols-6 gap-1.5" role="radiogroup" aria-label="인연 나이대">
        {PARTNER_AGES.map((a) => (
          <button key={a} type="button" role="radio" aria-checked={pref?.a === a} onClick={() => pref && setPref({ ...pref, a })} className="rounded-lg py-2 text-[13px] font-semibold" style={chip(pref?.a === a)}>
            {a}대
          </button>
        ))}
      </div>

      {state === "loading" && (
        <div className="flex aspect-[4/3] items-center justify-center rounded-xl text-[14px]" style={{ backgroundColor: "var(--color-paper-soft)", color: "var(--color-ink-soft)" }}>
          인연 관상도를 그리고 있어요...
        </div>
      )}
      {state === "ok" && map && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element -- 이 기기 안에서 만든 data URL */}
          <img src={map.dataUrl} alt={`인연 관상도 (${pref?.g === "w" ? "여성상" : "남성상"} · ${pref?.a}대)`} className="w-full rounded-xl" style={{ border: "1px solid var(--color-line)" }} />
          {map.samjeong && <SamJeongBar s={map.samjeong} />}
        </>
      )}
      {state === "plain" && pref && (
        // 스케치 도구를 못 불러온 경우(느린 망 등) - 사진을 옛 종이 빛으로만 보여 준다
        // eslint-disable-next-line @next/next/no-img-element -- 사이트에 둔 그림
        <img src={partnerSrc(pref.g, pref.a)} alt="인연 관상도" className="w-full rounded-xl" style={{ filter: "grayscale(1) sepia(0.45) contrast(1.05)", border: "1px solid var(--color-line)" }} />
      )}

      <ul className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-[13px]">
        {PARTNER_PARTS.map((k) => (
          <li key={k} className="flex gap-1.5">
            <span className="shrink-0 font-semibold" style={{ color: "var(--color-gold)" }}>
              {PARTNER_PART_LABEL[k]}
            </span>
            <span style={{ color: "var(--color-ink-soft)" }}>{PARTNER_FEATURE_TEXT[k][p[k]]}</span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-center text-[11px] leading-relaxed" style={{ color: "var(--color-ink-faint)" }}>
        그림은 분위기를 보여 드리는 참고 자료이고, 인연의 특징은 위 글과 아래 풀이에 담았어요. {CAPTION}
      </p>
    </div>
  );
}

/** 무료 결과·사기 전: 흐린 미리보기 */
export function PartnerTeaser() {
  const [src, setSrc] = useState(partnerSrc("w", 30));
  useEffect(() => {
    const v = readPref();
    setSrc(partnerSrc(v.g, v.a));
  }, []);
  return (
    <div className="relative overflow-hidden rounded-xl" style={{ border: "1px solid var(--color-line)" }}>
      {/* eslint-disable-next-line @next/next/no-img-element -- 사이트에 둔 그림 */}
      <img src={src} alt="" aria-hidden className="aspect-[4/3] w-full object-cover object-top" style={{ filter: "grayscale(1) sepia(0.5) blur(9px)", transform: "scale(1.1)" }} />
      <div className="absolute inset-0 flex items-center justify-center px-2 text-center">
        <p className="whitespace-nowrap rounded-xl px-4 py-3 text-[13px] font-semibold leading-relaxed" style={{ backgroundColor: "var(--color-card)", border: "1px solid var(--color-gold-line)" }}>
          나와 어울리는 인연의 관상도,
          <br />
          심층 풀이에서 선명하게 보여 드려요
        </p>
      </div>
    </div>
  );
}
