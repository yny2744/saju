import { NextRequest, NextResponse } from "next/server";
import { recordVisit } from "@/server/admin/visits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 방문 한 번 (무작위 방문 번호만 받는다). DB가 없거나 실패해도 화면에는 영향 없음. */
export async function POST(request: NextRequest) {
  if (!process.env.DATABASE_URL) return NextResponse.json({ ok: false });
  const body = (await request.json().catch(() => null)) as { vid?: unknown } | null;
  if (typeof body?.vid === "string") {
    await recordVisit(body.vid).catch(() => {});
  }
  return NextResponse.json({ ok: true });
}
