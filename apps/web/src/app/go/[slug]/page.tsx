import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BRAND, TENANT } from "@/tenants";
import { GATES, gateBySlug } from "@/lib/gates";
import { GateOverlay } from "@/components/gate/GateOverlay";
import SuneungLanding from "@/app/suneung/page";
import CouplePage from "@/app/couple/page";
import FunPage from "@/app/fun/[kind]/page";
import { StartScreen } from "@/components/start/StartScreen";
import { NewYear2027Landing } from "@/components/newyear/NewYear2027Landing";
import { nyOn } from "@/lib/newyear2027";

/**
 * 관별 링크 대문 (2026-11-02 유샘 지시서) - /go/suneung · /go/newyear2027 · /go/gunghap · /go/tarot (설정: lib/gates.ts)
 *   관 화면을 메인에서 들어갈 때와 똑같은 컴포넌트로 그리고, 그 위를 영상 대문(GateOverlay)이 덮는다.
 *   단추를 눌러 문이 열리면 대문만 걷혀서, 같은 화면에서 관 맨 위 홍보 영상이 소리와 함께 이어진다.
 */

export const revalidate = 3600;
export const dynamicParams = false;

export function generateStaticParams() {
  return GATES.map((g) => ({ slug: g.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const g = gateBySlug(params.slug);
  if (!g) return {};
  const site = TENANT.gate?.title ?? BRAND;
  return { title: `${g.title} · ${site}`, description: g.imageLine ?? `${g.title} - ${site}` };
}

export default function GoGatePage({ params }: { params: { slug: string } }) {
  const g = gateBySlug(params.slug);
  if (!g) notFound();
  const brand = TENANT.gate?.title ?? BRAND;
  const emblem = TENANT.gate?.emblem ?? `/icons/${TENANT.id}/icon-192.png`;
  const room =
    g.room === "suneung" ? (
      <SuneungLanding />
    ) : g.room === "gunghap" ? (
      <CouplePage />
    ) : g.room === "tarot" ? (
      <FunPage params={{ kind: "tarot" }} />
    ) : nyOn() ? (
      // 2026-11-08 유샘: 2027 신년운도 수능대박운처럼 대문을 먼저 - 문이 열리면 신년 영상이 처음부터 소리와 함께 (NewYear2027Landing)
      <NewYear2027Landing />
    ) : (
      // 2026-11-03 관 통일: 2027 신년 운세 → 올해 운세관 화면(입력 칸 바로), 2027년 정미년으로 고정 (신년운 상품이 없는 고객사)
      <StartScreen preset="topic=year&y=2027" />
    );
  return (
    <>
      <GateOverlay entry={g} brand={brand} emblem={emblem} />
      {room}
    </>
  );
}
