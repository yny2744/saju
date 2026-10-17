import { NextRequest, NextResponse } from "next/server";
import { notifyError } from "@/server/alert";
import { PayError, confirmFromWebhook, verifyPortOneWebhook } from "@/server/pay/payOrders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 포트원 웹훅 받는 곳 (2026-10-17). 포트원 관리자 화면 › 결제 연동 › 웹훅에 이 주소를 넣는다:
 *   https://saju-web-khaki.vercel.app/api/pay/webhook
 * Vercel에 PORTONE_WEBHOOK_SECRET이 없으면 받지 않는다(서명 확인 없이 열지 않음).
 */
export async function POST(request: NextRequest) {
  const secret = process.env.PORTONE_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ ok: false, reason: "webhook off" }, { status: 503 });
  const body = await request.text();
  const ok = verifyPortOneWebhook(
    { id: request.headers.get("webhook-id"), timestamp: request.headers.get("webhook-timestamp"), signature: request.headers.get("webhook-signature") },
    body,
    secret
  );
  if (!ok) return NextResponse.json({ ok: false }, { status: 401 });
  try {
    const result = await confirmFromWebhook(JSON.parse(body));
    return NextResponse.json({ ok: true, result });
  } catch (e) {
    // 아직 결제 완료가 아닌 경우 등 - 포트원이 다시 보내 준다
    if (!(e instanceof PayError)) notifyError("포트원 웹훅", e);
    return NextResponse.json({ ok: false }, { status: e instanceof PayError ? 400 : 500 });
  }
}
