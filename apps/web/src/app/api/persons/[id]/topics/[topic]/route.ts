import { NextRequest } from "next/server";
import { memberRoute } from "@/server/routeHelpers";
import { handleTopic } from "@/server/readings/readingHandlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// 깊은 풀이 한 주제를 쓰는 데 수십 초 걸릴 수 있다
export const maxDuration = 60;

/** 깊은 풀이 보기 (없으면 pending) */
export async function GET(request: NextRequest, { params }: { params: { id: string; topic: string } }) {
  return memberRoute(request, "깊은 풀이 보기", (token) => handleTopic(token, params.id, params.topic, false));
}

/** 깊은 풀이 쓰기 (이미 있으면 그대로) */
export async function POST(request: NextRequest, { params }: { params: { id: string; topic: string } }) {
  return memberRoute(request, "깊은 풀이 쓰기", (token) => handleTopic(token, params.id, params.topic, true));
}
