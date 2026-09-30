import { NextRequest, NextResponse } from "next/server";
import { handleGetFaceResult } from "@/server/face/faceRequestHandlers";

export const runtime = "nodejs";

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const { status, body } = handleGetFaceResult(params.id);
  return NextResponse.json(body, { status });
}
