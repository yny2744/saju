/**
 * 유입 경로 꼬리표 (2026-10-28 mgml 4번 작업).
 * 광고·글 주소 끝에 붙인 utm 꼬리표를 처음 들어온 순간 30일 동안 기억해 두고(처음 받은 것 우선),
 * 방문 집계와 결제 주문에 함께 적는다 → 관리자 화면에서 "어느 채널의 어느 광고가 매출을 냈는지" 본다.
 *   예) https://…/l/bond?utm_source=youtube&utm_medium=shorts&utm_campaign=gunghap01
 *   기억하는 값: "youtube|shorts|gunghap01|bond"  (출처|매체|캠페인|랜딩)
 * 이름·생년월일 같은 개인 정보는 담지 않는다.
 */
export const SRC_COOKIE_NAME = "ryugyeol_src";
export const SRC_MAX_AGE = 60 * 60 * 24 * 30;

/** 한 칸: 한글·영문·숫자·_ . - 만, 40자까지 */
function clean(v: string | null | undefined): string {
  return (v ?? "").normalize("NFC").replace(/[^0-9A-Za-z가-힣_.-]/g, "").slice(0, 40);
}

/** 주소의 꼬리표 → 기억할 값. 꼬리표도 없고 랜딩도 아니면 null (기억하지 않음) */
export function sourceFromUrl(search: string, pathname: string): string | null {
  const q = new URLSearchParams(search);
  const source = clean(q.get("utm_source"));
  const landing = /^\/l\/([a-z0-9-]+)\/?$/.exec(pathname)?.[1] ?? "";
  if (!source && !landing) return null;
  return [source || "direct", clean(q.get("utm_medium")), clean(q.get("utm_campaign")), clean(landing)].join("|");
}

/** 저장된 값이 우리가 만든 모양인지 (서버에서 받을 때 확인) */
export function validSource(v: unknown): string | null {
  if (typeof v !== "string") return null;
  let s = v;
  try {
    s = decodeURIComponent(v);
  } catch {
    return null;
  }
  const parts = s.split("|");
  if (parts.length !== 4 || parts.some((p) => p !== clean(p)) || !parts[0]) return null;
  return s;
}

/** 관리자 화면용 읽기 좋은 이름 */
export function sourceLabel(v: string | null): { source: string; medium: string; campaign: string; landing: string } {
  const [source = "(꼬리표 없음)", medium = "", campaign = "", landing = ""] = (v ?? "(꼬리표 없음)|||").split("|");
  return { source, medium, campaign, landing };
}
