/**
 * "1냥 = 1원" 안내 (2026-10-23, 카드사 심사 대응). 사이트 금액은 서비스 화폐 "냥"으로 표시하고
 * 결제창은 원으로 나오므로, 가격이 보이는 곳 가까이에 같은 금액이라는 걸 작게 알려 준다.
 */
export function WonNote({ className = "mt-3" }: { className?: string }) {
  return (
    <p className={`${className} text-center text-[12px]`} style={{ color: "var(--color-ink-faint)" }}>
      1냥 = 1원 · 표시된 금액 그대로 원으로 결제돼요 (부가세 포함)
    </p>
  );
}
