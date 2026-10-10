import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** 2026-10-10: 선불 충전은 하지 않기로 함 (수정안 31) - 운세를 살 때 모자란 만큼만 결제한다 */
const gone = () => NextResponse.json({ error: { code: "GONE", message: "충전 없이, 운세를 살 때 모자란 만큼만 결제해요." } }, { status: 410 });
export const GET = gone;
export const POST = gone;
