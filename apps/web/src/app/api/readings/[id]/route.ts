import { NextRequest, NextResponse } from "next/server";
import { blockIfAuthOff } from "@/server/launchGuard";
import { SESSION_COOKIE_NAME } from "@/server/auth/session";
import { handleGetReading } from "@/server/readings/readingHandlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 저장된 풀이 보기 (본인 것만) */
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const blocked = blockIfAuthOff();
  if (blocked) return blocked;
  const { status, body } = await handleGetReading(request.cookies.get(SESSION_COOKIE_NAME)?.value, params.id);
  return NextResponse.json(body, { status });
}
