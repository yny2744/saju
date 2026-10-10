/**
 * 엽전(서비스 안 화폐) 설정 - 2026-10-08 유샘 확정.
 *
 *   무료(만세력·오늘의 운세·띠별 운세·이름 풀이·관상)는 로그인 없이
 *   → 카카오 가입 선물 엽전 → 990냥 맛보기 → 4,900냥 깊게 보기 / 9,900냥 3개 몰아보기 / 29,500냥 12개 전부 보기
 *   → 친구 초대로 엽전 모으기.
 *
 * 단위는 "냥" (1냥 = 1원). 엽전은 "선물·보상"으로만 지급한다(돈을 받고 충전하지 않는다 - 선불 충전금은
 * 전자금융거래법 검토가 필요). 결제사 승인 후에는 상품을 바로 결제하는 방식으로 붙인다.
 *
 * 숫자는 운영하면서 이 파일만 고치면 화면과 서버가 함께 바뀐다.
 * (DB 장부 테이블 이름은 예전 이름 bokchae_ledger 그대로 쓴다 - 이미 쌓인 기록을 옮기지 않기 위해)
 */

export const CURRENCY_NAME = "엽전";
export const CURRENCY_UNIT = "냥";

/** 가격 (냥) */
export const PRICE = {
  /** 운세 보기 - 12가지 중 고른 운세 하나 (2026-10-09 수정안 20) */
  BASIC: 990,
  /** (예전 상품, 더 이상 팔지 않음) 맛보기 - 12가지를 짧게 한 번씩. 이미 산 풀이를 다시 보는 데만 쓰인다 */
  TASTE: 990,
  /** 한 가지 운세 깊게 보기 */
  DEEP: 4900,
  /** 3가지 운세 몰아보기 */
  BUNDLE3: 9900,
  /** 12가지 운세 전부 보기 (+ 월별 운세·개운법) */
  BUNDLE12: 29500,
} as const;

/** 묶음의 정가(깊게 보기 따로 산 값)·할인액·할인율 - 화면 표시용 */
export function bundleDiscount(count: number, price: number): { list: number; off: number; percent: number } {
  const list = PRICE.DEEP * count;
  const off = Math.max(0, list - price);
  return { list, off, percent: list > 0 ? Math.round((off / list) * 100) : 0 };
}

/** 가입 선물 */
export const WELCOME_GIFT = 990;

/**
 * 친구 초대 - 한 바퀴(10명) 안에서 n번째 친구까지의 "누적 총액" (유샘 확정).
 * 1명 990 · 2명 1,980 · 3명 4,900 · 4명부터 1명마다 +990 · 10명 30,000.
 * 11명째부터는 새 바퀴로 처음부터 다시(11명째 = 1명째). 월 한도 없음.
 */
export const INVITE_CUMULATIVE = [990, 1980, 4900, 5890, 6880, 7870, 8860, 9850, 10840, 30000] as const;
export const INVITE_CYCLE = INVITE_CUMULATIVE.length;

/** n번째(1부터) 친구가 가입했을 때 받는 엽전 */
export function inviteRewardFor(nth: number): number {
  if (!Number.isInteger(nth) || nth < 1) return 0;
  const pos = ((nth - 1) % INVITE_CYCLE) + 1; // 바퀴 안의 위치 1~10
  const before = pos === 1 ? 0 : INVITE_CUMULATIVE[pos - 2];
  return INVITE_CUMULATIVE[pos - 1] - before;
}

/** 지금 바퀴에서 몇 명째까지 왔는지 + 다음 큰 보상까지 남은 인원 */
export function inviteProgress(invited: number): {
  round: number;
  inRound: number;
  earnedThisRound: number;
  next: { atCount: number; total: number; remaining: number } | null;
} {
  const n = Math.max(0, Math.floor(invited));
  const round = Math.floor(n / INVITE_CYCLE) + 1;
  const inRound = n % INVITE_CYCLE;
  const earnedThisRound = inRound === 0 ? 0 : INVITE_CUMULATIVE[inRound - 1];
  // 다음 "큰 보상" 지점: 3명(4,900), 10명(30,000)
  const marks = [3, 10];
  const mark = marks.find((m) => m > inRound);
  const next = mark ? { atCount: mark, total: INVITE_CUMULATIVE[mark - 1], remaining: mark - inRound } : null;
  return { round, inRound, earnedThisRound, next };
}

/** 초대 코드 쿠키 (친구가 초대 링크로 들어오면 30일 기억) */
export const REF_COOKIE_NAME = "ryugyeol_ref";
export const REF_CODE_RE = /^[A-Z0-9]{6,10}$/;

/** 가입하러 카카오에 다녀오는 동안 보던 무료 결과를 기억하는 키 (결과 토큰이 길어 주소로 못 넘긴다) */
export const PENDING_RESULT_KEY = "ryugyeol_pending_result";
export const RESUME_RESULT_PATH = "/result?resume=1";

/** 1,234냥 */
export function formatNyang(n: number): string {
  return `${n.toLocaleString("ko-KR")}${CURRENCY_UNIT}`;
}

/** 장부의 예전 기록 이름(복채)을 지금 이름(엽전)으로 바꿔 보여준다 */
export function displayLedgerLabel(label: string): string {
  return label.replace(/복채/g, CURRENCY_NAME);
}

/**
 * 계좌 입금 충전 (2026-10-10). 1냥 = 1원. 상품 값에 맞춘 금액만 고를 수 있다.
 * 990냥은 계좌 입금으로 받지 않는다 (2026-10-06 유샘: 계좌이체는 고가 상품 보조용).
 */
export const CHARGE_OPTIONS = [4900, 9900, 29500, 50000] as const;
export function isChargeOption(v: unknown): v is (typeof CHARGE_OPTIONS)[number] {
  return typeof v === "number" && (CHARGE_OPTIONS as readonly number[]).includes(v);
}
/** 아직 확인 안 된 충전 신청은 한 사람당 이만큼까지 */
export const MAX_PENDING_CHARGES = 3;
export const CHARGE_PATH = "/charge";
