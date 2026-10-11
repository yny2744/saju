import { getUserBySessionToken } from "@/server/auth/session";
import { getPersonRow, getPersonSummary, listWrittenTopics } from "@/server/readings/readings";
import { buildPdf } from "./buildPdf";

export type PdfResult = { status: number; json?: unknown; pdf?: Buffer; filename?: string };

/**
 * 사주 책자 PDF 내려받기 (수정안 38). 깊게 보기가 열린 운세만 담는다(990냥 운세 보기는 담지 않음).
 * 열렸지만 아직 안 써진 운세가 있으면 409 + missing 목록 → 화면이 그 운세들을 먼저 쓰게 한 뒤 다시 부른다.
 */
export async function handlePdf(token: string | undefined, personId: string): Promise<PdfResult> {
  const user = await getUserBySessionToken(token);
  if (!user) return { status: 401, json: { error: { code: "LOGIN_REQUIRED", message: "로그인 후 이용할 수 있어요." } } };
  if (!user.termsAgreed) return { status: 403, json: { error: { code: "CONSENT_REQUIRED", message: "약관 동의 후 이용할 수 있어요." } } };
  const [row, summary] = await Promise.all([getPersonRow(user.id, personId), getPersonSummary(user.id, personId)]);
  if (!row || !summary) return { status: 404, json: { error: { code: "NOT_FOUND", message: "풀이 대상을 찾을 수 없어요." } } };
  if (summary.unlocked.length === 0) return { status: 400, json: { error: { code: "NO_DEEP", message: "깊게 보기를 연 운세가 있어야 책자로 받을 수 있어요." } } };
  const written = await listWrittenTopics(personId);
  const have = new Set(written.map((w) => w.topic));
  const missing = summary.unlocked.filter((t) => !have.has(t));
  if (missing.length > 0) return { status: 409, json: { error: { code: "NOT_WRITTEN", message: "아직 쓰지 않은 운세가 있어요." }, missing } };
  const readings = written.filter((w) => summary.unlocked.includes(w.topic));
  const pdf = await buildPdf({ nickname: row.nickname, header: row.header, saju: row.saju, readings, siteUrl: process.env.SITE_URL });
  return { status: 200, pdf, filename: `${row.nickname}님의 사주 - 류결사주.pdf` };
}
