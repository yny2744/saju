import { NextRequest, NextResponse } from "next/server";
import { blockIfAuthOff } from "@/server/launchGuard";
import { SESSION_COOKIE_NAME } from "@/server/auth/session";
import { handleBokchaeSummary } from "@/server/readings/readingHandlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 내 복채 잔액·이용내역·초대 코드·저장된 풀이 */
export async function GET(request: NextRequest) {
  const blocked = blockIfAuthOff();
  if (blocked) return blocked;
  const { status, body } = await handleBokchaeSummary(request.cookies.get(SESSION_COOKIE_NAME)?.value);
  return NextResponse.json(body, { status });
}
