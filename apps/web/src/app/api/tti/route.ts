import { NextRequest, NextResponse } from "next/server";
import { getTodayKstDateString } from "saju-engine";
import { ttiDay } from "@/server/ttiService";
import { nextDate } from "@/lib/tti";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 띠별 운세 데이터 (무료, 로그인 없음). 영상 자동화(n8n) 등에서 불러 쓴다.
 *   /api/tti              → 오늘(한국 시간)
 *   /api/tti?day=tomorrow → 내일
 *   /api/tti?date=2026-10-09 → 그 날짜 (2000~2100년)
 */
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams;
  const today = getTodayKstDateString();
  let date = q.get("day") === "tomorrow" ? nextDate(today) : today;
  const asked = q.get("date");
  if (asked) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(asked) || Number(asked.slice(0, 4)) < 2000 || Number(asked.slice(0, 4)) > 2100) {
      return NextResponse.json({ error: { code: "INVALID_DATE", message: "날짜는 YYYY-MM-DD 형식(2000~2100년)으로 보내 주세요." } }, { status: 400 });
    }
    date = asked;
  }
  try {
    return NextResponse.json(ttiDay(date), { headers: { "Cache-Control": "public, max-age=600" } });
  } catch {
    return NextResponse.json({ error: { code: "INVALID_DATE", message: "없는 날짜예요." } }, { status: 400 });
  }
}
