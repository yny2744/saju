"use client";

/**
 * 가입 동의 체크 (수정안 3번). 필수와 선택을 분리해서 받는다.
 *   필수: 만 14세 이상, 이용약관, 개인정보 수집·이용
 *   선택: 마케팅·광고 정보 수신 (동의하지 않아도 이용에 제한 없음)
 * 카카오 첫 로그인 후 /consent 화면과 이메일 회원가입 화면에서 함께 쓴다.
 */

export interface ConsentState {
  agreeAge: boolean;
  agreeTerms: boolean;
  agreePrivacy: boolean;
  agreeMarketing: boolean;
}

export const EMPTY_CONSENT: ConsentState = { agreeAge: false, agreeTerms: false, agreePrivacy: false, agreeMarketing: false };

export function requiredConsentDone(c: ConsentState): boolean {
  return c.agreeAge && c.agreeTerms && c.agreePrivacy;
}

const ITEMS: Array<{ key: keyof ConsentState; label: string; required: boolean; href?: string }> = [
  { key: "agreeAge", label: "만 14세 이상입니다", required: true },
  { key: "agreeTerms", label: "이용약관 동의", required: true, href: "/terms" },
  { key: "agreePrivacy", label: "개인정보 수집·이용 동의", required: true, href: "/privacy" },
  { key: "agreeMarketing", label: "새 운세·이벤트 소식 받기 (마케팅·광고 수신)", required: false },
];

export function ConsentChecks({ value, onChange }: { value: ConsentState; onChange: (next: ConsentState) => void }) {
  const all = ITEMS.every((i) => value[i.key]);
  return (
    <div className="rounded-xl p-4" style={{ backgroundColor: "var(--color-paper-soft)" }}>
      <label className="flex items-center gap-2.5 text-[15px] font-semibold">
        <input
          type="checkbox"
          checked={all}
          onChange={(e) =>
            onChange({ agreeAge: e.target.checked, agreeTerms: e.target.checked, agreePrivacy: e.target.checked, agreeMarketing: e.target.checked })
          }
          className="h-5 w-5"
        />
        전체 동의
      </label>
      <div className="hairline my-3" />
      <div className="space-y-2.5">
        {ITEMS.map((item) => (
          <div key={item.key} className="flex items-center justify-between gap-2">
            <label className="flex items-center gap-2.5 text-sm">
              <input
                type="checkbox"
                checked={value[item.key]}
                onChange={(e) => onChange({ ...value, [item.key]: e.target.checked })}
                className="h-4 w-4"
              />
              <span>
                <span style={{ color: item.required ? "var(--color-accent)" : "var(--color-ink-faint)" }}>
                  {item.required ? "[필수]" : "[선택]"}
                </span>{" "}
                {item.label}
              </span>
            </label>
            {item.href && (
              <a href={item.href} target="_blank" rel="noreferrer" className="shrink-0 text-xs underline underline-offset-4" style={{ color: "var(--color-ink-faint)" }}>
                보기
              </a>
            )}
          </div>
        ))}
      </div>
      <p className="mt-3 text-[11px] leading-relaxed" style={{ color: "var(--color-ink-faint)" }}>
        선택 항목은 동의하지 않아도 모든 서비스를 이용할 수 있고, 내 사주함에서 언제든 바꿀 수 있어요.
      </p>
    </div>
  );
}
