"use client";

import { isLoginRequired } from "@/lib/launchMode";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { SajuJson } from "saju-engine";
import { MemberGate, type MemberInfo } from "@/components/MemberGate";
import { HanjaPicker } from "@/components/HanjaPicker";
import { SajuLoading, randomLoadingMs } from "@/components/SajuLoading";
import { profileSummary, type SavedProfile } from "@/lib/profileView";
import { FOCUS_OPTIONS, type Focus } from "@/lib/focus";

type CalendarType = "solar" | "lunar";
type Gender = "male" | "female";
type ZiHourMethod = "standard" | "yaja_joja_split";

interface FormState {
  nickname: string;
  hanjaName: string;
  gender: Gender | null;
  calendarType: CalendarType;
  isLeapMonth: boolean;
  year: string;
  month: string;
  day: string;
  /** 태어난 시간을 아는지 */
  timeKnown: boolean;
  ampm: "am" | "pm";
  hour: number | null;
  /** 10분 단위. 선택 안 하면 정각(0분)으로 계산 */
  minute: number | null;
  birthCity: string;
  applySolarTimeCorrection: boolean;
  ziHourMethod: ZiHourMethod;
  focus: Focus | null;
}

const initialState: FormState = {
  nickname: "",
  hanjaName: "",
  gender: null,
  calendarType: "solar",
  isLeapMonth: false,
  year: "",
  month: "",
  day: "",
  timeKnown: true,
  ampm: "am",
  hour: null,
  minute: null,
  birthCity: "",
  applySolarTimeCorrection: false,
  ziHourMethod: "standard",
  focus: null,
};

const pad = (n: number | string) => String(n).padStart(2, "0");

/**
 * 생년월일시 입력 화면 (2026-10-05 개편, 용사주 입력 방식 참고).
 *  - 이름 / 한자이름(글자별 선택 팝업) / 성별 큰 버튼
 *  - 생년월일: 연·월·일 세 칸 (음력 30일도 입력 가능), 양력·음력, 윤달
 *  - 태어난 시간: 몰라요·알아요 → 오전·오후 → 시 버튼 → 분 버튼(10분 단위, 선택 안 하면 정각)
 *  - 가장 궁금한 것(선택): 무료 결과에서 그 분야를 먼저 보여주고, 결과에 함께 저장해 990원 풀이에서 쓴다
 *  - 제출하면 10~15초 랜덤 로딩 연출(여덟 글자가 하나씩 세워짐) 뒤 결과로 이동
 *
 * 지시서 10조: 출생정보를 URL에 넣지 않는다 - fetch body로만 보내고, 서버가 발급한 id로만 이동한다.
 */
export default function StartPage() {
  return <MemberGate>{(member) => <StartForm member={member} />}</MemberGate>;
}

function StartForm({ member }: { member: MemberInfo | null }) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(initialState);
  const [submitting, setSubmitting] = useState(false);
  const [issues, setIssues] = useState<string[]>([]);
  const [profiles, setProfiles] = useState<SavedProfile[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [saveToAccount, setSaveToAccount] = useState(true);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [loading, setLoading] = useState<{ durationMs: number; saju: SajuJson | null; target: string | null } | null>(null);

  useEffect(() => {
    if (!member) return;
    fetch("/api/profiles")
      .then((r) => (r.ok ? r.json() : { profiles: [] }))
      .then((d: { profiles?: SavedProfile[] }) => setProfiles(d.profiles ?? []))
      .catch(() => {});
  }, [member]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function loadProfile(id: string) {
    setSelectedId(id);
    const p = profiles.find((x) => x.id === id);
    if (!p) {
      setForm(initialState);
      return;
    }
    const [y, m, d] = p.date.split("-");
    const [hh, mm] = p.time ? p.time.split(":").map(Number) : [null, null];
    setForm((prev) => ({
      ...prev,
      nickname: p.name,
      hanjaName: p.hanjaName ?? "",
      gender: p.gender,
      calendarType: p.calendarType,
      isLeapMonth: p.isLeapMonth,
      year: y,
      month: String(Number(m)),
      day: String(Number(d)),
      timeKnown: p.time !== null,
      ampm: hh !== null && hh >= 12 ? "pm" : "am",
      hour: hh,
      minute: mm,
      birthCity: p.birthCity ?? "",
    }));
  }

  /** 입력값 → API용 날짜·시간. 문제가 있으면 issues 반환 */
  function buildBirth(): { date: string; time?: string } | { issues: string[] } {
    const errs: string[] = [];
    const y = Number(form.year);
    const m = Number(form.month);
    const d = Number(form.day);
    if (!form.nickname.trim()) errs.push("이름을 입력해 주세요.");
    if (!form.gender) errs.push("성별을 선택해 주세요.");
    if (!/^\d{4}$/.test(form.year) || y < 1900 || y > 2100) errs.push("태어난 해를 4자리로 입력해 주세요. (예: 1968)");
    if (!(m >= 1 && m <= 12)) errs.push("태어난 월을 1~12 사이로 입력해 주세요.");
    if (!(d >= 1 && d <= 31)) errs.push("태어난 일을 1~31 사이로 입력해 주세요.");
    if (form.timeKnown && form.hour === null) errs.push("태어난 시(時)를 선택해 주세요. 모르시면 '몰라요'를 눌러 주세요.");
    if (errs.length) return { issues: errs };
    return {
      date: `${y}-${pad(m)}-${pad(d)}`,
      time: form.timeKnown && form.hour !== null ? `${pad(form.hour)}:${pad(form.minute ?? 0)}` : undefined,
    };
  }

  async function saveProfileIfWanted(date: string, time: string | undefined) {
    if (!member || !saveToAccount) return;
    await fetch("/api/profiles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.nickname,
        hanjaName: form.hanjaName || undefined,
        gender: form.gender,
        calendarType: form.calendarType,
        isLeapMonth: form.calendarType === "lunar" && form.isLeapMonth,
        date,
        time,
        birthCity: form.birthCity || undefined,
      }),
    }).catch(() => {}); // 저장 실패는 사주 보기를 막지 않는다
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return; // 중복 제출 방지
    const birth = buildBirth();
    if ("issues" in birth) {
      setIssues(birth.issues);
      return;
    }
    setSubmitting(true);
    setIssues([]);
    // 로딩 연출은 바로 시작하고, 계산 결과가 오면 그 사람의 실제 여덟 글자를 채워 넣는다
    setLoading({ durationMs: randomLoadingMs(), saju: null, target: null });

    try {
      const res = await fetch("/api/saju/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nickname: form.nickname,
          hanjaName: form.hanjaName || undefined,
          gender: form.gender,
          calendarType: form.calendarType,
          isLeapMonth: form.calendarType === "lunar" ? form.isLeapMonth : undefined,
          date: birth.date,
          time: birth.time,
          birthCity: form.birthCity || undefined,
          applySolarTimeCorrection: form.applySolarTimeCorrection,
          ziHourMethod: form.ziHourMethod,
          focus: form.focus ?? undefined,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        const leapHint =
          data?.error?.code === "SAJU_CALCULATION_FAILED" && form.calendarType === "lunar" && form.isLeapMonth
            ? ["그 해 그 달에는 윤달이 없어요. '윤달에 태어났어요' 체크를 다시 확인해 주세요."]
            : data?.error?.code === "SAJU_CALCULATION_FAILED"
              ? ["입력한 날짜를 계산할 수 없어요. 연·월·일(특히 음력 날짜)을 다시 확인해 주세요."]
              : null;
        setIssues(leapHint ?? data?.error?.issues ?? [data?.error?.message ?? "분석 요청에 실패했습니다."]);
        setLoading(null);
        setSubmitting(false);
        return;
      }

      await saveProfileIfWanted(birth.date, birth.time);

      // 메인 화면 "오늘의 운세"에서 들어온 경우(?next=fortune)는 만세력을 거치지 않고 바로 운세로 보낸다.
      // 허용값은 fortune 하나뿐이라 임의 주소로 이동시킬 수 없다.
      const next = new URLSearchParams(window.location.search).get("next");
      const target =
        next === "fortune" ? `/fortune?resultId=${encodeURIComponent(data.id)}` : `/result?id=${encodeURIComponent(data.id)}`;

      // 로딩 화면에 보여줄 여덟 글자
      const saju = await fetch(`/api/saju/result/${encodeURIComponent(data.id)}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => (d?.saju as SajuJson) ?? null)
        .catch(() => null);
      if (!saju) {
        router.push(target); // 연출용 데이터를 못 받아도 결과는 보여준다
        return;
      }
      setLoading((prev) => (prev ? { ...prev, saju, target } : prev));
    } catch {
      setIssues(["네트워크 오류가 발생했습니다. 잠시 후 다시 시도해 주세요."]);
      setLoading(null);
      setSubmitting(false);
    }
  }

  const target = loading?.target ?? null;
  const handleLoadingDone = useCallback(() => {
    if (target) router.push(target);
  }, [router, target]);

  if (loading) {
    return (
      <SajuLoading
        nickname={form.nickname.trim()}
        saju={loading.saju}
        durationMs={loading.durationMs}
        onDone={handleLoadingDone}
      />
    );
  }

  const hours = form.ampm === "am" ? [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] : [12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23];

  return (
    <main className="mx-auto min-h-screen max-w-md px-5 pb-16 pt-12 sm:pt-16">
      <header className="mb-8">
        <p className="mb-2.5 text-sm font-semibold" style={{ fontFamily: "var(--font-serif)", color: "var(--color-accent)" }}>
          류결사주
        </p>
        <div className="mb-3 flex flex-wrap gap-1.5">
          {(isLoginRequired() ? ["무료", "약 1분 소요"] : ["무료", "회원가입 불필요", "약 1분 소요"]).map((badge) => (
            <span
              key={badge}
              className="rounded-full px-2.5 py-1 text-[11px] font-medium"
              style={{ backgroundColor: "var(--color-accent-soft)", color: "var(--color-accent)" }}
            >
              {badge}
            </span>
          ))}
        </div>
        <h1 className="text-[26px] font-bold leading-snug">
          생년월일로 보는
          <br />
          나의 사주풀이
        </h1>
        <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--color-ink-soft)" }}>
          정확한 생년월일시를 입력할수록 풀이가 정확해요.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-8" noValidate>
        {/* 저장한 사람 불러오기 (로그인한 경우) */}
        {member && profiles.length > 0 && (
          <div className="rounded-xl p-4" style={{ backgroundColor: "var(--color-paper-soft)" }}>
            <label htmlFor="savedProfile" className="mb-1.5 block text-sm font-medium">
              저장한 사람 불러오기
            </label>
            <select id="savedProfile" value={selectedId} onChange={(e) => loadProfile(e.target.value)} className="field-input">
              <option value="">새로 입력하기</option>
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                  {p.hanjaName ? ` ${p.hanjaName}` : ""} · {profileSummary(p)}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* ① 기본 정보 */}
        <fieldset className="space-y-4">
          <legend className="section-label mb-1">① 기본 정보</legend>

          <div>
            <label htmlFor="nickname" className="mb-1.5 block text-sm font-medium">
              이름
            </label>
            <input
              id="nickname"
              type="text"
              maxLength={20}
              value={form.nickname}
              onChange={(e) => update("nickname", e.target.value)}
              className="field-input"
              placeholder="예: 홍길동"
            />
          </div>

          <div>
            <span className="mb-1.5 block text-sm font-medium">
              한자이름 <span style={{ color: "var(--color-ink-faint)" }}>(선택)</span>
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPickerOpen(true)}
                className="field-input flex-1 text-left"
                style={{ fontFamily: form.hanjaName ? "var(--font-serif)" : undefined, color: form.hanjaName ? undefined : "var(--color-ink-faint)" }}
              >
                {form.hanjaName || "눌러서 이름 한자를 골라 주세요"}
              </button>
              {form.hanjaName && (
                <button
                  type="button"
                  onClick={() => update("hanjaName", "")}
                  className="shrink-0 rounded-xl px-3 text-sm"
                  style={{ border: "1px solid var(--color-line)", color: "var(--color-accent)" }}
                >
                  삭제
                </button>
              )}
            </div>
            <p className="mt-1.5 text-xs" style={{ color: "var(--color-ink-faint)" }}>
              정확한 분석을 위해 한자 이름 입력을 권해 드려요. 사주 계산 자체에는 쓰이지 않아요.
            </p>
          </div>

          <div>
            <span className="mb-1.5 block text-sm font-medium">성별</span>
            <div className="grid grid-cols-2 gap-2">
              {([
                ["male", "남성 (男)"],
                ["female", "여성 (女)"],
              ] as const).map(([g, label]) => (
                <ChoiceButton key={g} active={form.gender === g} onClick={() => update("gender", g)}>
                  {label}
                </ChoiceButton>
              ))}
            </div>
          </div>
        </fieldset>

        {/* ② 태어난 때 */}
        <fieldset className="space-y-4">
          <legend className="section-label mb-1">② 태어난 때</legend>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-sm font-medium">생년월일</span>
              <div className="segmented" role="radiogroup" aria-label="양력 또는 음력">
                {(["solar", "lunar"] as const).map((c) => (
                  <button
                    key={c}
                    type="button"
                    role="radio"
                    aria-checked={form.calendarType === c}
                    data-active={form.calendarType === c}
                    onClick={() => update("calendarType", c)}
                    className="segmented-option"
                  >
                    {c === "solar" ? "양력" : "음력"}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {([
                ["year", "1968", "년(年)", 4],
                ["month", "12", "월(月)", 2],
                ["day", "27", "일(日)", 2],
              ] as const).map(([key, ph, label, len]) => (
                <div key={key}>
                  <input
                    id={`birth-${key}`}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={len}
                    value={form[key]}
                    onChange={(e) => update(key, e.target.value.replace(/\D/g, "").slice(0, len))}
                    className="field-input text-center text-[17px]"
                    placeholder={ph}
                    aria-label={label}
                  />
                  <p className="mt-1 text-center text-xs" style={{ color: "var(--color-ink-faint)" }}>
                    {label}
                  </p>
                </div>
              ))}
            </div>
            {form.calendarType === "lunar" && (
              <label className="mt-2.5 flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.isLeapMonth}
                  onChange={(e) => update("isLeapMonth", e.target.checked)}
                  className="h-4 w-4"
                />
                윤달에 태어났어요
                <span className="text-xs" style={{ color: "var(--color-ink-faint)" }}>
                  (예: 윤4월)
                </span>
              </label>
            )}
          </div>

          <div>
            <span className="mb-1.5 block text-sm font-medium">태어난 시간 (時)</span>
            <div className="grid grid-cols-2 gap-2">
              <ChoiceButton active={!form.timeKnown} onClick={() => update("timeKnown", false)}>
                몰라요
              </ChoiceButton>
              <ChoiceButton active={form.timeKnown} onClick={() => update("timeKnown", true)}>
                알아요
              </ChoiceButton>
            </div>

            {form.timeKnown && (
              <>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {([
                    ["am", "오전", "자정 ~ 낮 12시"],
                    ["pm", "오후", "낮 12시 ~ 자정"],
                  ] as const).map(([v, label, sub]) => (
                    <ChoiceButton
                      key={v}
                      active={form.ampm === v}
                      onClick={() => setForm((prev) => ({ ...prev, ampm: v, hour: null, minute: null }))}
                    >
                      <span className="block text-[16px] font-bold">{label}</span>
                      <span className="block text-[11px] font-normal" style={{ color: "var(--color-ink-faint)" }}>
                        {sub}
                      </span>
                    </ChoiceButton>
                  ))}
                </div>

                <p className="mb-2 mt-4 text-center text-sm font-medium">몇 시에 태어나셨나요?</p>
                <div className="grid grid-cols-4 gap-2">
                  {hours.map((h) => (
                    <ChoiceButton key={h} small active={form.hour === h} onClick={() => setForm((prev) => ({ ...prev, hour: h }))}>
                      {h}시
                    </ChoiceButton>
                  ))}
                </div>

                {form.hour !== null && (
                  <>
                    <p className="mb-2 mt-4 text-center text-sm font-medium">
                      몇 분에 태어나셨나요?{" "}
                      <span className="text-xs font-normal" style={{ color: "var(--color-ink-faint)" }}>
                        (모르면 넘어가셔도 돼요)
                      </span>
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {[0, 10, 20, 30, 40, 50].map((m) => (
                        <ChoiceButton
                          key={m}
                          small
                          active={form.minute === m}
                          onClick={() => update("minute", form.minute === m ? null : m)}
                        >
                          {m}분
                        </ChoiceButton>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </fieldset>

        {/* ③ 무엇이 궁금하신가요? (선택) */}
        <fieldset className="space-y-2">
          <legend className="section-label mb-1">③ 무엇이 가장 궁금하신가요? (선택)</legend>
          {FOCUS_OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => update("focus", form.focus === o.value ? null : o.value)}
              className="block w-full rounded-xl px-4 py-3 text-left text-[14px] font-medium"
              style={{
                border: form.focus === o.value ? "2px solid var(--color-accent)" : "1px solid var(--color-line)",
                backgroundColor: form.focus === o.value ? "var(--color-accent-soft)" : "var(--color-paper-soft)",
              }}
            >
              {o.label} <span style={{ color: "var(--color-ink-faint)", fontFamily: "var(--font-serif)" }}>({o.hanja})</span>
            </button>
          ))}
          <p className="text-xs" style={{ color: "var(--color-ink-faint)" }}>
            고르시면 결과에서 그 부분을 먼저 보여 드려요.
          </p>
        </fieldset>

        <details className="rounded-xl px-4 py-3" style={{ backgroundColor: "var(--color-paper-soft)" }}>
          <summary className="cursor-pointer text-sm font-medium" style={{ color: "var(--color-ink-soft)" }}>
            정밀 옵션 (선택)
          </summary>
          <div className="mt-3 space-y-3">
            <div>
              <label htmlFor="birthCity" className="mb-1.5 block text-sm font-medium">
                출생 도시
              </label>
              <input
                id="birthCity"
                type="text"
                maxLength={50}
                value={form.birthCity}
                onChange={(e) => update("birthCity", e.target.value)}
                className="field-input"
                placeholder="예: 서울"
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.applySolarTimeCorrection}
                onChange={(e) => update("applySolarTimeCorrection", e.target.checked)}
                className="h-4 w-4"
              />
              태양시 보정 적용
            </label>
            <div>
              <label htmlFor="ziHourMethod" className="mb-1.5 block text-sm font-medium">
                자시(子時) 처리 방식
              </label>
              <select
                id="ziHourMethod"
                value={form.ziHourMethod}
                onChange={(e) => update("ziHourMethod", e.target.value as ZiHourMethod)}
                className="field-input"
              >
                <option value="standard">표준 (23:00부터 다음날로 처리)</option>
                <option value="yaja_joja_split">야자시 · 조자시 분리</option>
              </select>
            </div>
          </div>
        </details>

        {issues.length > 0 && (
          <ul className="rounded-lg px-3.5 py-3 text-sm" style={{ backgroundColor: "var(--color-danger-soft)", color: "var(--color-danger)" }}>
            {issues.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        )}

        {member && (
          <label className="flex items-center gap-2 text-sm" style={{ color: "var(--color-ink-soft)" }}>
            <input type="checkbox" checked={saveToAccount} onChange={(e) => setSaveToAccount(e.target.checked)} className="h-4 w-4" />
            다음에 바로 불러오도록 저장하기
          </label>
        )}

        <button type="submit" disabled={submitting} className="btn-primary">
          무료로 내 만세력 보기
        </button>
      </form>

      {pickerOpen && (
        <HanjaPicker
          name={form.nickname}
          value={form.hanjaName}
          onClose={() => setPickerOpen(false)}
          onDone={(h) => {
            update("hanjaName", h);
            setPickerOpen(false);
          }}
        />
      )}
    </main>
  );
}

function ChoiceButton({
  active,
  onClick,
  small,
  children,
}: {
  active: boolean;
  onClick: () => void;
  small?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-xl text-center ${small ? "py-2.5 text-[14px]" : "py-3 text-[15px]"} font-semibold`}
      style={{
        border: active ? "2px solid var(--color-accent)" : "1px solid var(--color-line)",
        backgroundColor: active ? "var(--color-accent-soft)" : "var(--color-paper-soft)",
        color: active ? "var(--color-accent)" : "var(--color-ink)",
      }}
    >
      {children}
    </button>
  );
}
