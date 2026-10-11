import { NextRequest, NextResponse } from "next/server";
import { blockIfAuthOff } from "@/server/launchGuard";
import { SESSION_COOKIE_NAME } from "@/server/auth/session";
import { notifyError } from "@/server/alert";
import { handlePdf } from "@/server/pdf/pdfHandler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** 사주 책자 PDF 내려받기 (수정안 38) */
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const blocked = blockIfAuthOff();
  if (blocked) return blocked;
  try {
    const r = await handlePdf(request.cookies.get(SESSION_COOKIE_NAME)?.value, params.id);
    if (!r.pdf) return NextResponse.json(r.json, { status: r.status });
    return new NextResponse(new Uint8Array(r.pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="saju.pdf"; filename*=UTF-8''${encodeURIComponent(r.filename ?? "saju.pdf")}`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e) {
    notifyError("PDF 만들기", e);
    return NextResponse.json({ error: { code: "SERVER_ERROR", message: "책자를 만들지 못했어요. 잠시 후 다시 시도해 주세요." } }, { status: 500 });
  }
}
