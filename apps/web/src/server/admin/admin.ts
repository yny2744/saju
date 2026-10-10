import type { User } from "@/server/auth/users";
import { getUserBySessionToken } from "@/server/auth/session";

/**
 * 관리자 확인 (2026-10-10 수정안 26).
 * Vercel 환경변수 ADMIN_USER_IDS 에 회원 번호(쉼표로 여러 개)를 넣은 계정만 관리자다.
 * 관리자 번호는 로그인한 채로 /admin 에 들어가면 화면에 보인다 (자기 번호만).
 */
export function adminIds(env: string | undefined = process.env.ADMIN_USER_IDS): Set<string> {
  return new Set(
    (env ?? "")
      .split(/[\s,]+/)
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
  );
}

export function isAdminUser(user: Pick<User, "id"> | null, env?: string): boolean {
  return !!user && adminIds(env).has(user.id.toLowerCase());
}

export type AdminCheck = { ok: true; user: User } | { ok: false; status: number; body: unknown };

export async function requireAdmin(token: string | undefined): Promise<AdminCheck> {
  const user = await getUserBySessionToken(token);
  if (!user) return { ok: false, status: 401, body: { error: { code: "LOGIN_REQUIRED", message: "로그인 후 이용할 수 있어요." } } };
  if (!isAdminUser(user))
    return { ok: false, status: 403, body: { error: { code: "NOT_ADMIN", message: "관리자만 볼 수 있어요." }, myId: user.id, configured: adminIds().size > 0 } };
  return { ok: true, user };
}
