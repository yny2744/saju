import { NextRequest, NextResponse } from "next/server";
import { blockIfAuthOff } from "@/server/launchGuard";
import { SESSION_COOKIE_NAME, getUserBySessionToken } from "@/server/auth/session";
import { notifyError } from "@/server/alert";
import { getPersonRow } from "@/server/readings/readings";
import { getBusinessReport } from "@/server/naming/business";
import { buildBusinessPdf } from "@/server/pdf/buildBusinessPdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** 상호 작명서 PDF (수정안 63) */
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const blocked = blockIfAuthOff();
  if (blocked) return blocked;
  try {
    const user = await getUserBySessionToken(request.cookies.get(SESSION_COOKIE_NAME)?.value);
    if (!user) return NextResponse.json({ error: { code: "LOGIN_REQUIRED", message: "로그인 후 이용할 수 있어요." } }, { status: 401 });
    const row = await getPersonRow(user.id, params.id);
    if (!row) return NextResponse.json({ error: { code: "NOT_FOUND", message: "대표자 사주를 찾을 수 없어요." } }, { status: 404 });
    const report = await getBusinessReport(row.id);
    if (!report) return NextResponse.json({ error: { code: "NOT_WRITTEN", message: "아직 상호 후보를 받지 않았어요." } }, { status: 409 });
    const pdf = await buildBusinessPdf({ report, nickname: row.nickname, header: row.header, saju: row.saju, siteUrl: process.env.SITE_URL });
    const filename = `${row.nickname}님 상호 작명서 - 류결사주.pdf`;
    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="business.pdf"; filename*=UTF-8''${encodeURIComponent(filename)}`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e) {
    notifyError("상호 작명서 PDF", e);
    return NextResponse.json({ error: { code: "SERVER_ERROR", message: "작명서를 만들지 못했어요. 잠시 후 다시 시도해 주세요." } }, { status: 500 });
  }
}
