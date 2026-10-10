import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** 2026-10-10: 선불 충전 없음 (수정안 31) */
export const DELETE = () => NextResponse.json({ error: { code: "GONE", message: "충전 기능은 없어요." } }, { status: 410 });
