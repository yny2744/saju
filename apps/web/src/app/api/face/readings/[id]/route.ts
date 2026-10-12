import { NextRequest, NextResponse } from "next/server";
import { memberRoute } from "@/server/routeHelpers";
import { handleGetFaceReading } from "@/server/face/faceReadings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 관상 심층 풀이 화면 상태 (locked · write · ready) */
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const res: NextResponse = await memberRoute(request, "관상 풀이 불러오기", (token) => handleGetFaceReading(token, params.id));
  res.headers.set("Cache-Control", "private, no-store");
  return res;
}
