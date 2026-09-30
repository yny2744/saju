import { NextRequest, NextResponse } from "next/server";
import { handleCreateOrder } from "@/server/paymentRequestHandlers";
import { clientKeyOf } from "@/server/httpUtils";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "INVALID_INPUT", message: "요청 본문이 올바른 JSON이 아닙니다." } },
      { status: 400 }
    );
  }
  const { status, body } = await handleCreateOrder(rawBody, clientKeyOf(request));
  return NextResponse.json(body, { status });
}
