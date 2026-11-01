import type { TenantGate } from "@/tenants/types";

/**
 * 세 길 · 일곱 운 · 방(관) (2026-10-28 mgml 3번 작업).
 * 분류는 고객의 목적(세 길 → 일곱 운)으로 하고, 그 안의 방법(사주·관상·별자리 …)을 "관"으로 부른다.
 * 대문의 운·길 이름·채움을 누르면 여기 해당 자리(#un-…, #way-…, #fill)로 내려온다.
 * 2026-11-01 유샘: 세 길 → 일곱 운 → 관 세 단계 접기 (GateWays). "곧 열려요" 관(손금·MBTI·택일, 수능 스위치가 꺼진 수능대박운)은
 *   설정에 남겨 두고 화면에서만 뺀다 - 들어가는 길이 생기면 저절로 다시 보인다.
 */

export { RoomCard, roomHref } from "./RoomCard";
import { roomHref } from "./RoomCard";
import { GateWays, type WayView } from "./GateWays";

export function GateRooms({ gate }: { gate: TenantGate }) {
  // 들어갈 수 있는 관만 (곧 열려요는 숨김)
  const ways: WayView[] = gate.ways.map((w) => ({
    key: w.key,
    name: w.name,
    question: w.question,
    uns: w.uns
      .map((u) => ({ key: u.key, glyph: u.glyph, name: u.name, rooms: u.rooms.filter((r) => roomHref(r) !== null) }))
      .filter((u) => u.rooms.length > 0),
  }));
  return (
    <section id="rooms" className="scroll-mt-2 py-12" aria-labelledby="gh-rooms-h">
      <div className="mb-6 text-center">
        <div className="gold-ornament" aria-hidden>
          <i />
        </div>
        <h2 id="gh-rooms-h" className="mt-2 text-[23px] font-bold" style={{ fontFamily: "var(--font-serif)" }}>
          세 갈래 길, 일곱 가지 운
        </h2>
        <p className="mt-2 text-[14px]" style={{ color: "var(--color-ink-soft)" }}>
          알고 싶은 것에 따라 길을 고르고, 그 안의 관으로 들어가세요
        </p>
      </div>

      <div className="space-y-8">
        <GateWays ways={ways} />

        {/* 채움 - 모든 길이 맺히는 자리 */}
        <div id="fill" className="scroll-mt-2 rounded-2xl px-5 py-6 text-center" style={{ backgroundColor: "#16213a", border: "1px solid var(--color-gold-line)", boxShadow: "inset 0 0 0 3px #16213a, inset 0 0 0 4px rgba(212,178,101,0.55)" }}>
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full text-[24px] font-bold" style={{ border: "1.5px solid #d4b265", color: "#f4e2b8", fontFamily: "var(--font-serif)", boxShadow: "0 0 24px rgba(244,226,184,.25)" }}>
            {gate.fruit.glyph}
          </span>
          <p className="mt-3 text-[20px] font-bold" style={{ color: "#f3e7c6", fontFamily: "var(--font-serif)" }}>
            {gate.fruit.title}
          </p>
          <p className="mt-0.5 text-[14.5px] font-semibold" style={{ color: "#d6bc8a" }}>
            {gate.fruit.sub}
          </p>
          <p className="mx-auto mt-3 max-w-[30em] text-[14px] leading-relaxed" style={{ color: "#c9cfda", wordBreak: "keep-all" }}>
            {gate.fruit.desc}
          </p>
          <a href="/start" className="mx-auto mt-5 block max-w-[260px] rounded-xl py-3 text-[15px] font-bold" style={{ background: "linear-gradient(180deg,#e2c47e,#c9a55a)", color: "#16213a" }}>
            내 사주의 남은 작은 빈자리 보기
          </a>
        </div>
      </div>
    </section>
  );
}
