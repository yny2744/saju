import type { TenantConfig } from "./types";
// "@tenant-active" = 이번 빌드의 고객사 설정 파일 하나 (next.config.js 가 NEXT_PUBLIC_TENANT 로 골라 연결 - src/tenants/pick.js)
import active from "@tenant-active";

export type { TenantConfig } from "./types";

/** 지금 빌드의 고객사 설정 - 화면·서버 어디서나 이것만 읽는다 */
export const TENANT: TenantConfig = active;

/** 서비스 이름 (예: "류결사주") */
export const BRAND = TENANT.brand.name;

/**
 * 받침에 맞는 조사 붙이기 - 브랜드명이 고객사마다 달라서 "류결사주는 / 인자당은" 처럼 바뀐다.
 * pair: "은/는" | "이/가" | "을/를" | "과/와" (앞 = 받침 있을 때)
 */
export function josa(word: string, pair: "은/는" | "이/가" | "을/를" | "과/와"): string {
  const [withBatchim, without] = pair.split("/");
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  const has = code >= 0 && code <= 11171 && code % 28 !== 0;
  return `${word}${has ? withBatchim : without}`;
}
