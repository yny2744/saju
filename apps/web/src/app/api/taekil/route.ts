import { NextRequest, NextResponse } from "next/server";
import { handleTaekil } from "@/server/taekil/taekilService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 택일관 (2026-11-01) - 로그인 없음, AI 없음, 저장 없음 */
export async function POST(request: NextRequest) {
  const raw = await request.json().catch(() => null);
  const key = request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? "unknown";
  const { status, body } = handleTaekil(raw, key);
  return NextResponse.json(body, { status });
}
