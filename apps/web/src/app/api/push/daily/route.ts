import { NextRequest, NextResponse } from "next/server";
import { cronAuthorized, sendDailyPush } from "@/server/push/push";
import { notifyError } from "@/server/alert";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// 기기가 많으면 오래 걸릴 수 있다 (요금제 한도까지만 쓰이고, 못 보낸 기기는 다음 호출에서 이어서)
export const maxDuration = 60;

/**
 * 매일 아침 오늘의 운세 알림 발송 (2026-11-01 유샘).
 *   Vercel Cron (vercel.json, 한국 시각 아침 8시 30분 무렵) 또는 n8n 이 "Authorization: Bearer <CRON_SECRET>" 을 붙여 부른다.
 *   하루에 여러 번 불려도 기기마다 하루 한 번만 간다.
 */
async function run(request: NextRequest) {
  if (!cronAuthorized(request.headers.get("authorization"))) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "권한이 없어요." } }, { status: 401 });
  }
  try {
    const result = await sendDailyPush();
    return NextResponse.json(result);
  } catch (e) {
    notifyError("아침 알림 발송", e);
    return NextResponse.json({ error: { code: "SERVER_ERROR", message: "발송 중 문제가 생겼어요." } }, { status: 500 });
  }
}

export const GET = run;
export const POST = run;
