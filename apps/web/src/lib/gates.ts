import type { TenantPrices } from "@/tenants/types";

/**
 * 관별 대문 설정 (2026-11-02 유샘 지시서) - 여기에 한 줄씩 적으면 /go/<slug> 대문과 관 화면 맨 위 자리가 만들어진다.
 *   대문 영상은 public/gate/<gateDir>/ 의 1_intro·2_loop·3_open × portrait·landscape (.mp4) 와 같은 이름의 첫 장면(.jpg).
 *   영상을 바꿀 때는 public/gate/base/ 파일만 같은 이름으로 갈아 끼우면 된다. 계절 대문을 쓰려면 gateDir 에 다른 폴더를 적는다.
 *   제목·엠블럼·브랜드는 영상에 굽지 않고 화면 글자로 얹는다 (components/gate/GateTitle.tsx).
 */

export type GateRoomKey = "suneung" | "newyear" | "gunghap" | "tarot";

export interface GateEntry {
  /** 링크 주소: /go/<slug> */
  slug: string;
  /** 원형 문 안의 제목 */
  title: string;
  /** 부제 (선택) - 관 화면 맨 위 대표 그림 아래에 */
  subtitle?: string;
  /** 버튼 문구: 무료로 볼 수 있는 손님 / 엽전을 다 쓴 손님 */
  button: { free: string; paid: string };
  /** 무료 판정 상품 가격 - 로그인한 손님의 엽전이 이 값 이상이면 "무료". 없으면 늘 무료(맛보기가 무료인 관) */
  priceKey?: keyof TenantPrices;
  /** 들어갈 관 (관 화면) */
  room: GateRoomKey;
  /** 관 화면 맨 위 홍보 영상 (있으면) */
  promoVideo?: string;
  /** 홍보 영상이 없을 때 대표 그림 - 없으면 대문 첫 장면 위에 제목을 얹은 그림 */
  image?: string;
  /** 대표 그림 아래 한 줄 */
  imageLine?: string;
  /** 대문 영상 폴더 (public/gate/<여기>) - 기본 base */
  gateDir?: string;
}

export const GATES: GateEntry[] = [
  {
    slug: "suneung",
    title: "수능 대박운",
    button: { free: "무료 보기", paid: "문 열기" },
    priceKey: "EXAM",
    room: "suneung",
    promoVideo: "/landing/suneung.mp4",
  },
  {
    slug: "newyear2027",
    title: "2027 신년 운세",
    button: { free: "무료 보기", paid: "문 열기" },
    priceKey: "BASIC",
    room: "newyear",
    imageLine: "한 해의 흐름을 미리 읽다",
  },
  {
    slug: "gunghap",
    // 2026-11-09 유샘: 크리스마스 연애운 (주소 /go/gunghap 은 그대로)
    title: "크리스마스 연애운",
    button: { free: "무료 보기", paid: "문 열기" },
    room: "gunghap",
    imageLine: "두 사람의 사주로 보는 끌림과 인연",
  },
  {
    slug: "tarot",
    // 2026-11-09 유샘: 오늘의 타로
    title: "오늘의 타로",
    button: { free: "무료 보기", paid: "문 열기" },
    room: "tarot",
    imageLine: "지금 마음에 걸린 물음 하나",
  },
];

export function gateBySlug(slug: string): GateEntry | undefined {
  return GATES.find((g) => g.slug === slug);
}

export function gateByRoom(room: GateRoomKey): GateEntry | undefined {
  return GATES.find((g) => g.room === room);
}

export const gateDir = (g: GateEntry) => `/gate/${g.gateDir ?? "base"}`;
