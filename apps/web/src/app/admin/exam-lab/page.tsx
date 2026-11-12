"use client";

import { useState } from "react";

/**
 * 관리자 시험 화면 (2026-11-12 유샘) - 수능 심층분석 풀이를 AI 모델별로 나란히 읽어 보고 고른다.
 *   결제·저장 없음. 결과는 이 화면에만 보인다. 미리보기 주소에서 ANTHROPIC_API_KEY 가 있을 때 Claude 칸이 나온다.
 */

const PRODUCTS: Array<[string, string]> = [
  ["exam_deep", "수능대박운 심층분석"],
  ["exam_goal", "목표 성취운"],
  ["exam_focus", "집중과 몰입운"],
  ["exam_calm", "시험 컨디션 안정운"],
];

type R = {
  id: string;
  model: string;
  ms: number;
  chars: number;
  check: string;
  error?: string;
  raw?: string;
  parsed?: { summary: string; parts: Array<{ heading: string; body: string }> } | null;
};

export default function ExamLabPage() {
  const [date, setDate] = useState("2008-03-15");
  const [time, setTime] = useState("");
  const [gender, setGender] = useState<"male" | "female">("female");
  const [product, setProduct] = useState("exam_goal");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [results, setResults] = useState<R[]>([]);

  async function run() {
    setBusy(true);
    setMsg("풀이를 쓰는 중이에요 (1분 안팎)…");
    setResults([]);
    try {
      const res = await fetch("/api/admin/exam-lab", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, time: time || undefined, gender, product }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(j?.error?.message ?? `오류 (${res.status})`);
        return;
      }
      setResults(j.results ?? []);
      setMsg(`${j.product} · 지시문 ${j.promptChars.toLocaleString()}자`);
    } catch {
      setMsg("연결이 끊겼어요. 다시 눌러 주세요.");
    } finally {
      setBusy(false);
    }
  }

  const field = "w-full rounded-lg border px-3 py-2 text-[15px]";
  return (
    <main className="mx-auto max-w-5xl px-4 pb-16 pt-6">
      <h1 className="text-[20px] font-bold">수능 풀이 시험 (관리자)</h1>
      <p className="mt-1 text-[13px]" style={{ color: "var(--color-ink-soft)" }}>
        같은 사주로 AI마다 풀이를 뽑아 나란히 봐요. 결제·저장은 하지 않아요.
      </p>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <label className="text-[12px]">
          양력 생년월일
          <input className={field} value={date} onChange={(e) => setDate(e.target.value)} placeholder="2008-03-15" />
        </label>
        <label className="text-[12px]">
          태어난 시각 (모르면 비움)
          <input className={field} value={time} onChange={(e) => setTime(e.target.value)} placeholder="07:30" />
        </label>
        <label className="text-[12px]">
          성별
          <select className={field} value={gender} onChange={(e) => setGender(e.target.value as "male" | "female")}>
            <option value="female">여</option>
            <option value="male">남</option>
          </select>
        </label>
        <label className="text-[12px]">
          상품
          <select className={field} value={product} onChange={(e) => setProduct(e.target.value)}>
            {PRODUCTS.map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
      </div>
      <button type="button" onClick={run} disabled={busy} className="btn-primary mt-3 w-full">
        {busy ? "쓰는 중…" : "풀이 뽑기"}
      </button>
      {msg && <p className="mt-2 text-[13px]">{msg}</p>}

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {results.map((r) => (
          <section key={r.id} className="rounded-xl border p-3" style={{ backgroundColor: "var(--color-card)" }}>
            <p className="text-[14px] font-bold">{r.model}</p>
            <p className="text-[12px]" style={{ color: "var(--color-ink-soft)" }}>
              {(r.ms / 1000).toFixed(1)}초 · {r.chars.toLocaleString()}자 · 검사: {r.check}
            </p>
            {r.error && <p className="mt-2 text-[13px] text-red-700">{r.error}</p>}
            {r.parsed && (
              <div className="mt-2 space-y-3 text-[14px] leading-[1.7]">
                <p className="font-bold">{r.parsed.summary}</p>
                {r.parsed.parts.map((p) => (
                  <div key={p.heading}>
                    <p className="font-bold">{p.heading}</p>
                    <p className="whitespace-pre-line">{p.body}</p>
                  </div>
                ))}
              </div>
            )}
            {r.raw && <pre className="mt-2 max-h-96 overflow-auto whitespace-pre-wrap text-[12px]">{r.raw}</pre>}
          </section>
        ))}
      </div>
    </main>
  );
}
