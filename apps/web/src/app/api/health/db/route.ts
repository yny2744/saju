import { NextResponse } from "next/server";
import { db } from "@/server/auth/db";

export const runtime = "nodejs";
// 접속할 때마다 실제로 DB에 붙어 봐야 하므로 빌드 때 미리 만들어 두면 안 된다
export const dynamic = "force-dynamic";

/**
 * DB 연결 확인 주소 (수정안 3번 준비용) - /api/health/db
 *
 * 로그인 스위치를 켜기 전에 DATABASE_URL이 제대로 들어갔는지만 따로 확인한다.
 * 보여주는 것: 성공/실패, 실패 이유 분류, 만들어진 표 이름.
 * 보여주지 않는 것: 연결 주소·비밀번호·호스트 등 비밀값, 회원 데이터.
 * 처음 성공하면 회원용 표(users, sessions, saju_profiles)가 자동으로 만들어진다(이미 있으면 그대로).
 */

const HINTS: Record<string, string> = {
  NO_URL: "Vercel 환경변수에 DATABASE_URL이 없어요. 이름 철자와 Production 적용 여부를 확인하고 재배포해 주세요.",
  "28P01": "DB 비밀번호가 맞지 않아요. Neon에서 연결 주소를 다시 복사해 DATABASE_URL 값을 바꿔 주세요.",
  "3D000": "주소 안의 데이터베이스 이름이 없어요. Neon에서 연결 주소를 다시 복사해 주세요.",
  ENOTFOUND: "DB 주소(호스트)를 찾을 수 없어요. 주소가 잘리거나 앞뒤에 공백이 들어갔는지 확인해 주세요.",
  ECONNREFUSED: "DB가 연결을 거부했어요. Neon 프로젝트가 살아 있는지 확인해 주세요.",
  TIMEOUT: "DB 응답이 너무 늦어요. 잠시 후 다시 열어 보고, 계속되면 Neon 상태를 확인해 주세요.",
  UNKNOWN: "알 수 없는 이유로 연결에 실패했어요. 이 화면을 캡처해서 지니에게 보여 주세요.",
};

function classify(err: unknown): string {
  const e = err as { code?: string; message?: string };
  if (e?.message?.includes("DATABASE_URL")) return "NO_URL";
  if (e?.code && HINTS[e.code]) return e.code;
  if (e?.message === "TIMEOUT") return "TIMEOUT";
  return "UNKNOWN";
}

export async function GET() {
  const started = Date.now();
  try {
    const result = await Promise.race([
      (async () => {
        const pool = await db();
        const tables = await pool.query<{ table_name: string }>(
          `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`
        );
        return tables.rows.map((r) => r.table_name);
      })(),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("TIMEOUT")), 8000)),
    ]);
    return NextResponse.json({
      ok: true,
      message: "DB 연결 성공 ✓",
      tables: result,
      ms: Date.now() - started,
    });
  } catch (err) {
    const code = classify(err);
    // eslint-disable-next-line no-console
    console.error("[health/db] DB 연결 확인 실패:", code, err);
    return NextResponse.json({ ok: false, message: "DB 연결 실패", reason: code, hint: HINTS[code] }, { status: 503 });
  }
}
