import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BRAND, TENANT } from "@/tenants";
import { IntroCards } from "@/components/landing/IntroCards";

/**
 * 「류결의 명견만리란?」 (2026-11-10 유샘) - 머리줄의 대문 이름 옆 물음표를 누르면 오는 화면.
 *   사이트의 정체성을 보여 주는 소개 카드만 모아 옆으로 넘겨 본다. 마지막에 "운세 보러 가기"로 대문에 돌아간다.
 *   대문(gate)이 없는 고객사는 소개 카드가 없으니 처음 화면으로 보낸다.
 */

export function generateMetadata(): Metadata {
  const name = TENANT.gate?.title ?? BRAND;
  return { title: `${name}란? · ${BRAND}`, description: TENANT.gate?.intro.tagline ?? `${name} 소개` };
}

export default function AboutPage() {
  if (!TENANT.gate) redirect("/");
  const g = TENANT.gate;
  return (
    <main className="min-h-screen pb-12">
      <div className="mx-auto max-w-xl px-5">
        <div className="pt-6 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element -- 엠블럼 */}
          <img src={g.emblem} alt="" width={72} height={72} className="mx-auto h-[72px] w-[72px]" />
          <h1 className="mt-3 text-[26px] font-bold" style={{ fontFamily: "var(--font-serif)" }}>
            {g.title}란?
          </h1>
          <p className="mt-1 text-[13.5px]" style={{ color: "var(--color-ink-soft)", wordBreak: "keep-all" }}>
            {g.intro.tagline}
          </p>
        </div>
        <div className="mt-5">
          <IntroCards />
        </div>
        <a href="/" className="btn-primary mt-6 block text-center">
          운세 보러 가기
        </a>
      </div>
    </main>
  );
}
