import { db } from "./db";

/**
 * 저장된 사람(나·가족) - 수정안 3번.
 * 로그인 계정에 이름·한자·생년월일시를 저장해 두고, 다음 방문 때 입력 화면 드롭다운으로 불러온다.
 * 생년월일시는 민감하게 다뤄지는 정보라 본인 계정에서만 읽고 지울 수 있고, 회원 탈퇴 시 함께 삭제된다(CASCADE).
 */

export interface SajuProfile {
  id: string;
  name: string;
  hanjaName: string | null;
  gender: "male" | "female";
  calendarType: "solar" | "lunar";
  isLeapMonth: boolean;
  date: string;
  time: string | null;
  birthCity: string | null;
}

export type ProfileInput = Omit<SajuProfile, "id">;

/** 한 사람이 저장할 수 있는 최대 인원 */
export const MAX_PROFILES = 20;

interface ProfileRow {
  id: string;
  name: string;
  hanja_name: string | null;
  gender: string;
  calendar_type: string;
  is_leap_month: boolean;
  birth_date: string;
  birth_time: string | null;
  birth_city: string | null;
}

function toProfile(r: ProfileRow): SajuProfile {
  return {
    id: r.id,
    name: r.name,
    hanjaName: r.hanja_name,
    gender: r.gender === "male" ? "male" : "female",
    calendarType: r.calendar_type === "lunar" ? "lunar" : "solar",
    isLeapMonth: r.is_leap_month,
    date: r.birth_date,
    time: r.birth_time,
    birthCity: r.birth_city,
  };
}

const COLS = "id, name, hanja_name, gender, calendar_type, is_leap_month, birth_date, birth_time, birth_city";

/** 형식 검증 (사주 계산 검증은 /api/saju/analyze가 따로 한다 - 여기선 저장해도 되는 모양인지만 본다) */
export function parseProfileInput(raw: unknown): ProfileInput | null {
  if (typeof raw !== "object" || raw === null) return null;
  const b = raw as Record<string, unknown>;
  const str = (v: unknown, max: number) => (typeof v === "string" && v.trim() && v.length <= max && !/[<>]/.test(v) ? v.trim() : null);
  const name = str(b.name, 20);
  const date = typeof b.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(b.date) ? b.date : null;
  const time = typeof b.time === "string" && /^\d{2}:\d{2}$/.test(b.time) ? b.time : null;
  if (!name || !date) return null;
  if (b.gender !== "male" && b.gender !== "female") return null;
  if (b.calendarType !== "solar" && b.calendarType !== "lunar") return null;
  return {
    name,
    hanjaName: str(b.hanjaName, 10),
    gender: b.gender,
    calendarType: b.calendarType,
    isLeapMonth: b.calendarType === "lunar" && b.isLeapMonth === true,
    date,
    time,
    birthCity: str(b.birthCity, 50),
  };
}

export async function listProfiles(userId: string): Promise<SajuProfile[]> {
  const pool = await db();
  const r = await pool.query<ProfileRow>(
    `SELECT ${COLS} FROM saju_profiles WHERE user_id = $1 ORDER BY updated_at DESC LIMIT ${MAX_PROFILES}`,
    [userId]
  );
  return r.rows.map(toProfile);
}

/**
 * 저장. 같은 이름·생년월일·양음력이 이미 있으면 새로 만들지 않고 그 행을 고친다(시간·한자 등 갱신).
 * 최대 인원을 넘으면 null.
 */
export async function saveProfile(userId: string, p: ProfileInput): Promise<SajuProfile | null> {
  const pool = await db();
  const existing = await pool.query<{ id: string }>(
    `SELECT id FROM saju_profiles WHERE user_id = $1 AND name = $2 AND birth_date = $3 AND calendar_type = $4`,
    [userId, p.name, p.date, p.calendarType]
  );
  const values = [p.hanjaName, p.gender, p.isLeapMonth, p.time, p.birthCity];
  if (existing.rows[0]) {
    const r = await pool.query<ProfileRow>(
      `UPDATE saju_profiles
          SET hanja_name = $3, gender = $4, is_leap_month = $5, birth_time = $6, birth_city = $7, updated_at = now()
        WHERE id = $1 AND user_id = $2
        RETURNING ${COLS}`,
      [existing.rows[0].id, userId, ...values]
    );
    return toProfile(r.rows[0]);
  }
  const count = await pool.query<{ n: string }>(`SELECT count(*)::text AS n FROM saju_profiles WHERE user_id = $1`, [userId]);
  if (Number(count.rows[0].n) >= MAX_PROFILES) return null;
  const r = await pool.query<ProfileRow>(
    `INSERT INTO saju_profiles (user_id, name, birth_date, calendar_type, hanja_name, gender, is_leap_month, birth_time, birth_city)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING ${COLS}`,
    [userId, p.name, p.date, p.calendarType, ...values]
  );
  return toProfile(r.rows[0]);
}

/** 본인 것만 지운다 (user_id 조건) */
export async function deleteProfile(userId: string, id: string): Promise<boolean> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return false;
  const pool = await db();
  const r = await pool.query(`DELETE FROM saju_profiles WHERE id = $1 AND user_id = $2`, [id, userId]);
  return (r.rowCount ?? 0) > 0;
}
