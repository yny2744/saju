import { EXTRA_KEYS, TOPICS, TOPIC_KEYS } from "@/lib/topics";
import { PRICE, bundleDiscount, formatNyang } from "@/lib/yeopjeon";
import type { Journey } from "@/lib/journey";

const GOLD = "var(--color-gold)";

function Badge({ count, price }: { count: number; price: number }) {
  const d = bundleDiscount(count, price);
  return (
    <span className="mt-1 block text-[13px]">
      <s style={{ color: "var(--color-ink-faint)" }}>{formatNyang(d.list)}</s>
      <span className="mx-1" style={{ color: GOLD }}>
        →
      </span>
      <b style={{ color: "var(--color-accent)" }}>{formatNyang(price)}</b>
      <span className="ml-1.5 rounded-full px-2 py-0.5 text-[12px] font-bold" style={{ backgroundColor: "var(--color-gold-soft)", border: "1px solid var(--color-gold-line)" }}>
        {d.percent}% 할인
      </span>
    </span>
  );
}

/**
 * 깊게 보기를 다 읽은 뒤 이어지는 길 (2026-10-10 수정안 27·29).
 * 대문에는 큰 금액을 두지 않고, 깊게 본 손님에게만 여기서 내 사주로 고른 다음 운세 → 그 3가지 몰아보기 → 전부 보기를 보여 준다.
 */
export function NextSteps({ personId, nickname, journey }: { personId: string; nickname: string; journey: Journey }) {
  const owned = new Set(journey.unlocked);
  const left = TOPIC_KEYS.filter((t) => !owned.has(t));
  const allLeft = [...TOPIC_KEYS, ...EXTRA_KEYS].filter((t) => !owned.has(t));
  if (allLeft.length === 0) return null;
  const recs = journey.recommend.filter((r) => !owned.has(r.topic));
  const canBundle = recs.length === 3;
  const base = `/person/${encodeURIComponent(personId)}`;

  return (
    <section className="mt-10">
      <div className="gold-ornament" aria-hidden>
        <i />
      </div>
      <h2 className="mt-2 text-center text-[20px] font-bold" style={{ fontFamily: "var(--font-serif)" }}>
        {nickname}님 사주에서 이어 볼 운세
      </h2>
      <p className="mt-1 text-center text-[13px]" style={{ color: "var(--color-ink-faint)" }}>
        여덟 글자에서 두드러진 기운을 따라 골랐어요
      </p>

      <ul className="mt-4 space-y-2">
        {recs.map((r) => (
          <li key={r.topic}>
            <a href={`${base}/${r.topic}`} className="gold-card flex items-center gap-3 rounded-2xl px-4 py-3.5">
              <span className="foil-text w-8 shrink-0 text-center text-[24px] font-bold" style={{ fontFamily: "var(--font-serif)" }}>
                {TOPICS[r.topic].hanja}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-bold">{TOPICS[r.topic].title}</span>
                <span className="block text-[12.5px]" style={{ color: "var(--color-ink-soft)" }}>
                  {r.reason}
                </span>
              </span>
              <span className="shrink-0 text-[13px]" style={{ color: GOLD }}>
                ›
              </span>
            </a>
          </li>
        ))}
      </ul>

      {canBundle && (
        <a
          href={`${base}?buy=bundle3&pick=${recs.map((r) => r.topic).join(",")}`}
          className="mt-4 block rounded-2xl px-4 py-4 text-center"
          style={{ border: "1px solid var(--color-gold-line)", backgroundColor: "var(--color-accent-soft)" }}
        >
          <span className="block text-[16px] font-bold" style={{ fontFamily: "var(--font-serif)" }}>
            이 3가지 한 번에 깊게 보기
          </span>
          <Badge count={3} price={PRICE.BUNDLE3} />
        </a>
      )}

      {left.length * PRICE.DEEP > PRICE.BUNDLE12 && (
        <a href={`${base}?buy=bundle12`} className="mt-3 block rounded-2xl px-4 py-4 text-center" style={{ border: "1px solid var(--color-gold-line)" }}>
          <span className="block text-[16px] font-bold" style={{ fontFamily: "var(--font-serif)" }}>
            남은 운세까지 12가지 전부 보기
          </span>
          <span className="mt-0.5 block text-[12.5px]" style={{ color: "var(--color-ink-soft)" }}>
            + {EXTRA_KEYS.map((k) => TOPICS[k].title).join(", ")}까지
          </span>
          <Badge count={left.length} price={PRICE.BUNDLE12} />
        </a>
      )}
    </section>
  );
}
