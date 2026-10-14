import { db } from "@/server/auth/db";
import { getUserBySessionToken } from "@/server/auth/session";
import { getBalance } from "@/server/yeopjeon/ledger";
import { listProfiles } from "@/server/auth/profiles";
import { validateAnalyzeInput } from "@/server/validateAnalyzeInput";
import { analyzeSaju } from "@/server/analyzeSaju";
import { createPerson, getPersonRow } from "@/server/readings/readings";
import { completeWithRetry, getReadingProvider } from "@/server/readings/generateReading";
import { notifyError } from "@/server/alert";
import { coupleMatch, nameFill, type CoupleMatch } from "@/lib/coupleMatch";
import { PRICE } from "@/lib/yeopjeon";

/**
 * 연인 궁합 (2026-10-14 수정안 10, 19,900냥).
 *   1) 나(저장한 사람)와 상대(저장한 사람 또는 바로 입력)를 고르면 두 사람의 풀이 대상(persons)을 만들고 couple_readings 한 줄을 만든다.
 *   2) 무료 미리보기: 엔진 궁합 점수 · 항목별 도표 · 한 줄씩 (AI 없음)
 *   3) 19,900냥으로 열면 AI가 엔진 근거만으로 긴 궁합 풀이를 쓴다 (이름은 보내지 않고 {A}·{B}로). AI가 없으면 엔진 문장으로.
 *   상대 정보를 대신 넣는 것이라 입력 화면에 "상대의 동의" 체크를 받는다.
 */

type Out = { status: number; body: unknown };
const err = (status: number, code: string, message: string): Out => ({ status, body: { error: { code, message } } });
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface CoupleContent {
  sections: Array<{ title: string; body: string }>;
  model: string;
}

async function member(token: string | undefined) {
  const user = await getUserBySessionToken(token);
  if (!user) return { error: err(401, "LOGIN_REQUIRED", "로그인 후 이용할 수 있어요.") } as const;
  if (!user.termsAgreed) return { error: err(403, "CONSENT_REQUIRED", "약관 동의 후 이용할 수 있어요.") } as const;
  return { user } as const;
}

/** 저장한 사람(profileId) 또는 바로 입력한 정보 → persons */
async function personFrom(userId: string, raw: unknown): Promise<string | Out> {
  const b = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  if (typeof b.personId === "string") {
    const p = await getPersonRow(userId, b.personId);
    return p ? p.id : err(404, "NOT_FOUND", "사람을 찾을 수 없어요.");
  }
  let input: Record<string, unknown>;
  if (typeof b.profileId === "string") {
    const prof = (await listProfiles(userId)).find((x) => x.id === b.profileId);
    if (!prof) return err(404, "NOT_FOUND", "저장한 사람을 찾을 수 없어요.");
    input = {
      nickname: prof.name,
      hanjaName: prof.hanjaName ?? undefined,
      gender: prof.gender,
      calendarType: prof.calendarType,
      isLeapMonth: prof.calendarType === "lunar" ? prof.isLeapMonth : undefined,
      date: prof.date,
      time: prof.time ?? undefined,
      birthCity: prof.birthCity ?? undefined,
    };
  } else if (typeof b.input === "object" && b.input !== null) {
    input = b.input as Record<string, unknown>;
  } else return err(400, "INVALID_INPUT", "누구인지 골라 주세요.");
  const v = validateAnalyzeInput(input);
  if (!v.ok) return err(400, "INVALID_INPUT", "이름과 생년월일을 다시 확인해 주세요.");
  const r = await analyzeSaju(v.value).catch(() => null);
  if (!r) return err(422, "SAJU_CALCULATION_FAILED", "사주를 계산하지 못했어요. 생년월일을 다시 확인해 주세요.");
  return createPerson({ userId, saju: r.saju, nickname: r.nickname, hanjaName: r.hanjaName });
}

/** body: { me: {profileId|personId}, partner: {profileId|personId|input}, consent: true } */
export async function handleCreateCouple(token: string | undefined, raw: unknown): Promise<Out> {
  const m = await member(token);
  if ("error" in m) return m.error!;
  const b = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  if (b.consent !== true) return err(400, "CONSENT_REQUIRED", "상대방의 생년월일을 넣는 데 동의를 받았는지 체크해 주세요.");
  const me = await personFrom(m.user.id, b.me);
  if (typeof me !== "string") return me;
  const partner = await personFrom(m.user.id, b.partner);
  if (typeof partner !== "string") return partner;
  if (me === partner) return err(400, "SAME_PERSON", "서로 다른 두 사람을 골라 주세요.");
  const pool = await db();
  const r = await pool.query<{ id: string }>(`INSERT INTO couple_readings (user_id, person_id, partner_person_id) VALUES ($1, $2, $3) RETURNING id`, [m.user.id, me, partner]);
  return { status: 200, body: { id: r.rows[0].id } };
}

interface CoupleRow {
  id: string;
  person_id: string;
  partner_person_id: string;
  paid_at: Date | null;
  content: CoupleContent | null;
}

async function load(userId: string, id: string) {
  if (!UUID_RE.test(id)) return null;
  const pool = await db();
  const r = await pool.query<CoupleRow>(`SELECT id, person_id, partner_person_id, paid_at, content FROM couple_readings WHERE id = $1 AND user_id = $2`, [id, userId]);
  const row = r.rows[0];
  if (!row) return null;
  const [a, b] = await Promise.all([getPersonRow(userId, row.person_id), getPersonRow(userId, row.partner_person_id)]);
  if (!a || !b) return null;
  return { row, a, b, match: coupleMatch(a.nickname, a.saju, b.nickname, b.saju) };
}

function publicMatch(m: CoupleMatch) {
  const fill = (t: string) => nameFill(t, m.a.name, m.b.name);
  return { ...m, items: m.items.map((i) => ({ ...i, text: fill(i.text) })), summary: fill(m.summary), facts: undefined };
}

/** 화면: locked(사기 전) · write(샀고 아직 안 씀) · ready */
export async function handleGetCouple(token: string | undefined, id: string): Promise<Out> {
  const m = await member(token);
  if ("error" in m) return m.error!;
  const x = await load(m.user.id, id);
  if (!x) return err(404, "NOT_FOUND", "궁합을 찾을 수 없어요.");
  const base = { id, price: PRICE.COUPLE, match: publicMatch(x.match), birthA: x.a.header.birth, birthB: x.b.header.birth };
  if (!x.row.paid_at) return { status: 200, body: { ...base, status: "locked", balance: await getBalance(m.user.id) } };
  if (!x.row.content) return { status: 200, body: { ...base, status: "write" } };
  const content = { ...x.row.content, sections: x.row.content.sections.map((s) => ({ title: s.title, body: nameFill(s.body, x.a.nickname, x.b.nickname) })) };
  return { status: 200, body: { ...base, status: "ready", content } };
}

const SECTIONS = ["두 사람의 첫인상과 끌림", "성격과 연애 방식", "자주 부딪히는 자리와 푸는 법", "서로 채워 주는 기운", "함께하면 좋은 때와 앞으로의 흐름", "두 사람에게 드리는 한마디"];

function templateContent(m: CoupleMatch): CoupleContent {
  const [stem, day, year, fill] = m.items;
  return {
    model: "engine",
    sections: [
      { title: SECTIONS[0], body: `${stem.text} ${m.summary}` },
      { title: SECTIONS[1], body: `{A}님은 ${m.a.dayLabel}, {B}님은 ${m.b.dayLabel}의 바탕을 가졌어요. ${day.text}` },
      { title: SECTIONS[2], body: `${year.text} ${m.items.some((i) => !i.good) ? "부딪히는 자리는 피할 것이 아니라 서로를 알아 가는 문이에요. 화가 날 때는 바로 결론 내기보다 하룻밤 쉬고 이야기해 보세요." : "크게 부딪히는 자리가 적은 짝이라, 작은 서운함도 그때그때 말하면 오래 편안해요."}` },
      { title: SECTIONS[3], body: fill.text },
      { title: SECTIONS[4], body: `궁합 점수는 ${m.score}점, "${m.grade}"이에요. 함께 새로운 것을 배우거나 여행을 계획할 때 두 사람의 기운이 가장 잘 어울려요.` },
      { title: SECTIONS[5], body: "서로가 서로의 빈자리를 알아봐 주는 것, 그것이 이 인연을 오래 빛나게 하는 비결이에요." },
    ],
  };
}

async function writeByAi(m: CoupleMatch): Promise<CoupleContent> {
  let provider;
  try {
    provider = getReadingProvider(6000);
  } catch {
    return templateContent(m);
  }
  if (provider.providerName === "dev-fallback") return templateContent(m);
  const prompt = `# 요청: 두 사람의 사주 궁합 풀이를 써 주세요
두 사람은 {A}와 {B}로 적어요(이름 대신 이 표시를 그대로 쓰세요).

## 엔진이 확정한 근거 (이것만 근거로 쓰세요)
${m.facts}
항목별 엔진 판단:
${m.items.map((i) => `- ${i.title}: ${i.good ? "좋음" : "주의"} — ${i.text}`).join("\n")}

## 규칙
- 아래 6개 소제목 순서대로, 소제목마다 500~700자, 전체 3,500~4,000자.
${SECTIONS.map((s, i) => `  ${i + 1}. ${s}`).join("\n")}
- 연인에게 건네는 따뜻하고 다정한 존댓말. 칭찬을 먼저, 아쉬운 점은 "이렇게 하면 좋아요"로.
- 근거에 없는 사실(대운 이름, 날짜, 숫자)을 지어내지 마세요. 헤어진다·나쁘다 같은 단정·겁주는 말 금지.
- 마지막 소제목에는 두 사람이 함께 채우면 좋은 기운(색·장소·습관)을 한 가지 넣어 주세요.

JSON 형식: {"sections":[{"title":"두 사람의 첫인상과 끌림","body":"..."}, ...]}`;
  try {
    const sections = await completeWithRetry(
      provider,
      prompt,
      (raw) => {
        const s = raw.indexOf("{");
        const e = raw.lastIndexOf("}");
        const parsed = JSON.parse(raw.slice(s, e + 1)) as { sections?: unknown };
        const list = (Array.isArray(parsed.sections) ? parsed.sections : [])
          .filter((x): x is { title: string; body: string } => typeof x === "object" && x !== null && typeof (x as { body?: unknown }).body === "string")
          .map((x, i) => ({ title: SECTIONS[i] ?? String(x.title), body: x.body.trim() }))
          .filter((x) => x.body.length >= 120);
        if (list.length < 5) throw new Error("궁합 풀이 소제목이 모자랍니다.");
        return list.slice(0, 6);
      },
      40_000
    );
    return { sections, model: provider.providerName };
  } catch (e) {
    notifyError("연인 궁합 풀이 (엔진 문장으로 대신함)", e);
    return templateContent(m);
  }
}

/** 풀이 쓰기 - 산 사람만, 한 번만 */
export async function handleWriteCouple(token: string | undefined, id: string): Promise<Out> {
  const m = await member(token);
  if ("error" in m) return m.error!;
  const x = await load(m.user.id, id);
  if (!x) return err(404, "NOT_FOUND", "궁합을 찾을 수 없어요.");
  if (!x.row.paid_at) return err(402, "NOT_PAID", "연인 궁합을 연 뒤에 받을 수 있어요.");
  if (!x.row.content) {
    const content = await writeByAi(x.match);
    const pool = await db();
    await pool.query(`UPDATE couple_readings SET content = $3 WHERE id = $1 AND user_id = $2 AND content IS NULL`, [id, m.user.id, JSON.stringify(content)]);
  }
  return handleGetCouple(token, id);
}

/** 내 복주머니: 연 궁합 */
export async function listCouples(userId: string): Promise<Array<{ id: string; a: string; b: string; paid: boolean; createdAt: string }>> {
  const pool = await db();
  const r = await pool.query<{ id: string; a: string; b: string; paid: boolean; created_at: Date }>(
    `SELECT c.id, pa.nickname AS a, pb.nickname AS b, c.paid_at IS NOT NULL AS paid, c.created_at
       FROM couple_readings c JOIN persons pa ON pa.id = c.person_id JOIN persons pb ON pb.id = c.partner_person_id
      WHERE c.user_id = $1 ORDER BY c.created_at DESC LIMIT 30`,
    [userId]
  );
  return r.rows.map((x) => ({ id: x.id, a: x.a, b: x.b, paid: x.paid, createdAt: x.created_at.toISOString() }));
}
