import { requireAdmin } from "./admin";
import { adminGrant, adminStats, listMembers, memberLedger, recentErrors } from "./adminData";
import { recentPayOrders, payMode } from "@/server/pay/payOrders";

type Out = { status: number; body: unknown };
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const bad = (message: string): Out => ({ status: 400, body: { error: { code: "INVALID_INPUT", message } } });

/** 관리자 화면 한 번에: 숫자 + 확인 기다리는 충전 + 최근 오류 */
export async function handleAdminOverview(token: string | undefined): Promise<Out> {
  const a = await requireAdmin(token);
  // 관리자 아님: 오류(403) 대신 200 + denied 로 돌려준다 (화면이 "등록 방법"을 보여 줄 상태라서)
  if (!a.ok) return a.status === 403 ? { status: 200, body: { denied: true, ...(a.body as object) } } : a;
  const [stats, orders, errors] = await Promise.all([adminStats(), recentPayOrders(), recentErrors()]);
  return { status: 200, body: { me: { id: a.user.id, nickname: a.user.nickname }, stats, orders, errors, payMode: payMode() } };
}

export async function handleAdminMembers(token: string | undefined, q: string): Promise<Out> {
  const a = await requireAdmin(token);
  if (!a.ok) return a;
  return { status: 200, body: { members: await listMembers(q) } };
}

export async function handleAdminMemberLedger(token: string | undefined, userId: string): Promise<Out> {
  const a = await requireAdmin(token);
  if (!a.ok) return a;
  if (!UUID_RE.test(userId)) return bad("회원 번호가 올바르지 않아요.");
  return { status: 200, body: { ledger: await memberLedger(userId) } };
}

export async function handleAdminGrant(token: string | undefined, raw: unknown): Promise<Out> {
  const a = await requireAdmin(token);
  if (!a.ok) return a;
  const b = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  if (typeof b.userId !== "string" || !UUID_RE.test(b.userId)) return bad("회원 번호가 올바르지 않아요.");
  const ok = await adminGrant(b.userId, b.amount, b.reason);
  if (!ok) return bad("금액(0이 아닌 정수, 100만 냥 이하)이나 회원을 확인해 주세요.");
  return { status: 200, body: { ok: true } };
}
