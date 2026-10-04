import { ELEMENT_TOKEN } from "@/lib/pillarView";
import { TEN_GOD_ORDER, type TenGodDistribution } from "@/lib/tenGodDistribution";

/**
 * 십신 막대그래프 (비겁·식상·재성·관성·인성 순, 그룹당 2줄).
 * 막대 색은 그 십신에 해당하는 글자의 오행 색(--color-element-*), 가장 높은 십신은 굵게 표시.
 */
export function TenGodBarChart({ dist }: { dist: TenGodDistribution }) {
  const byName = new Map(dist.bars.map((b) => [b.name, b]));
  const maxPercent = Math.max(1, ...dist.bars.map((b) => b.percent));
  const topSet = new Set(dist.top);

  return (
    <div className="space-y-2.5">
      {TEN_GOD_ORDER.map(({ group, gods }) => (
        <div key={group} className="flex items-stretch gap-2.5">
          <div
            className="flex w-9 shrink-0 items-center justify-center text-[11px]"
            style={{ color: "var(--color-ink-faint)", borderRight: "1px solid var(--color-line)" }}
          >
            {group}
          </div>
          <div className="flex-1 space-y-1">
            {gods.map((name) => {
              const bar = byName.get(name)!;
              const isTop = topSet.has(name);
              return (
                <div key={name} className="flex items-center gap-2 text-[13px]">
                  <span
                    className="w-9 shrink-0"
                    style={{ color: isTop ? "var(--color-ink)" : "var(--color-ink-soft)", fontWeight: isTop ? 700 : 400 }}
                  >
                    {name}
                  </span>
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full" style={{ backgroundColor: "var(--color-line)" }}>
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${(bar.percent / maxPercent) * 100}%`,
                        backgroundColor: `var(--color-element-${ELEMENT_TOKEN[bar.element]})`,
                        opacity: isTop ? 1 : 0.6,
                      }}
                    />
                  </div>
                  <span
                    className="w-9 shrink-0 text-right tabular-nums"
                    style={{ color: isTop ? "var(--color-ink)" : "var(--color-ink-faint)", fontWeight: isTop ? 700 : 400 }}
                  >
                    {bar.percent}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
