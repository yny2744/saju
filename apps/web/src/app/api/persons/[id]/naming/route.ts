import { NextRequest, NextResponse } from "next/server";
import { blockIfAuthOff } from "@/server/launchGuard";
import { SESSION_COOKIE_NAME } from "@/server/auth/session";
import { notifyError } from "@/server/alert";
import { handleCreateNaming, handleGetNaming } from "@/server/naming/naming";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** 아이 작명·개명 추천 (수정안 46) - GET ?kind= : 상태·결과, POST {kind, surnameHanja?, dollim?, redo?} : 후보 만들기 */
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const blocked = blockIfAuthOff();
  if (blocked) return blocked;
  try {
    const r = await handleGetNaming(request.cookies.get(SESSION_COOKIE_NAME)?.value, params.id, request.nextUrl.searchParams.get("kind"));
    return NextResponse.json(r.body, { status: r.status, headers: { "Cache-Control": "private, no-store" } });
  } catch (e) {
    notifyError("작명 불러오기", e);
    return NextResponse.json({ error: { code: "SERVER_ERROR", message: "잠시 후 다시 시도해 주세요." } }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const blocked = blockIfAuthOff();
  if (blocked) return blocked;
  try {
    const body = await request.json().catch(() => ({}));
    const r = await handleCreateNaming(request.cookies.get(SESSION_COOKIE_NAME)?.value, params.id, body);
    return NextResponse.json(r.body, { status: r.status });
  } catch (e) {
    notifyError("작명 후보 만들기", e);
    return NextResponse.json({ error: { code: "SERVER_ERROR", message: "이름을 고르는 중 문제가 생겼어요. 다시 눌러 주세요. 엽전은 빠지지 않아요." } }, { status: 500 });
  }
}
