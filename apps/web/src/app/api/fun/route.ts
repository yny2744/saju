import { NextRequest, NextResponse } from "next/server";
import { handleFun } from "@/server/fun/funService";

// saju-engine(lunar-javascript)이 Node 대상이라 Edge 런타임을 쓰지 않는다.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clientKeyOf(request: NextRequest): string {
  return request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? "unknown";
}

/** 무료 묶음 (수비학·별자리·혈액형·탄생화) + 사주 겹쳐 보기 - 로그인 없음, AI 없음, 저장 없음 */
export async function POST(request: NextRequest) {
  const raw = await request.json().catch(() => null);
  const { status, body } = handleFun(raw, clientKeyOf(request));
  return NextResponse.json(body, { status });
}
