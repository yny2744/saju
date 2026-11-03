import { TENANT } from "@/tenants";

/**
 * 2027 신년 운세 관 - 예전 중간 소개 화면("한 해의 흐름을 미리 읽다")의 내용을 입력 칸 아래로 옮긴 것 (2026-11-03 유샘 지시서: 버리지 말고 옮긴다).
 */
export function NewYearBelow() {
  const l = TENANT.gate?.seasonal.find((x) => x.key === "newyear");
  if (!l) return null;
  return (
    <section className="pb-8">
      <h2 className="text-center text-[20px] font-bold" style={{ fontFamily: "var(--font-serif)", wordBreak: "keep-all" }}>
        {l.headline}
      </h2>
      <p className="mx-auto mt-2 max-w-[30em] text-center text-[14px] leading-relaxed" style={{ color: "var(--color-ink-soft)", wordBreak: "keep-all" }}>
        {l.lead}
      </p>
      <ul className="mt-4 grid grid-cols-2 gap-2">
        {l.rooms.map((r) => (
          <li key={r.name}>
            <a href={r.href} className="block h-full rounded-xl px-3.5 py-3" style={{ border: "1px solid var(--color-gold-line)", backgroundColor: "var(--color-card)" }}>
              <span className="block text-[15px] font-bold" style={{ fontFamily: "var(--font-serif)" }}>
                {r.name}
              </span>
              <span className="mt-0.5 block text-[12.5px]" style={{ color: "var(--color-ink-soft)", wordBreak: "keep-all" }}>
                {r.desc}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
