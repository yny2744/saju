import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BRAND, TENANT } from "@/tenants";
import { GateHero } from "@/components/gate/GateHero";

/**
 * 「류결의 명견만리란?」 (2026-11-10 유샘) - 머리줄의 대문 이름 옆 물음표를 누르면 오는 화면.
 *   정문 대문 첫 화면과 똑같이 (제목 · 三道 流結 七運 · 소개 카드가 3초마다 넘어감). 건너뛰기는 정문으로.
 *   대문(gate)이 없는 고객사는 소개 카드가 없으니 처음 화면으로 보낸다.
 */

export function generateMetadata(): Metadata {
  const name = TENANT.gate?.title ?? BRAND;
  return { title: `${name}란? · ${BRAND}`, description: TENANT.gate?.intro.tagline ?? `${name} 소개` };
}

export default function AboutPage() {
  if (!TENANT.gate) redirect("/");
  return (
    <main className="min-h-screen">
      <GateHero gate={TENANT.gate} brand={BRAND} skipHref="/" />
    </main>
  );
}
