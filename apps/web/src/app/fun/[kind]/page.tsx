import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BRAND } from "@/tenants";
import { FUN_KINDS, FUN_META, isFunKind } from "@/lib/fun/types";
import { FunTool } from "@/components/fun/FunTool";

/** 무료 묶음 (2026-10-26) - /fun/numerology · /fun/zodiac · /fun/blood · /fun/flower · /fun/birthstone (로그인 없음, AI 없음) */

export function generateStaticParams() {
  return FUN_KINDS.map((kind) => ({ kind }));
}

export function generateMetadata({ params }: { params: { kind: string } }): Metadata {
  if (!isFunKind(params.kind)) return {};
  const m = FUN_META[params.kind];
  return { title: `${m.title} · ${BRAND}`, description: m.desc };
}

export default function FunPage({ params }: { params: { kind: string } }) {
  if (!isFunKind(params.kind)) notFound();
  return <FunTool kind={params.kind} />;
}
