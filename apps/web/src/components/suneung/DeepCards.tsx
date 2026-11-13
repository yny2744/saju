import Link from "next/link";
import { PRICE } from "@/lib/yeopjeon";
import { formatWon } from "@/lib/pricingList";
import { SaleNote } from "@/components/SaleNote";
import { isOnSale } from "@/lib/sale";

/**
 * 수능 심층분석 카드 네 장 (2026-11-12 유샘) - 기본 풀이까지 본 손님에게 한 화면에 2×2 정사각 카드로.
 *   1 수능대박운 심층분석(지금의 깊게 보기) · 2~4 각 5,500원 · 네 가지 모두 보기 16,500원(3+1) - 2026-11-13 유샘 승인으로 결제 연결.
 *   가격(prices.EXAM_EXTRA·EXAM_ALL)이 없거나 판매 잠금(saleOnly)에서 빠지면 "곧 열려요".
 *   그림 위 글자는 화면에서 얹는다 - 문구·가격을 바꿔도 그림을 다시 만들 필요가 없게.
 */

const GOLD = "#d4b265";

type Deep = { img: string; stamp: string; title: string; desc: string; open: boolean; path: string };

// 2026-11-13 유샘 승인: 2~4·네 가지 모두 보기 결제 연결 - 가격이 있고 판매 잠금에 들어 있을 때만 열린다
const extraOpen = (mode: string) => !!PRICE.EXAM_EXTRA && isOnSale(mode);

const DEEPS: Deep[] = [
  { img: "/promo/deep-1.jpg", stamp: "試", title: "수능대박운 심층분석", desc: "공부 체질 · 시험날 기운", open: true, path: "exam" },
  { img: "/promo/deep-2.jpg", stamp: "志", title: "목표 성취운", desc: "목표와 타고난 기질의 조화", open: extraOpen("exam_goal"), path: "exam/x/goal" },
  { img: "/promo/deep-3.jpg", stamp: "集", title: "집중과 몰입운", desc: "몰입을 높이는 환경과 방식", open: extraOpen("exam_focus"), path: "exam/x/focus" },
  { img: "/promo/deep-4.jpg", stamp: "安", title: "시험 컨디션 안정운", desc: "긴장을 다스리는 나만의 방향", open: extraOpen("exam_calm"), path: "exam/x/calm" },
];

/**
 * personId 가 있으면 그 사람의 상품 화면으로 바로 가고(기본 풀이를 본 뒤),
 * 없으면 onPick(경로) 으로 알린다 - 랜딩의 [시험날 깊게 보기]에서 상품부터 고르고 사람은 그다음에 (2026-11-13 유샘 시안)
 */
export function DeepCards({ personId, onPick }: { personId?: string; onPick?: (path: string) => void }) {
  const price = formatWon(PRICE.EXAM_DEEP);
  const extraPrice = formatWon(PRICE.EXAM_EXTRA ?? PRICE.EXAM_DEEP);
  return (
    <section className="mt-5">
      <p className="text-center text-[12px] tracking-[0.2em]" style={{ color: GOLD }}>
        심층분석
      </p>
      <p className="mt-1 text-center text-[19px] font-bold" style={{ fontFamily: "var(--font-serif)" }}>
        더 깊이 알고 싶은 것을 골라 보세요
      </p>
      <SaleNote k="EXAM_DEEP" unit="원" />
      <div className="mt-3 grid grid-cols-2 gap-2.5">
        {DEEPS.map((d) => {
          const inner = (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element -- 카드 그림 */}
              <img src={d.img} alt="" className="absolute inset-0 h-full w-full object-cover" style={d.open ? undefined : { filter: "brightness(.8)" }} />
              <span aria-hidden className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0) 34%, rgba(8,12,28,.62) 58%, rgba(8,12,28,.92) 84%)" }} />
              <span
                aria-hidden
                className="absolute left-[7px] top-[7px] flex h-[27px] w-[27px] items-center justify-center rounded-full text-[13.5px] font-bold"
                style={{ backgroundColor: "rgba(19,32,63,.88)", border: `1.5px solid ${GOLD}`, color: "#f2d48a", fontFamily: "var(--font-serif)" }}
              >
                {d.stamp}
              </span>
              {!d.open && (
                <span className="absolute right-[7px] top-[7px] rounded-[10px] px-[7px] py-px text-[10.5px]" style={{ backgroundColor: "rgba(19,32,63,.85)", border: `1px solid ${GOLD}`, color: "#f3e7c6" }}>
                  곧 열려요
                </span>
              )}
              <span className="absolute bottom-[9px] left-[10px] right-[8px]" style={{ color: "#fff", textShadow: "0 2px 5px rgba(0,0,0,.75)" }}>
                <span className="block whitespace-nowrap text-[14.5px] font-bold leading-[1.25] tracking-[-0.02em]" style={{ fontFamily: "var(--font-serif)", wordBreak: "keep-all" }}>
                  {d.title}
                </span>
                <span className="mt-0.5 block truncate text-[10.5px] leading-[1.3]" style={{ color: "#f0e2bf", wordBreak: "keep-all" }}>
                  {d.desc}
                </span>
                <span className="mt-1 block text-[13px] font-bold" style={{ color: "#f6dfa0" }}>
                  {d.stamp === "試" ? price : extraPrice}
                </span>
              </span>
            </>
          );
          const cls = "relative block aspect-square overflow-hidden rounded-[14px]";
          const style = { border: "1.5px solid #cfa95c", boxShadow: "0 3px 8px rgba(60,40,10,.22)" } as const;
          if (d.open && !personId)
            return (
              <button key={d.stamp} type="button" onClick={() => onPick?.(d.path)} className={`${cls} text-left transition-transform active:scale-[0.98]`} style={style}>
                {inner}
              </button>
            );
          return d.open ? (
            <Link key={d.stamp} href={`/person/${encodeURIComponent(personId ?? "")}/${d.path}`} className={`${cls} transition-transform active:scale-[0.98]`} style={style}>
              {inner}
            </Link>
          ) : (
            <div key={d.stamp} className={cls} style={style} aria-disabled>
              {inner}
            </div>
          );
        })}
      </div>
      {PRICE.EXAM_ALL && isOnSale("exam_all") && !personId ? (
        <button
          type="button"
          onClick={() => onPick?.("exam/x/all")}
          className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-xl px-3 py-3.5 text-[15px] font-bold"
          style={{ border: `1.5px solid ${GOLD}`, backgroundColor: "#13203f", color: "#f3e7c6", wordBreak: "keep-all" }}
        >
          네 가지 모두 보기 · {formatWon(PRICE.EXAM_ALL)}
          <span className="rounded-[10px] px-[7px] py-px text-[11px] font-normal" style={{ backgroundColor: GOLD, color: "#13203f" }}>
            3+1
          </span>
        </button>
      ) : PRICE.EXAM_ALL && isOnSale("exam_all") ? (
        <Link
          href={`/person/${encodeURIComponent(personId ?? "")}/exam/x/all`}
          className="mt-2.5 flex items-center justify-center gap-2 rounded-xl px-3 py-3.5 text-[15px] font-bold"
          style={{ border: `1.5px solid ${GOLD}`, backgroundColor: "#13203f", color: "#f3e7c6", wordBreak: "keep-all" }}
        >
          네 가지 모두 보기 · {formatWon(PRICE.EXAM_ALL)}
          <span className="rounded-[10px] px-[7px] py-px text-[11px] font-normal" style={{ backgroundColor: GOLD, color: "#13203f" }}>
            3+1
          </span>
        </Link>
      ) : (
        <div
          aria-disabled
          className="mt-2.5 flex items-center justify-center gap-2 rounded-xl px-3 py-3.5 text-[15px] font-bold"
          style={{ border: `1.5px dashed ${GOLD}`, color: "var(--color-ink-soft)", wordBreak: "keep-all" }}
        >
          네 가지 모두 보기 · {formatWon(PRICE.EXAM_DEEP * 3)}
          <span className="rounded-[10px] px-[7px] py-px text-[11px] font-normal" style={{ backgroundColor: "#13203f", color: "#f3e7c6" }}>
            곧 열려요
          </span>
        </div>
      )}
    </section>
  );
}
