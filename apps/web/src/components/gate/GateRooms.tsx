import type { GateRoom, TenantGate } from "@/tenants/types";
import { isSuneungOn } from "@/lib/launchMode";

/**
 * 세 길 · 일곱 운 · 방(관) (2026-10-28 mgml 3번 작업).
 * 분류는 고객의 목적(세 길 → 일곱 운)으로 하고, 그 안의 방법(사주·관상·별자리 …)을 "관"으로 부른다.
 * 대문의 운·길 이름·채움을 누르면 여기 해당 자리(#un-…, #way-…, #fill)로 내려온다.
 * 아직 없는 관은 링크 없이 "곧 열려요".
 */

/** 갈 곳이 지금 열려 있는지 - 수능운은 스위치(NEXT_PUBLIC_SUNEUNG)가 켜졌을 때만 */
export function roomHref(room: GateRoom): string | null {
  if (!room.href) return null;
  if (room.href.includes("exam=1") && !isSuneungOn()) return null;
  return room.href;
}

const CARD = {
  border: "1px solid var(--color-gold-line)",
  backgroundColor: "var(--color-card)",
  boxShadow: "inset 0 0 0 3px var(--color-card), inset 0 0 0 4px var(--color-gold-soft)",
} as const;

export function RoomCard({ room }: { room: GateRoom }) {
  const href = roomHref(room);
  const inner = (
    <>
      <span className="block text-[16px] font-bold" style={{ fontFamily: "var(--font-serif)" }}>
        {room.name}
      </span>
      <span className="mt-0.5 block text-[12.5px] leading-snug" style={{ color: "var(--color-ink-soft)", wordBreak: "keep-all" }}>
        {room.desc}
      </span>
      <span className="mt-2 block text-[12.5px] font-bold" style={{ color: href ? "var(--color-accent)" : "var(--color-ink-faint)" }}>
        {href ? "들어가기 ›" : "곧 열려요"}
      </span>
    </>
  );
  return href ? (
    <a href={href} className="block h-full rounded-xl px-3.5 py-3 transition-transform active:scale-[0.98]" style={CARD}>
      {inner}
    </a>
  ) : (
    <div className="block h-full rounded-xl px-3.5 py-3 opacity-70" style={CARD} aria-label={`${room.name} - 곧 열려요`}>
      {inner}
    </div>
  );
}

export function GateRooms({ gate }: { gate: TenantGate }) {
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
        {gate.ways.map((way) => (
          <div key={way.key} id={`way-${way.key}`} className="scroll-mt-2">
            <div className="band-bg rounded-2xl px-5 py-4 text-center" style={{ color: "#f6ecd2", border: "1px solid var(--color-gold-line)" }}>
              <p className="text-[19px] font-bold" style={{ fontFamily: "var(--font-serif)", color: "#f4e2b8" }}>
                {way.name}
              </p>
              <p className="mt-0.5 text-[13.5px]" style={{ color: "#d8d2c4" }}>
                {way.question}
              </p>
            </div>
            <div className="mt-4 space-y-6">
              {way.uns.map((un) => (
                <div key={un.key} id={`un-${un.key}`} className="scroll-mt-3">
                  <div className="mb-2.5 flex items-center gap-3">
                    <span
                      aria-hidden
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[20px] font-bold"
                      style={{ backgroundColor: "var(--color-band)", color: "var(--color-gold-light)", boxShadow: "0 0 0 1px var(--color-gold)", fontFamily: "var(--font-serif)" }}
                    >
                      {un.glyph}
                    </span>
                    <span className="text-[18px] font-bold" style={{ fontFamily: "var(--font-serif)" }}>
                      {un.name}
                    </span>
                  </div>
                  <ul className="grid grid-cols-2 gap-2">
                    {un.rooms.map((room) => (
                      <li key={room.name}>
                        <RoomCard room={room} />
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        ))}

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
            내 사주로 부족한 기운 보기
          </a>
        </div>
      </div>
    </section>
  );
}
