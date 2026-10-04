"use client";

import { isLive } from "@/lib/launchMode";
import { useState } from "react";
import { useRouter } from "next/navigation";

type CalendarType = "solar" | "lunar";
type Gender = "male" | "female";
type ZiHourMethod = "standard" | "yaja_joja_split";

interface FormState {
  nickname: string;
  hanjaName: string;
  gender: Gender;
  calendarType: CalendarType;
  date: string;
  time: string;
  timeUnknown: boolean;
  birthCity: string;
  applySolarTimeCorrection: boolean;
  ziHourMethod: ZiHourMethod;
}

const initialState: FormState = {
  nickname: "",
  hanjaName: "",
  gender: "female",
  calendarType: "solar",
  date: "",
  time: "",
  timeUnknown: false,
  birthCity: "",
  applySolarTimeCorrection: false,
  ziHourMethod: "standard",
};

/**
 * 지시서 22/23조: 입력 화면 + 분석 중 로딩 처리 + 중복 제출 방지.
 * 지시서 10조: 출생정보를 URL에 절대 넣지 않는다 - 여기서는 fetch body로만 보내고,
 * 성공하면 서버가 발급한 id만으로 /result?id=... 로 이동한다.
 *
 * ⚠️ 2026-10 이동: 이 화면은 원래 "/"(루트)였다. Toss 가맹 심사·방문자 전환을
 * 고려해 "/"는 서비스 소개용 최소 랜딩 화면으로 바꾸고, 실제 입력 폼은 이
 * "/start"로 옮겼다 - 로직/필드/검증은 전혀 바뀌지 않았고 경로와 진입 동선만
 * 바뀌었다.
 */
export default function StartPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(initialState);
  const [submitting, setSubmitting] = useState(false);
  const [issues, setIssues] = useState<string[]>([]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return; // 중복 제출 방지
    setSubmitting(true);
    setIssues([]);

    try {
      const res = await fetch("/api/saju/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nickname: form.nickname,
          hanjaName: form.hanjaName || undefined,
          gender: form.gender,
          calendarType: form.calendarType,
          date: form.date,
          time: form.timeUnknown ? undefined : form.time || undefined,
          birthCity: form.birthCity || undefined,
          applySolarTimeCorrection: form.applySolarTimeCorrection,
          ziHourMethod: form.ziHourMethod,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setIssues(data?.error?.issues ?? [data?.error?.message ?? "분석 요청에 실패했습니다."]);
        setSubmitting(false);
        return;
      }

      // 메인 화면 "오늘의 운세"에서 들어온 경우(?next=fortune)는 만세력을 거치지 않고 바로 운세로 보낸다.
      // 허용값은 fortune 하나뿐이라 임의 주소로 이동시킬 수 없다.
      const next = new URLSearchParams(window.location.search).get("next");
      router.push(
        next === "fortune"
          ? `/fortune?resultId=${encodeURIComponent(data.id)}`
          : `/result?id=${encodeURIComponent(data.id)}`
      );
    } catch {
      setIssues(["네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요."]);
      setSubmitting(false);
    }
  }

  return (
    <>
      <main className="mx-auto min-h-screen max-w-md px-5 pb-16 pt-12 sm:pt-16">
        <header className="mb-8">
          <p
            className="mb-2.5 text-sm font-semibold"
            style={{ fontFamily: "var(--font-serif)", color: "var(--color-accent)" }}
          >
            류결사주
          </p>
          <div className="mb-3 flex flex-wrap gap-1.5">
            {["무료", "회원가입 불필요", "약 1분 소요"].map((badge) => (
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
            태어난 날짜와 시간으로 사주 원국을 계산하고, 성향·재물·연애·직업 흐름을 풀어드려요.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-7">
          {/* 그룹 1: 기본 정보 */}
          <fieldset className="space-y-4">
            <legend className="section-label mb-1">기본 정보</legend>

            <div>
              <label htmlFor="nickname" className="mb-1.5 block text-sm font-medium">
                이름
              </label>
              <input
                id="nickname"
                type="text"
                required
                maxLength={20}
                value={form.nickname}
                onChange={(e) => update("nickname", e.target.value)}
                className="field-input"
                placeholder="예: 홍길동"
              />
            </div>

            {isLive() && (
            <div>
              <label htmlFor="hanjaName" className="mb-1.5 block text-sm font-medium">
                한자이름 <span style={{ color: "var(--color-ink-faint)" }}>(선택)</span>
              </label>
              <input
                id="hanjaName"
                type="text"
                maxLength={10}
                value={form.hanjaName}
                onChange={(e) => update("hanjaName", e.target.value)}
                className="field-input"
                placeholder="예: 柳南榮 (모르시면 비워두셔도 돼요)"
              />
              <p className="mt-1.5 text-xs" style={{ color: "var(--color-ink-faint)" }}>
                결과 화면에 이름과 함께 표시돼요. 사주 계산 자체에는 쓰이지 않아요.
              </p>
            </div>
            )}

            <div>
              <span className="mb-1.5 block text-sm font-medium">성별</span>
              <div className="segmented" role="radiogroup" aria-label="성별">
                {(["female", "male"] as const).map((g) => (
                  <button
                    key={g}
                    type="button"
                    role="radio"
                    aria-checked={form.gender === g}
                    data-active={form.gender === g}
                    onClick={() => update("gender", g)}
                    className="segmented-option"
                  >
                    {g === "female" ? "여성" : "남성"}
                  </button>
                ))}
              </div>
            </div>
          </fieldset>

          <div className="hairline" />

          {/* 그룹 2: 생년월일 */}
          <fieldset className="space-y-4">
            <legend className="section-label mb-1">생년월일</legend>

            <div>
              <span className="mb-1.5 block text-sm font-medium">양력 · 음력</span>
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

            <div>
              <label htmlFor="date" className="mb-1.5 block text-sm font-medium">
                생년월일
              </label>
              <input
                id="date"
                type="date"
                required
                value={form.date}
                onChange={(e) => update("date", e.target.value)}
                className="field-input"
              />
            </div>
          </fieldset>

          <div className="hairline" />

          {/* 그룹 3: 출생시간 · 출생지 */}
          <fieldset className="space-y-4">
            <legend className="section-label mb-1">출생시간</legend>

            <div>
              <label htmlFor="time" className="mb-1.5 block text-sm font-medium">
                태어난 시간
              </label>
              <div className="flex items-center gap-3">
                <input
                  id="time"
                  type="time"
                  disabled={form.timeUnknown}
                  value={form.time}
                  onChange={(e) => update("time", e.target.value)}
                  className="field-input flex-1"
                />
                <label className="flex shrink-0 items-center gap-1.5 text-sm" style={{ color: "var(--color-ink-soft)" }}>
                  <input
                    type="checkbox"
                    checked={form.timeUnknown}
                    onChange={(e) => update("timeUnknown", e.target.checked)}
                    className="h-4 w-4"
                  />
                  시간 모름
                </label>
              </div>
            </div>

            <div>
              <label htmlFor="birthCity" className="mb-1.5 block text-sm font-medium">
                출생 도시 <span style={{ color: "var(--color-ink-faint)" }}>(선택)</span>
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
          </fieldset>

          <details className="rounded-xl px-4 py-3" style={{ backgroundColor: "var(--color-paper-soft)" }}>
            <summary className="cursor-pointer text-sm font-medium" style={{ color: "var(--color-ink-soft)" }}>
              정밀 옵션 (선택)
            </summary>
            <div className="mt-3 space-y-3">
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
            <ul
              className="rounded-lg px-3.5 py-3 text-sm"
              style={{ backgroundColor: "var(--color-accent-soft)", color: "var(--color-accent)" }}
            >
              {issues.map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
          )}

          <button type="submit" disabled={submitting} className="btn-primary">
            {submitting ? "사주를 살펴보고 있어요..." : "무료로 내 사주 보기"}
          </button>
        </form>
      </main>
    </>
  );
}
