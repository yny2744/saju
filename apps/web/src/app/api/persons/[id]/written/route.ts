import { NextRequest, NextResponse } from "next/server";
import { blockIfAuthOff } from "@/server/launchGuard";
import { SESSION_COOKIE_NAME } from "@/server/auth/session";
import { notifyError } from "@/server/alert";
import { handleMissing } from "@/server/pdf/pdfHandler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 열렸지만 아직 안 써진 운세 (수정안 43) */
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const blocked = blockIfAuthOff();
  if (blocked) return blocked;
  try {
    const r = await handleMissing(request.cookies.get(SESSION_COOKIE_NAME)?.value, params.id);
    return NextResponse.json(r.json, { status: r.status, headers: { "Cache-Control": "private, no-store" } });
  } catch (e) {
    notifyError("안 써진 운세 확인", e);
    return NextResponse.json({ error: { code: "SERVER_ERROR", message: "잠시 후 다시 시도해 주세요." } }, { status: 500 });
  }
}
