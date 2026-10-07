import { NextRequest, NextResponse } from "next/server";
import { handleFaceAnalyzeRequest } from "@/server/face/faceRequestHandlers";
import { clientKeyOf } from "@/server/httpUtils";

// Node.js 런타임 명시 (crypto 모듈 사용 - faceResultStore.ts의 AES-256-GCM 암호화).
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

  const { status, body } = handleFaceAnalyzeRequest(rawBody, clientKeyOf(request));
  return NextResponse.json(body, { status });
}
