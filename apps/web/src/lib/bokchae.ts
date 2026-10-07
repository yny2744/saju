/**
 * 복채(서비스 안 화폐) 설정 - 2026-10-06 유샘 확정 상용화 구조.
 *
 *   무료(만세력·오늘의 운세·관상)는 로그인 없이 → 카카오 가입 선물 복채 → 990원 사주보기 → 친구 초대 보상.
 *   결제사 승인 전에는 복채로만 유료 풀이를 볼 수 있고, 승인 후 결제를 붙인다.
 *
 * ⚠️ 복채는 "선물·보상"으로만 지급한다(돈을 받고 충전하지 않는다). 유료 결제는 상품을 바로 결제하는
 *    방식으로 붙일 것 - 선불 충전금은 전자금융거래법 검토가 필요하다.
 *
 * 숫자는 운영하면서 이 파일만 고치면 바뀐다. 화면과 서버가 같이 쓴다.
 */

/** 화폐 이름 (유샘 확정 전 임시 - 바꾸면 화면 문구가 모두 바뀐다) */
export const BOKCHAE_NAME = "복채";

/** 990원 사주보기 가격 */
export const SAJU_READING_PRICE = 990;

/** 카카오(또는 이메일) 가입 선물 */
export const WELCOME_GIFT = 990;

/** 친구 초대: 초대한 친구가 새로 가입할 때마다 */
export const INVITE_REWARD = 990;

/** 친구 초대 누적 인원 달성 보너스 (인원 → 추가 복채) */
export const INVITE_MILESTONES: Array<{ count: number; bonus: number; label: string }> = [
  { count: 3, bonus: 4900, label: "이어보기 1회분" },
  { count: 10, bonus: 29500, label: "전부 보기 1회분" },
];

/** 한 사람이 한 달에 초대 보상을 받을 수 있는 최대 인원 (부정 사용 방지) */
export const INVITE_MONTHLY_CAP = 10;

/** 초대 코드 쿠키 (친구가 초대 링크로 들어오면 30일 기억) */
export const REF_COOKIE_NAME = "ryugyeol_ref";
export const REF_CODE_RE = /^[A-Z0-9]{6,10}$/;

/** 가입하러 카카오에 다녀오는 동안 보던 무료 결과를 기억하는 키 (결과 토큰이 길어 주소로 못 넘긴다) */
export const PENDING_RESULT_KEY = "ryugyeol_pending_result";
export const RESUME_RESULT_PATH = "/result?resume=1";

export function formatWon(n: number): string {
  return `${n.toLocaleString("ko-KR")}원`;
}

/** 다음 초대 보너스까지 남은 인원 (없으면 null) */
export function nextMilestone(invited: number): { count: number; bonus: number; label: string; remaining: number } | null {
  const m = INVITE_MILESTONES.find((x) => x.count > invited);
  return m ? { ...m, remaining: m.count - invited } : null;
}

/** 초대 n번째(1부터)가 성공했을 때 받을 보상 목록 */
export function inviteRewardsFor(nth: number): Array<{ amount: number; kind: "invite" | "invite_bonus"; label: string }> {
  const out: Array<{ amount: number; kind: "invite" | "invite_bonus"; label: string }> = [
    { amount: INVITE_REWARD, kind: "invite", label: "친구 초대 복채" },
  ];
  const m = INVITE_MILESTONES.find((x) => x.count === nth);
  if (m) out.push({ amount: m.bonus, kind: "invite_bonus", label: `친구 ${m.count}명 초대 보너스` });
  return out;
}
