import { NextRequest, NextResponse } from "next/server";
import { blockIfAuthOff } from "@/server/launchGuard";
import { SESSION_COOKIE_NAME } from "@/server/auth/session";
import { handleCreateReading } from "@/server/readings/readingHandlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// AI 풀이(세 묶음 병렬)가 수십 초 걸릴 수 있다
export const maxDuration = 60;

/** 990원 사주보기 만들기 (복채 차감) */
export async function POST(request: NextRequest) {
  const blocked = blockIfAuthOff();
  if (blocked) return blocked;
  const rawBody = await request.json().catch(() => null);
  const { status, body } = await handleCreateReading(request.cookies.get(SESSION_COOKIE_NAME)?.value, rawBody);
  return NextResponse.json(body, { status });
}
