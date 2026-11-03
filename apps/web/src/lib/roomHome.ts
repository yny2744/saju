import { TENANT } from "@/tenants";
import { GATES } from "@/lib/gates";

/**
 * 관의 "메인 위치" (2026-11-03 유샘 지시서: 뒤로가기) - 관의 첫 단계에서 뒤로 가면 메인 첫 화면 맨 위가 아니라,
 * 메인에서 그 관이 들어 있는 길·운이 펼쳐진 자리로 간다. 대문 설정(TENANT.gate.ways)의 관 주소로 찾는다.
 * 돌려주는 주소: "/#un-<운>" (GateWays 가 이 꼬리를 보고 길·운을 펼친다). 못 찾으면 "/".
 */

/** 링크 대문(/go/<slug>)이 들어가는 관 화면 주소 */
const GATE_ROOM_PATH: Record<string, string> = { suneung: "/suneung", newyear: "/start?topic=year", gunghap: "/couple", tarot: "/fun/tarot" };

function matches(roomHref: string, path: string, q: URLSearchParams): boolean {
  const [p, query] = roomHref.split("?");
  if (p !== path) return false;
  if (!query) return [...q.keys()].filter((k) => !k.startsWith("utm_")).length === 0 || path !== "/start";
  const want = new URLSearchParams(query);
  return [...want.entries()].every(([k, v]) => q.get(k) === v);
}

export function roomHome(pathname: string, search: string): string {
  const gate = TENANT.gate;
  if (!gate) return "/";
  let path = pathname;
  let q = new URLSearchParams(search);
  const go = /^\/go\/([a-z0-9-]+)$/.exec(pathname);
  if (go) {
    const entry = GATES.find((g) => g.slug === go[1]);
    const target = entry ? GATE_ROOM_PATH[entry.room] : undefined;
    if (!target) return "/";
    const [p, s] = target.split("?");
    path = p;
    q = new URLSearchParams(s ?? "");
  }
  for (const way of gate.ways)
    for (const un of way.uns)
      for (const r of un.rooms) if (r.href && matches(r.href, path, q)) return `/#un-${un.key}`;
  return "/";
}

export function sameOriginReferrer(): boolean {
  try {
    return document.referrer !== "" && new URL(document.referrer).origin === location.origin;
  } catch {
    return false;
  }
}
