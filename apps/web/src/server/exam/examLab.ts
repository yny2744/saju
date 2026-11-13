import { AnthropicCompletionProvider, GeminiCompletionProvider, calculateSaju, getCurrentKstYear } from "saju-engine";
import type { CompletionProvider } from "saju-engine";
import { requireAdmin } from "@/server/admin/admin";
import { READING_CLAUDE_MODEL, SYSTEM } from "@/server/readings/generateReading";
import { sajuFacts } from "@/lib/sajuFacts";
import { kstDateString } from "@/lib/manseView";
import { buildExamDeepPrompt, examCheckFacts, parseExamDeep } from "./exam";
import { EXAM_EXTRA, buildExamExtraPrompt, isExamExtraKey } from "./examExtra";

/**
 * 관리자 시험 화면 (2026-11-12 유샘) - 같은 사주·같은 지시문으로 AI 모델별 풀이를 나란히 뽑아 본다.
 *   결제·저장 없음. 손님에게 보이지 않는다. 키가 있는 모델만 돈다.
 */

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;

export const LAB_PRODUCTS: Record<string, string> = { exam_deep: "수능대박운 심층분석", ...Object.fromEntries(Object.entries(EXAM_EXTRA).map(([k, v]) => [k, v.title])) };

function labProviders(): Array<{ id: string; make: () => CompletionProvider }> {
  const out: Array<{ id: string; make: () => CompletionProvider }> = [];
  // 2026-11-13: 운영 사이트에서 시험할 때는 시험 전용 키(LAB_ANTHROPIC_API_KEY)만 쓴다 - 손님 풀이·관상은 그대로 Gemini
  const claudeKey = process.env.LAB_ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY;
  if (claudeKey) out.push({ id: "claude", make: () => new AnthropicCompletionProvider({ apiKey: claudeKey, model: process.env.SAJU_READING_MODEL || READING_CLAUDE_MODEL, maxTokens: 9000 }) });
  if (process.env.GEMINI_API_KEY) out.push({ id: "gemini", make: () => new GeminiCompletionProvider({ maxOutputTokens: 9000 }) });
  return out;
}

type Out = { status: number; body: unknown };

export async function handleExamLab(token: string | undefined, raw: unknown): Promise<Out> {
  const a = await requireAdmin(token);
  if (!a.ok) return a;
  const b = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  const date = String(b.date ?? "");
  const time = typeof b.time === "string" && TIME_RE.test(b.time) ? b.time : undefined;
  const gender = b.gender === "female" ? "female" : "male";
  const product = String(b.product ?? "");
  if (!DATE_RE.test(date)) return { status: 400, body: { error: { message: "생년월일을 확인해 주세요 (예: 2008-03-15)." } } };
  if (product !== "exam_deep" && !isExamExtraKey(product)) return { status: 400, body: { error: { message: "상품을 골라 주세요." } } };

  let saju;
  try {
    saju = calculateSaju({ calendarType: "solar", date, time, gender }, getCurrentKstYear());
  } catch {
    return { status: 400, body: { error: { message: "없는 날짜예요." } } };
  }
  const today = kstDateString();
  const prompt = product === "exam_deep" ? buildExamDeepPrompt(saju, today, null) : buildExamExtraPrompt(saju, product, today);
  const sf = sajuFacts(saju, today);
  const allowed = sf.daeunList.map((d) => d.ganzhi);
  const facts = examCheckFacts(saju, today);

  const providers = labProviders();
  if (providers.length === 0) return { status: 503, body: { error: { message: "이 환경에는 AI 키가 없어요." } } };

  const results = await Promise.all(
    providers.map(async ({ id, make }) => {
      const p = make();
      const t0 = Date.now();
      try {
        const text = await p.complete(SYSTEM, prompt);
        const ms = Date.now() - t0;
        let parsed: { summary: string; parts: Array<{ heading: string; body: string }> } | null = null;
        let check = "통과";
        try {
          parsed = parseExamDeep(text, allowed, facts);
        } catch (e) {
          check = e instanceof Error ? e.message : "검사 실패";
        }
        return { id, model: p.modelName, ms, chars: text.length, check, parsed, raw: parsed ? undefined : text.slice(0, 3000) };
      } catch (e) {
        return { id, model: p.modelName, ms: Date.now() - t0, chars: 0, check: "호출 실패", error: e instanceof Error ? e.message : String(e) };
      }
    })
  );
  return { status: 200, body: { product: LAB_PRODUCTS[product], promptChars: prompt.length, results } };
}
