import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BRAND, TENANT } from "@/tenants";
import type { GateRoom, TenantGate } from "@/tenants/types";
import { RoomCard, roomHref } from "@/components/gate/GateRooms";

/**
 * 광고 랜딩 (2026-10-28 mgml 4번 작업) - 운별 한 장. 예) /l/bond (우리 사이), /l/newyear (한 해의 운)
 * 채널 구분은 페이지를 새로 만들지 않고 주소 꼬리표로 한다: /l/bond?utm_source=youtube&utm_medium=shorts&utm_campaign=gunghap01
 * (꼬리표는 SrcCapture 가 기억 → 방문·결제에 기록 → 관리자 화면 "유입 경로별 성과")
 * 세 길·일곱 운 대문(gate)을 쓰는 고객사에서만 열린다.
 */

interface LandingInfo {
  key: string;
  glyph: string;
  name: string;
  wayName: string | null;
  headline: string;
  lead: string;
  rooms: GateRoom[];
}

function findLanding(gate: TenantGate, key: string): LandingInfo | null {
  for (const w of gate.ways) {
    const u = w.uns.find((x) => x.key === key);
    if (u) return { key, glyph: u.glyph, name: u.name, wayName: w.name, headline: u.landing.headline, lead: u.landing.lead, rooms: u.rooms };
  }
  const s = gate.seasonal.find((x) => x.key === key);
  return s ? { key, glyph: s.glyph, name: s.name, wayName: null, headline: s.headline, lead: s.lead, rooms: s.rooms } : null;
}

export function generateStaticParams() {
  const g = TENANT.gate;
  if (!g) return [];
  return [...g.ways.flatMap((w) => w.uns.map((u) => ({ key: u.key }))), ...g.seasonal.map((s) => ({ key: s.key }))];
}

export const dynamicParams = false;

export function generateMetadata({ params }: { params: { key: string } }): Metadata {
  const g = TENANT.gate;
  const l = g && findLanding(g, params.key);
  if (!g || !l) return { title: BRAND };
  return { title: `${l.headline} · ${g.title}`, description: l.lead };
}

export default function GateLandingPage({ params }: { params: { key: string } }) {
  const gate = TENANT.gate;
  const l = gate && findLanding(gate, params.key);
  if (!gate || !l) notFound();
  const primary = l.rooms.map((r) => ({ r, href: roomHref(r) })).find((x) => x.href);
  const serif = { fontFamily: "var(--font-serif)" } as const;

  return (
    <main className="min-h-screen pb-12">
      <section className="px-6 pb-10 pt-9 text-center" style={{ background: "linear-gradient(#070b16,#13203d)", color: "#ece6d8", wordBreak: "keep-all" }}>
        <a href="/" className="inline-flex items-center gap-2 text-[13px] tracking-[0.3em]" style={{ color: "#d6bc8a", ...serif }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- 엠블럼 */}
          <img src={gate.emblem} alt="" width={26} height={26} />
          {gate.title}
        </a>
        {l.wayName && (
          <p className="mt-5">
            <span className="rounded-full px-3 py-1 text-[13px] font-bold" style={{ border: "1px solid rgba(214,188,138,.6)", color: "#f4e2b8", ...serif }}>
              {l.wayName}
            </span>
          </p>
        )}
        <span
          aria-hidden
          className="mx-auto mt-6 flex h-20 w-20 items-center justify-center rounded-full text-[38px] font-bold"
          style={{ backgroundColor: "#0a1020", border: "2px solid #f4e2b8", color: "#f4e2b8", boxShadow: "0 0 32px rgba(244,226,184,.28)", ...serif }}
        >
          {l.glyph}
        </span>
        <p className="mt-3 text-[14px] font-semibold" style={{ color: "#d6bc8a" }}>
          {l.name}
        </p>
        <h1 className="mx-auto mt-2 max-w-[18em] text-[27px] font-bold leading-snug" style={{ color: "#f4e2b8", textWrap: "balance", ...serif }}>
          {l.headline}
        </h1>
        <p className="mx-auto mt-3 max-w-[28em] text-[15px] leading-relaxed" style={{ color: "#d8d2c4" }}>
          {l.lead}
        </p>
        {primary && (
          <a href={primary.href!} className="mx-auto mt-7 block max-w-[300px] rounded-xl py-3.5 text-[16px] font-bold" style={{ background: "linear-gradient(180deg,#e2c47e,#c9a55a)", color: "#16213a" }}>
            {primary.r.name}에서 바로 보기
          </a>
        )}
      </section>

      <div className="mx-auto max-w-xl px-5">
        <section className="pt-10">
          <h2 className="mb-3 text-center text-[19px] font-bold" style={serif}>
            {l.name}의 관
          </h2>
          <ul className="grid grid-cols-2 gap-2">
            {l.rooms.map((room) => (
              <li key={room.name}>
                <RoomCard room={room} />
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-10 rounded-2xl px-5 py-6 text-center" style={{ backgroundColor: "#16213a", border: "1px solid var(--color-gold-line)", color: "#f3e7c6" }}>
          <p className="text-[13px]" style={{ color: "#d6bc8a" }}>
            {gate.intro.tagline}
          </p>
          <p className="mt-2 text-[18px] font-bold" style={serif}>
            {gate.intro.heading}
          </p>
          <p className="mx-auto mt-2 max-w-[28em] text-[13.5px] leading-relaxed" style={{ color: "#c9cfda", wordBreak: "keep-all" }}>
            {gate.intro.bridge}
          </p>
          <a href="/#intro" className="mt-4 inline-block text-[14px] font-bold underline underline-offset-4" style={{ color: "#f4e2b8" }}>
            세 길·일곱 운 모두 보기
          </a>
        </section>
      </div>
    </main>
  );
}
