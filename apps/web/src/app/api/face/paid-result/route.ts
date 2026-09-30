import { NextRequest, NextResponse } from "next/server";
import { handleGetFacePaidResult } from "@/server/face/faceRequestHandlers";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const entitlement = request.nextUrl.searchParams.get("entitlement");
  const { status, body } = await handleGetFacePaidResult(entitlement);
  return NextResponse.json(body, { status });
}
