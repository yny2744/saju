import { db } from "@/server/auth/db";
import { getUserBySessionToken } from "@/server/auth/session";
import { getPersonRow, getPersonSummary } from "@/server/readings/readings";
import { completeWithRetry, getReadingProvider } from "@/server/readings/generateReading";
import { listProfiles } from "@/server/auth/profiles";
import { validateAnalyzeInput } from "@/server/validateAnalyzeInput";
import { analyzeSaju } from "@/server/analyzeSaju";
import { notifyError } from "@/server/alert";
import { neededEnergy } from "@/lib/neededEnergy";
import {
  FEELINGS,
  acceptable,
  businessSyllables,
  candidateScore,
  industryOf,
  isFeelingKey,
  poolCandidates,
  readBusinessName,
  romanize,
  templateBusinessStory,
  type BusinessCandidate,
  type BusinessReading,
  type FeelingKey,
  type Industry,
  type IndustryKey,
} from "@/lib/businessName";
import { PRICE } from "@/lib/yeopjeon";
import type { ElementKo } from "@/lib/pillarView";
import { namingDicts } from "./naming";

/**
 * 상호 풀이(무료) · 상호 작명(49,000냥) (2026-10-13 수정안 63).
 *  - 상호 풀이: 엔진 규칙만 (AI 없음). 로그인한 손님은 저장한 사람(대표자)을 골라 사주와의 어울림까지 본다.
 *  - 상호 작명: 대표자 사주(사람 하나)에 한 번 연다. 엔진 재료로 후보를 고르고, AI가 있으면 업종·느낌에 맞는 이름을 더 제안받아
 *    엔진이 똑같은 기준(소리·업종 오행·총획·사주)으로 걸러 7개를 고른다. 이야기도 AI로 다듬고, 실패하면 기본 문장.
 *    대표자 이름은 AI에 보내지 않는다.
 *  - 7일 안에 한 번 "다시 추천" (조건을 바꿀 수 있고, 이전 후보는 뺀다).
 *  - 상표 등록 여부는 확인하지 못한다 → 화면·PDF에 키프리스 확인 안내.
 */

export const BUSINESS_COUNT = 7;
export const BUSINESS_REDO_DAYS = 7;

export interface BusinessReport {
  kind: "business";
  industry: { key: IndustryKey; label: string; element: ElementKo; suffix: string };
  feelings: FeelingKey[];
  needed: ElementKo[];
  neededReason: "lacking" | "weakest";
  candidates: BusinessCandidate[];
  createdAt: string;
  round: number;
}

type Out = { status: number; body: unknown };
const err = (status: number, code: string, message: string): Out => ({ status, body: { error: { code, message } } });

function parseFeelings(raw: unknown): FeelingKey[] {
  if (!Array.isArray(raw)) return [];
  return [...new Set(raw.filter(isFeelingKey))].slice(0, 2);
}

// ───────────────────────── 무료 상호 풀이 ─────────────────────────

/** body: { name, hanja?, industry?, profileId? } - 로그인 없이도 되고, profileId는 로그인한 손님의 저장한 사람만 */
export async function handleBusinessReading(token: string | undefined, raw: unknown): Promise<Out> {
  const b = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  const name = typeof b.name === "string" ? b.name.trim().slice(0, 30) : "";
  const syl = businessSyllables(name);
  if (syl.length < 1) return err(400, "INVALID_INPUT", "상호를 한글로 넣어 주세요.");
  if (syl.length > 8) return err(400, "INVALID_INPUT", "상호는 한글 8글자까지 볼 수 있어요. 업종 이름(식당·카페 등)은 빼고 넣어 주세요.");
  const hanja = typeof b.hanja === "string" ? b.hanja.trim().slice(0, 30) : null;
  const industry = b.industry ? industryOf(b.industry) : null;

  let needed: ElementKo[] | null = null;
  let who: string | null = null;
  if (typeof b.profileId === "string" && b.profileId) {
    const user = await getUserBySessionToken(token);
    if (!user) return err(401, "LOGIN_REQUIRED", "로그인 후 대표자 사주를 고를 수 있어요.");
    const prof = (await listProfiles(user.id)).find((x) => x.id === b.profileId);
    if (!prof) return err(404, "NOT_FOUND", "저장한 사람을 찾을 수 없어요.");
    const v = validateAnalyzeInput({
      nickname: prof.name,
      hanjaName: prof.hanjaName ?? undefined,
      gender: prof.gender,
      calendarType: prof.calendarType,
      isLeapMonth: prof.calendarType === "lunar" ? prof.isLeapMonth : undefined,
      date: prof.date,
      time: prof.time ?? undefined,
      birthCity: prof.birthCity ?? undefined,
    });
    if (!v.ok) return err(400, "INVALID_PROFILE", "저장한 생년월일을 다시 확인해 주세요.");
    const r = await analyzeSaju(v.value).catch(() => null);
    if (!r) return err(422, "SAJU_CALCULATION_FAILED", "사주를 계산하지 못했어요.");
    needed = neededEnergy(r.saju).elements;
    who = prof.name;
  }
  const reading = readBusinessName(name, hanja, industry, needed, namingDicts().names);
  if (!reading) return err(400, "INVALID_INPUT", "상호를 다시 확인해 주세요.");
  return { status: 200, body: { reading, who } };
}

// ───────────────────────── 상호 작명 ─────────────────────────

async function member(token: string | undefined) {
  const user = await getUserBySessionToken(token);
  if (!user) return { error: err(401, "LOGIN_REQUIRED", "로그인 후 이용할 수 있어요.") } as const;
  if (!user.termsAgreed) return { error: err(403, "CONSENT_REQUIRED", "약관 동의 후 이용할 수 있어요.") } as const;
  return { user } as const;
}

async function getStored(personId: string): Promise<{ content: BusinessReport; redoCount: number; createdAt: Date } | null> {
  const pool = await db();
  const r = await pool.query<{ content: BusinessReport; redo_count: number; created_at: Date }>(
    `SELECT content, redo_count, created_at FROM name_reports WHERE person_id = $1 AND kind = 'business'`,
    [personId]
  );
  const row = r.rows[0];
  return row ? { content: row.content, redoCount: row.redo_count, createdAt: row.created_at } : null;
}

export async function getBusinessReport(personId: string): Promise<BusinessReport | null> {
  return (await getStored(personId))?.content ?? null;
}

function redoLeft(s: { redoCount: number; createdAt: Date } | null): number {
  if (!s) return 0;
  return Date.now() - s.createdAt.getTime() < BUSINESS_REDO_DAYS * 24 * 3600 * 1000 && s.redoCount < 1 ? 1 : 0;
}

interface AiIdea {
  hangul: string;
  hanja?: string;
  meaning: string;
}

/** AI에게 업종·느낌에 맞는 상호를 더 받아 온다 (실패하면 null - 엔진 재료만으로 간다) */
async function ideasByAi(industry: Industry, feelings: FeelingKey[], needed: ElementKo[], good: ElementKo[], exclude: string[]): Promise<AiIdea[] | null> {
  let provider;
  try {
    provider = getReadingProvider(4000);
  } catch {
    return null;
  }
  if (provider.providerName === "dev-fallback") return null;
  const feelText = feelings.length ? feelings.map((f) => FEELINGS.find((x) => x.key === f)!.label).join(", ") : "밝고 믿음직함";
  const prompt = `# 요청: 한국 가게·회사 이름(상호) 후보를 지어 주세요
업종: ${industry.label}
원하는 느낌: ${feelText}
첫소리로 쓰면 좋은 기운(소리오행): ${good.join("·")} (ㄱㅋ목 · ㄴㄷㄹㅌ화 · ㅇㅎ토 · ㅅㅈㅊ금 · ㅁㅂㅍ수)
대표자 사주에 아쉬운 기운: ${needed.join("·")}
이미 나온 이름(쓰지 마세요): ${exclude.slice(0, 60).join(", ") || "없음"}

규칙:
- 2~3글자 한글 상호 20개. 업종 이름(식당·카페 등)은 붙이지 마세요.
- 절반은 뜻이 밝은 한자어(한자 표기 포함), 절반은 부르기 좋은 순우리말·한글 조어로.
- 한자는 실제로 그 소리로 읽히는 흔한 글자만. 뜻이 어둡거나 놀림받을 소리는 피하세요.
- 실제 유명 브랜드·회사 이름과 같거나 비슷한 것은 피하세요.
- meaning은 15자 안쪽의 쉬운 말.

JSON 형식: {"names":[{"hangul":"다온","meaning":"좋은 일이 다 온다"},{"hangul":"대성","hanja":"大成","meaning":"크게 이룸"}]}`;
  try {
    return await completeWithRetry(
      provider,
      prompt,
      (raw) => {
        const s = raw.indexOf("{");
        const e = raw.lastIndexOf("}");
        const parsed = JSON.parse(raw.slice(s, e + 1)) as { names?: unknown };
        const list = (Array.isArray(parsed.names) ? parsed.names : [])
          .filter((x): x is Record<string, unknown> => typeof x === "object" && x !== null)
          .map((x) => ({
            hangul: typeof x.hangul === "string" ? x.hangul.trim() : "",
            hanja: typeof x.hanja === "string" && x.hanja.trim() ? x.hanja.trim() : undefined,
            meaning: typeof x.meaning === "string" ? x.meaning.trim().slice(0, 30) : "",
          }))
          .filter((x) => /^[가-힣]{2,4}$/.test(x.hangul) && x.meaning.length >= 2);
        if (list.length < 5) throw new Error("상호 후보가 너무 적습니다.");
        return list;
      },
      15_000
    );
  } catch (e) {
    notifyError("상호 작명 AI 후보 (엔진 재료로만 고름)", e);
    return null;
  }
}

async function storiesByAi(cands: BusinessCandidate[], industry: Industry, needed: ElementKo[]): Promise<string[] | null> {
  let provider;
  try {
    provider = getReadingProvider(3000);
  } catch {
    return null;
  }
  if (provider.providerName === "dev-fallback") return null;
  const lines = cands.map((c, i) => {
    const r = c.reading;
    const facts = [
      `뜻 "${c.meaning}"`,
      r.industry ? `첫소리와 업종(${industry.element}) 관계 ${r.industry.first}` : "",
      r.supports?.length ? `대표자에게 아쉬운 ${r.supports.join("·")} 기운을 채움` : "",
      r.suri ? `총획 ${r.totalStrokes}획 ${r.suri.lucky ? "길수" : ""}` : "",
      r.sound.clashes === 0 ? "소리 부딪힘 없음" : "",
    ].filter(Boolean);
    return `${i + 1}. ${c.hangul}${c.hanja ? `(${c.hanja})` : ""} - ${facts.join(", ")}`;
  });
  const prompt = `# 요청: 상호 후보마다 "이름 이야기"를 써 주세요
업종: ${industry.label} · 대표자 사주에 아쉬운 기운: ${needed.join("·")}
${lines.join("\n")}

규칙:
- 후보마다 120~180자, 사장님께 건네는 믿음직한 말투(존댓말).
- 위에 적힌 뜻과 사실만 써서, 이 이름으로 가게가 어떤 곳으로 기억될지 그려 주세요. 없는 사실을 지어내지 마세요.
- 매출·성공을 장담하는 말은 쓰지 마세요.

JSON 형식: {"stories":["1번 이야기","2번 이야기",...]}`;
  try {
    return await completeWithRetry(
      provider,
      prompt,
      (raw) => {
        const s = raw.indexOf("{");
        const e = raw.lastIndexOf("}");
        const parsed = JSON.parse(raw.slice(s, e + 1)) as { stories?: unknown };
        const list = Array.isArray(parsed.stories) ? parsed.stories.filter((x): x is string => typeof x === "string" && x.trim().length >= 40) : [];
        if (list.length !== cands.length) throw new Error("이야기 개수가 맞지 않습니다.");
        return list.map((x) => x.trim());
      },
      12_000
    );
  } catch (e) {
    notifyError("상호 작명 이야기 (기본 문장으로 대신함)", e);
    return null;
  }
}

/** 업종 기운을 낳거나 같은 소리오행 (AI에게 알려 주는 "좋은 첫소리") */
function goodSounds(e: ElementKo): ElementKo[] {
  const order: ElementKo[] = ["목", "화", "토", "금", "수"];
  const i = order.indexOf(e);
  return [order[(i + 4) % 5], e];
}

/** AI 제안 하나를 엔진 기준으로 읽는다 - 한자는 사전에 있고 그 소리로 읽힐 때만 쓴다 */
function readIdea(x: AiIdea, industry: Industry, needed: ElementKo[]): BusinessReading | null {
  const { names } = namingDicts();
  let hanja: string | null = null;
  if (x.hanja) {
    const hs = [...x.hanja];
    const hg = [...x.hangul];
    if (hs.length === hg.length && hs.every((c, i) => names[c]?.[2].includes(hg[i]))) hanja = x.hanja;
  }
  return readBusinessName(x.hangul, hanja, industry, needed, names);
}

export async function buildBusinessReport(args: {
  saju: Parameters<typeof neededEnergy>[0];
  industry: Industry;
  feelings: FeelingKey[];
  exclude: string[];
  round: number;
  useAi?: boolean;
}): Promise<BusinessReport> {
  const { names } = namingDicts();
  const need = neededEnergy(args.saju);
  const pool = poolCandidates(args.industry, need.elements, args.feelings, args.exclude, names);
  const all: Array<Omit<BusinessCandidate, "story"> & { score: number }> = pool.map((p) => ({
    hangul: p.word.hangul,
    hanja: p.reading.hanja,
    meaning: p.word.meaning,
    english: romanize(p.word.hangul),
    reading: p.reading,
    from: "pool" as const,
    score: p.score,
  }));
  if (args.useAi !== false) {
    const ideas = await ideasByAi(args.industry, args.feelings, need.elements, goodSounds(args.industry.element), [...args.exclude, ...all.map((x) => x.hangul)]);
    const ex = new Set([...args.exclude, ...all.map((x) => x.hangul)]);
    for (const x of ideas ?? []) {
      if (ex.has(x.hangul)) continue;
      const r = readIdea(x, args.industry, need.elements);
      if (!r || !acceptable(r)) continue;
      ex.add(x.hangul);
      // AI 제안은 고른 느낌에 맞춰 지은 것이므로 느낌 하나 맞은 것으로 본다
      all.push({ hangul: x.hangul, hanja: r.hanja, meaning: x.meaning, english: romanize(x.hangul), reading: r, from: "ai", score: candidateScore(r, args.feelings.slice(0, 1), args.feelings) });
    }
  }
  all.sort((a, b) => b.score - a.score);
  // 한자어·한글 상호가 고루 섞이게: 한쪽이 5개를 넘지 않게 고른다
  const picked: typeof all = [];
  const count = { hanja: 0, hangul: 0 };
  for (const c of all) {
    const k = c.hanja ? "hanja" : "hangul";
    if (count[k] >= 5) continue;
    picked.push(c);
    count[k] += 1;
    if (picked.length >= BUSINESS_COUNT) break;
  }
  if (picked.length < BUSINESS_COUNT) for (const c of all) if (!picked.includes(c) && picked.length < BUSINESS_COUNT) picked.push(c);
  const cands: BusinessCandidate[] = picked.map(({ score: _s, ...c }) => ({ ...c, story: "" }));
  const ai = args.useAi !== false && cands.length > 0 ? await storiesByAi(cands, args.industry, need.elements) : null;
  return {
    kind: "business",
    industry: { key: args.industry.key, label: args.industry.label, element: args.industry.element, suffix: args.industry.suffix },
    feelings: args.feelings,
    needed: need.elements,
    neededReason: need.reason,
    candidates: cands.map((c, i) => ({ ...c, story: ai?.[i] ?? templateBusinessStory(c) })),
    createdAt: new Date().toISOString(),
    round: args.round,
  };
}

/** 화면이 처음 불러올 때: 잠김 / 조건 입력 / 결과 */
export async function handleGetBusiness(token: string | undefined, personId: string): Promise<Out> {
  const m = await member(token);
  if ("error" in m) return m.error!;
  const [row, summary] = await Promise.all([getPersonRow(m.user.id, personId), getPersonSummary(m.user.id, personId)]);
  if (!row || !summary) return err(404, "NOT_FOUND", "대표자 사주를 찾을 수 없어요.");
  const need = neededEnergy(row.saju);
  const base = { header: row.header, nickname: row.nickname, needed: need.elements, price: PRICE.BUSINESS };
  if (!summary.business) return { status: 200, body: { ...base, status: "locked" } };
  const stored = await getStored(personId);
  if (!stored) return { status: 200, body: { ...base, status: "form" } };
  return { status: 200, body: { ...base, status: "ready", report: stored.content, redoLeft: redoLeft(stored) } };
}

/** 후보 만들기 (처음 / 다시 추천). body: { industry, feelings?: [], redo? } */
export async function handleCreateBusiness(token: string | undefined, personId: string, raw: unknown): Promise<Out> {
  const m = await member(token);
  if ("error" in m) return m.error!;
  const b = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  const [row, summary] = await Promise.all([getPersonRow(m.user.id, personId), getPersonSummary(m.user.id, personId)]);
  if (!row || !summary) return err(404, "NOT_FOUND", "대표자 사주를 찾을 수 없어요.");
  if (!summary.business) return err(402, "LOCKED", "먼저 상호 작명을 열어 주세요.");
  const stored = await getStored(personId);
  const redo = b.redo === true;
  if (stored && !redo) return { status: 200, body: { status: "ready", report: stored.content, redoLeft: redoLeft(stored) } };
  if (stored && redoLeft(stored) === 0) return err(400, "NO_REDO", `다시 추천은 처음 받은 뒤 ${BUSINESS_REDO_DAYS}일 안에 한 번만 받을 수 있어요.`);
  const industry = industryOf(b.industry) ?? (redo && stored ? industryOf(stored.content.industry.key) : null);
  if (!industry) return err(400, "INDUSTRY", "업종을 골라 주세요.");
  const feelings = b.feelings !== undefined ? parseFeelings(b.feelings) : stored?.content.feelings ?? [];

  const report = await buildBusinessReport({
    saju: row.saju,
    industry,
    feelings,
    exclude: stored ? stored.content.candidates.map((c) => c.hangul) : [],
    round: stored ? stored.content.round + 1 : 1,
  });
  if (report.candidates.length === 0) return err(422, "NO_CANDIDATE", "조건에 맞는 상호를 찾지 못했어요. 고객센터로 알려 주시면 직접 도와드릴게요.");
  const pool = await db();
  if (stored) {
    await pool.query(`UPDATE name_reports SET content = $2, redo_count = redo_count + 1, updated_at = now() WHERE person_id = $1 AND kind = 'business'`, [personId, JSON.stringify(report)]);
  } else {
    await pool.query(`INSERT INTO name_reports (person_id, kind, content) VALUES ($1, 'business', $2) ON CONFLICT (person_id, kind) DO NOTHING`, [personId, JSON.stringify(report)]);
  }
  const now = await getStored(personId);
  return { status: 200, body: { status: "ready", report: now?.content ?? report, redoLeft: redoLeft(now) } };
}
