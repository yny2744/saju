import { getUserBySessionToken } from "@/server/auth/session";
import { getPersonRow, getPersonSummary, listWrittenTopics } from "@/server/readings/readings";
import { buildPdf } from "./buildPdf";

export type PdfResult = { status: number; json?: unknown; pdf?: Buffer; filename?: string; missing?: string[] };

/**
 * 사주 책자 PDF 내려받기 (수정안 38). 깊게 보기가 열린 운세만 담는다(990냥 운세 보기는 담지 않음).
 * 열렸지만 아직 안 써진 운세가 있으면 409 + missing 목록 → 화면이 그 운세들을 먼저 쓰게 한 뒤 다시 부른다.
 */
export async function handlePdf(token: string | undefined, personId: string, partial = false): Promise<PdfResult> {
  const user = await getUserBySessionToken(token);
  if (!user) return { status: 401, json: { error: { code: "LOGIN_REQUIRED", message: "로그인 후 이용할 수 있어요." } } };
  if (!user.termsAgreed) return { status: 403, json: { error: { code: "CONSENT_REQUIRED", message: "약관 동의 후 이용할 수 있어요." } } };
  const [row, summary] = await Promise.all([getPersonRow(user.id, personId), getPersonSummary(user.id, personId)]);
  if (!row || !summary) return { status: 404, json: { error: { code: "NOT_FOUND", message: "풀이 대상을 찾을 수 없어요." } } };
  if (summary.unlocked.length === 0) return { status: 400, json: { error: { code: "NO_DEEP", message: "깊게 보기를 연 운세가 있어야 책자로 받을 수 있어요." } } };
  const written = await listWrittenTopics(personId);
  const have = new Set(written.map((w) => w.topic));
  const missing = summary.unlocked.filter((t) => !have.has(t));
  // 수정안 42: partial이면 다 못 쓴 운세가 있어도 쓴 것까지로 먼저 묶어 준다 (빠진 것은 다시 받기 때 담김)
  if (missing.length > 0 && !partial) return { status: 409, json: { error: { code: "NOT_WRITTEN", message: "아직 쓰지 않은 운세가 있어요." }, missing } };
  const readings = written.filter((w) => summary.unlocked.includes(w.topic));
  if (readings.length === 0) return { status: 409, json: { error: { code: "NOT_WRITTEN", message: "아직 쓴 운세가 없어요." }, missing } };
  const pdf = await buildPdf({ nickname: row.nickname, header: row.header, saju: row.saju, readings, siteUrl: process.env.SITE_URL });
  return { status: 200, pdf, filename: `${row.nickname}님의 사주 - 류결사주.pdf`, missing };
}

/** 열렸지만 아직 안 써진 운세 목록 (수정안 43: 몰아보기·전부 보기 결제 직후 한 번에 쓰기) */
export async function handleMissing(token: string | undefined, personId: string): Promise<{ status: number; json: unknown }> {
  const user = await getUserBySessionToken(token);
  if (!user) return { status: 401, json: { error: { code: "LOGIN_REQUIRED", message: "로그인 후 이용할 수 있어요." } } };
  const summary = await getPersonSummary(user.id, personId);
  if (!summary) return { status: 404, json: { error: { code: "NOT_FOUND", message: "풀이 대상을 찾을 수 없어요." } } };
  const have = new Set((await listWrittenTopics(personId)).map((w) => w.topic));
  return { status: 200, json: { unlocked: summary.unlocked, missing: summary.unlocked.filter((t) => !have.has(t)) } };
}
