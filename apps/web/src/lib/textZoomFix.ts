/**
 * 카카오톡 인앱 브라우저 글자 확대 보정 (2026-11-02 유샘) - 카카오톡의 글자 크기 설정(안드로이드 웹뷰 textZoom)은
 * -webkit-text-size-adjust 로 막히지 않고 글자를 강제로 키운다. 화면에 실제로 적용된 글자 크기를 재서,
 * 기대한 크기보다 크면 그 비율만큼 줄여 기대한 크기로 맞춘다 (줄인 값에 다시 확대가 곱해져 결국 기대한 크기가 된다).
 * 반환: 적용된 확대 비율 (1 이면 확대 없음)
 */
export function fitFontSize(el: HTMLElement | null, px: number): number {
  if (!el || typeof window === "undefined") return 1;
  el.style.fontSize = `${px}px`;
  // 2026-11-03: 사이트 전체 보정(lib/textZoomGuard.ts)이 켜져 있으면 그쪽이 맞춘다 (두 번 줄이지 않게)
  if (document.documentElement.hasAttribute("data-tzfix")) return 1;
  const actual = parseFloat(window.getComputedStyle(el).fontSize);
  if (!actual || actual <= px * 1.03) return 1;
  const ratio = actual / px;
  el.style.fontSize = `${px / ratio}px`;
  return ratio;
}
