/**
 * Phase 8: 결과/운세/유료결과 화면이 각자 조금씩 다른 문구로 반복 구현하던
 * 로딩·에러 상태를 하나의 컴포넌트로 정리한다. API 호출 방식이나 에러 처리
 * 로직 자체는 그대로 두고(지시서 7조), 화면 표현만 통일한다.
 */
export function LoadingState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-24 text-center">
      <span
        aria-hidden
        className="h-5 w-5 animate-spin rounded-full border-2"
        style={{ borderColor: "var(--color-line)", borderTopColor: "var(--color-accent)" }}
      />
      <p className="text-sm" style={{ color: "var(--color-ink-soft)" }}>
        {message}
      </p>
    </div>
  );
}

export function ErrorState({ message, linkHref, linkLabel }: { message: string; linkHref: string; linkLabel: string }) {
  return (
    <div className="py-24 text-center">
      <p className="text-sm font-medium" style={{ color: "var(--color-accent)" }}>
        {message}
      </p>
      <a href={linkHref} className="mt-4 inline-block text-sm underline underline-offset-4">
        {linkLabel}
      </a>
    </div>
  );
}
