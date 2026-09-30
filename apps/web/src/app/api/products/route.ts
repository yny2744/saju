import { NextResponse } from "next/server";
import { PRODUCT_CATALOG } from "@/server/products";

export const runtime = "nodejs";

/**
 * 지시서 4조: "프론트엔드와 서버가 서로 다른 가격을 가지고 있지 않도록 한다."
 * 프론트는 가격/기능 목록을 하드코딩하지 않고 이 API로 서버 카탈로그를 그대로 받아 렌더링한다.
 */
export async function GET() {
  return NextResponse.json({ products: Object.values(PRODUCT_CATALOG) });
}
