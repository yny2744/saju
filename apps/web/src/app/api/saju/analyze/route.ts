import { NextRequest, NextResponse } from "next/server";
import { requireMemberIfLoginRequired } from "@/server/memberGate";
import { handleAnalyzeRequest } from "@/server/requestHandlers";

// Node.js 런타임 명시 (Saju Engine이 lunar-javascript 등 Node 대상 계산을 수행하므로 Edge 런타임을 쓰지 않는다).
export const runtime = "nodejs";

function clientKeyOf(request: NextRequest): string {
  return request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? "unknown";
}

export async function POST(request: NextRequest) {
  const gate = await requireMemberIfLoginRequired(request);
  if (gate) return gate;

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "INVALID_INPUT", message: "요청 본문이 올바른 JSON이 아닙니다." } },
      { status: 400 }
    );
  }

  const { status, body } = await handleAnalyzeRequest(rawBody, clientKeyOf(request));
  return NextResponse.json(body, { status });
}
