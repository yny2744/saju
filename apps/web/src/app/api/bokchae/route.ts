import { NextRequest, NextResponse } from "next/server";

// 옛 주소(복채 → 엽전으로 이름 변경). 새 주소로 넘긴다.
export function GET(req: NextRequest) {
  return NextResponse.redirect(new URL("/api/yeopjeon", req.url), 308);
}
