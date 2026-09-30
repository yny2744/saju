import { NextRequest, NextResponse } from "next/server";
import { handleFortuneRequest } from "@/server/fortuneHandlers";

// saju-engine이 lunar-javascript 등 Node 대상 계산을 수행하므로 Edge 런타임을 쓰지 않는다.
export const runtime = "nodejs";

// /api/saju/analyze/route.ts의 clientKeyOf()와 동일한 방식 (배포 전 최종 수정 지시서 5조).
function clientKeyOf(request: NextRequest): string {
  return request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? "unknown";
}

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

  const { status, body } = handleFortuneRequest(rawBody, clientKeyOf(request));
  return NextResponse.json(body, { status });
}
