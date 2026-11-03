import { TEXT_ZOOM_GUARD } from "@/lib/textZoomGuard";

/**
 * 카카오톡 글자 확대 사이트 전체 보정 (2026-11-03 유샘, lib/textZoomGuard.ts).
 * 화면을 그리기 전에 실행되도록 <body> 맨 앞에 둔다. 손님 입력이 섞이지 않는 고정 문자열이라 XSS 걱정이 없다
 * (대문 GateOverlay 의 DECIDE 스크립트와 같은 방식).
 */
export function TextZoomGuard() {
  return <script dangerouslySetInnerHTML={{ __html: TEXT_ZOOM_GUARD }} />;
}
