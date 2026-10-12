import fs from "fs";
import path from "path";
import type { SajuJson } from "saju-engine";
import { db } from "@/server/auth/db";
import { getUserBySessionToken } from "@/server/auth/session";
import { getPersonRow, getPersonSummary, isNamingMode, type NamingMode } from "@/server/readings/readings";
import { completeWithRetry, getReadingProvider } from "@/server/readings/generateReading";
import { notifyError } from "@/server/alert";
import { neededEnergy } from "@/lib/neededEnergy";
import { readName, splitName, type NameHanjaDict, type NameReadingResult } from "@/lib/nameReading";
import { recommendNames, templateStory, type Gender, type MeaningDict, type NamingCandidate } from "@/lib/naming";
import { SURNAME_HANJA } from "@/lib/hanjaSurnames";
import { PRICE } from "@/lib/yeopjeon";
import type { ElementKo } from "@/lib/pillarView";

/**
 * 아이 작명(49,000냥) · 개명 추천(29,500냥) (2026-10-12 수정안 46).
 *  - 후보는 엔진 규칙(lib/naming)으로 고른다 - AI 없음.
 *  - 아이 작명만 후보마다 "이름 이야기"를 AI로 다듬는다 (실패하면 기본 문장). 손님 이름은 보내지 않는다.
 *  - 한 번 만든 결과는 저장해 두고, 7일 안에 한 번 "다시 추천"을 받을 수 있다 (이전 후보는 빼고).
 */

export const NAMING_COUNT: Record<NamingMode, number> = { naming: 7, rename: 5 };
export const NAMING_PRICE: Record<NamingMode, number> = { naming: PRICE.NAMING, rename: PRICE.RENAME };
export const REDO_DAYS = 7;

export interface NamingReport {
  kind: NamingMode;
  surname: string;
  surnameHanja: string;
  gender: Gender;
  needed: ElementKo[];
  neededReason: "lacking" | "weakest";
  dollim: { hangul: string; hanja: string; position: 1 | 2 } | null;
  candidates: Array<NamingCandidate & { story: string }>;
  /** 개명: 지금 이름 진단 */
  current: { name: string; hanja: string | null; reading: NameReadingResult | null } | null;
  createdAt: string;
  round: number;
}

let dictCache: { names: NameHanjaDict; meanings: MeaningDict } | null = null;
export function namingDicts(): { names: NameHanjaDict; meanings: MeaningDict } {
  if (!dictCache) {
    const dir = path.join(process.cwd(), "public", "hanja");
    dictCache = {
      names: JSON.parse(fs.readFileSync(path.join(dir, "name-hanja.json"), "utf8")),
      meanings: JSON.parse(fs.readFileSync(path.join(dir, "dict.json"), "utf8")),
    };
  }
  return dictCache;
}

/** 아이 작명 사람은 이름 칸에 "김○○"처럼 성만 넣어 둔다 */
export function surnameOf(kind: NamingMode, nickname: string): string | null {
  if (kind === "naming") {
    const s = [...nickname].filter((c) => /[가-힣]/.test(c)).join("");
    return s.length >= 1 && s.length <= 2 ? s : null;
  }
  return splitName(nickname)?.surname ?? null;
}

/** 성 한자: 사람에게 저장된 한자 이름의 앞 글자 → 없으면 손님이 고른 것 (성씨 목록이나 인명용 한자에 있어야) */
export function resolveSurnameHanja(surname: string, saved: string | null, picked: unknown, names: NameHanjaDict): string | null {
  const n = [...surname].length;
  const fromSaved = saved ? [...saved].slice(0, n).join("") : "";
  const ok = (h: string) => [...h].length === n && [...h].every((c) => /\p{Script=Han}/u.test(c) && names[c]);
  if (fromSaved && ok(fromSaved)) return fromSaved;
  if (typeof picked === "string" && ok(picked.trim())) {
    const h = picked.trim();
    const list = n === 1 ? SURNAME_HANJA[surname] : undefined;
    if (!list || list.includes(h) || names[h]?.[2].includes(surname)) return h;
  }
  return null;
}

function parseDollim(raw: unknown, names: NameHanjaDict): NamingReport["dollim"] | "invalid" {
  if (raw === null || raw === undefined || raw === "") return null;
  if (typeof raw !== "object") return "invalid";
  const d = raw as Record<string, unknown>;
  const hangul = typeof d.hangul === "string" ? d.hangul.trim() : "";
  const hanja = typeof d.hanja === "string" ? d.hanja.trim() : "";
  const position = d.position === 1 || d.position === 2 ? d.position : null;
  if (!hangul && !hanja) return null;
  if (!/^[가-힣]$/.test(hangul) || !position || !names[hanja] || !names[hanja][2].includes(hangul)) return "invalid";
  return { hangul, hanja, position };
}

async function storiesByAi(cands: NamingCandidate[], needed: ElementKo[]): Promise<string[] | null> {
  let provider;
  try {
    provider = getReadingProvider(3000);
  } catch {
    return null;
  }
  if (provider.providerName === "dev-fallback") return null;
  const lines = cands.map(
    (c, i) =>
      `${i + 1}. ${c.hangul}(${c.hanja}) - ${c.chars.map((x) => `${x.hanja}: ${x.meaning}, 자원오행 ${x.element || "미정"}`).join(" / ")}`
  );
  const prompt = `# 요청: 아이 이름 후보마다 "이름 이야기"를 써 주세요
사주에서 아쉬운 기운: ${needed.join("·")}
${lines.join("\n")}

규칙:
- 후보마다 150~220자, 부모에게 건네는 따뜻한 말투(존댓말).
- 두 한자의 뜻을 엮어 이 이름이 아이에게 바라는 삶을 그려 주세요. 뜻은 위에 적힌 것만 쓰세요.
- 아쉬운 기운을 채우는 글자가 있으면 한 번 짚어 주세요.
- 성씨나 아이 이름 외의 사람 이름은 쓰지 마세요.

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
        if (list.length !== cands.length) throw new Error("이름 이야기 개수가 맞지 않습니다.");
        return list.map((x) => x.trim());
      },
      12_000
    );
  } catch (e) {
    notifyError("아이 작명 이름 이야기 (기본 문장으로 대신함)", e);
    return null;
  }
}

export async function buildReport(args: {
  kind: NamingMode;
  saju: SajuJson;
  nickname: string;
  surname: string;
  surnameHanja: string;
  savedHanja: string | null;
  dollim: NamingReport["dollim"];
  exclude: string[];
  round: number;
}): Promise<NamingReport> {
  const { names, meanings } = namingDicts();
  const need = neededEnergy(args.saju);
  const gender = (args.saju as unknown as { birth: { gender: Gender } }).birth.gender;
  let current: NamingReport["current"] = null;
  const exclude = [...args.exclude];
  if (args.kind === "rename") {
    const split = splitName(args.nickname);
    if (split) exclude.push(split.given);
    current = { name: args.nickname, hanja: args.savedHanja, reading: readName(args.nickname, args.savedHanja ?? undefined, need.elements, names) };
  }
  const cands = recommendNames(
    { surname: args.surname, surnameHanja: args.surnameHanja, gender, needed: need.elements, dollim: args.dollim, exclude, count: NAMING_COUNT[args.kind] },
    meanings,
    names
  );
  const ai = args.kind === "naming" && cands.length > 0 ? await storiesByAi(cands, need.elements) : null;
  return {
    kind: args.kind,
    surname: args.surname,
    surnameHanja: args.surnameHanja,
    gender,
    needed: need.elements,
    neededReason: need.reason,
    dollim: args.dollim,
    candidates: cands.map((c, i) => ({ ...c, story: ai?.[i] ?? templateStory(c, need.elements) })),
    current,
    createdAt: new Date().toISOString(),
    round: args.round,
  };
}

// ───────────────────────── 화면용 처리 ─────────────────────────

type Out = { status: number; body: unknown };
const err = (status: number, code: string, message: string): Out => ({ status, body: { error: { code, message } } });

async function member(token: string | undefined) {
  const user = await getUserBySessionToken(token);
  if (!user) return { error: err(401, "LOGIN_REQUIRED", "로그인 후 이용할 수 있어요.") } as const;
  if (!user.termsAgreed) return { error: err(403, "CONSENT_REQUIRED", "약관 동의 후 이용할 수 있어요.") } as const;
  return { user } as const;
}

async function getStored(personId: string, kind: NamingMode): Promise<{ content: NamingReport; redoCount: number; createdAt: Date } | null> {
  const pool = await db();
  const r = await pool.query<{ content: NamingReport; redo_count: number; created_at: Date }>(
    `SELECT content, redo_count, created_at FROM name_reports WHERE person_id = $1 AND kind = $2`,
    [personId, kind]
  );
  const row = r.rows[0];
  return row ? { content: row.content, redoCount: row.redo_count, createdAt: row.created_at } : null;
}

export async function getNamingReport(personId: string, kind: NamingMode): Promise<NamingReport | null> {
  return (await getStored(personId, kind))?.content ?? null;
}

function redoLeft(s: { redoCount: number; createdAt: Date } | null): number {
  if (!s) return 0;
  const within = Date.now() - s.createdAt.getTime() < REDO_DAYS * 24 * 3600 * 1000;
  return within && s.redoCount < 1 ? 1 : 0;
}

/** 화면이 처음 불러올 때: 잠김 / 입력 받기 / 결과 */
export async function handleGetNaming(token: string | undefined, personId: string, kind: unknown): Promise<Out> {
  const m = await member(token);
  if ("error" in m) return m.error!;
  if (!isNamingMode(kind)) return err(400, "INVALID_INPUT", "상품 종류가 올바르지 않아요.");
  const [row, summary] = await Promise.all([getPersonRow(m.user.id, personId), getPersonSummary(m.user.id, personId)]);
  if (!row || !summary) return err(404, "NOT_FOUND", "풀이 대상을 찾을 수 없어요.");
  const { names } = namingDicts();
  const surname = surnameOf(kind, row.nickname);
  const surnameHanja = surname ? resolveSurnameHanja(surname, row.hanja_name, null, names) : null;
  const need = neededEnergy(row.saju);
  const base = {
    kind,
    header: row.header,
    nickname: row.nickname,
    surname,
    surnameHanja,
    surnameChoices: surname && [...surname].length === 1 ? SURNAME_HANJA[surname] ?? [] : [],
    needed: need.elements,
    price: NAMING_PRICE[kind],
  };
  // 지금 이름 진단은 사기 전에도 보여 준다 (무료 이름 풀이와 같은 내용)
  const preview =
    kind === "rename" ? readName(row.nickname, row.hanja_name ?? undefined, need.elements, names) : null;
  if (!summary.naming.includes(kind)) return { status: 200, body: { ...base, status: "locked", preview } };
  const stored = await getStored(personId, kind);
  if (!stored) return { status: 200, body: { ...base, status: "form", preview } };
  return { status: 200, body: { ...base, status: "ready", report: stored.content, redoLeft: redoLeft(stored) } };
}

/** 후보 만들기 (처음 / 다시 추천) */
export async function handleCreateNaming(token: string | undefined, personId: string, raw: unknown): Promise<Out> {
  const m = await member(token);
  if ("error" in m) return m.error!;
  const b = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  const kind = b.kind;
  if (!isNamingMode(kind)) return err(400, "INVALID_INPUT", "상품 종류가 올바르지 않아요.");
  const [row, summary] = await Promise.all([getPersonRow(m.user.id, personId), getPersonSummary(m.user.id, personId)]);
  if (!row || !summary) return err(404, "NOT_FOUND", "풀이 대상을 찾을 수 없어요.");
  if (!summary.naming.includes(kind)) return err(402, "LOCKED", "먼저 상품을 열어 주세요.");

  const { names } = namingDicts();
  const surname = surnameOf(kind, row.nickname);
  if (!surname) return err(400, "INVALID_INPUT", "성(姓)을 알 수 없어요. 이름을 다시 확인해 주세요.");
  const surnameHanja = resolveSurnameHanja(surname, row.hanja_name, b.surnameHanja, names);
  if (!surnameHanja) return err(400, "SURNAME_HANJA", "성씨 한자를 골라 주세요.");
  const stored = await getStored(personId, kind);
  const redo = b.redo === true;
  // 다시 추천은 처음 고른 조건(성씨 한자·돌림자) 그대로
  const dollim = redo && stored ? stored.content.dollim : parseDollim(b.dollim, names);
  if (dollim === "invalid") return err(400, "DOLLIM", "돌림자는 한글 한 글자와 그 소리의 한자 한 글자, 자리(첫 글자·끝 글자)를 함께 골라 주세요.");
  if (stored && !redo) return { status: 200, body: { status: "ready", report: stored.content, redoLeft: redoLeft(stored) } };
  if (stored && redoLeft(stored) === 0) return err(400, "NO_REDO", `다시 추천은 처음 받은 뒤 ${REDO_DAYS}일 안에 한 번만 받을 수 있어요.`);

  const exclude = stored ? stored.content.candidates.map((c) => c.hangul) : [];
  const report = await buildReport({
    kind,
    saju: row.saju,
    nickname: row.nickname,
    surname,
    surnameHanja: redo && stored ? stored.content.surnameHanja : surnameHanja,
    savedHanja: row.hanja_name,
    dollim,
    exclude,
    round: stored ? stored.content.round + 1 : 1,
  });
  if (report.candidates.length === 0) {
    if (stored) return err(422, "NO_CANDIDATE", "이 조건으로는 더 고를 수 있는 이름이 없어요. 고객센터로 알려 주시면 직접 도와드릴게요.");
    return err(422, "NO_CANDIDATE", dollim ? "이 돌림자로는 수리가 맞는 이름을 찾지 못했어요. 돌림자 자리나 한자를 바꿔 보세요." : "조건에 맞는 이름을 찾지 못했어요. 고객센터로 알려 주시면 직접 도와드릴게요.");
  }
  const pool = await db();
  if (stored) {
    await pool.query(`UPDATE name_reports SET content = $3, redo_count = redo_count + 1, updated_at = now() WHERE person_id = $1 AND kind = $2`, [
      personId,
      kind,
      JSON.stringify(report),
    ]);
  } else {
    await pool.query(`INSERT INTO name_reports (person_id, kind, content) VALUES ($1, $2, $3) ON CONFLICT (person_id, kind) DO NOTHING`, [
      personId,
      kind,
      JSON.stringify(report),
    ]);
  }
  const now = await getStored(personId, kind);
  return { status: 200, body: { status: "ready", report: now?.content ?? report, redoLeft: redoLeft(now) } };
}
