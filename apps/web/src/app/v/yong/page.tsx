import { redirect } from "next/navigation";

/**
 * 2026-10-08: 예전 시안 미리보기 주소. 예전 가격(3,900/9,900/4,900원)이 그대로 보여서 대문으로 보낸다.
 * 류결의사주(2030 트랙) 화면은 확장 단계에서 새 가격 구조로 다시 만든다 (components/CasualLanding.tsx 는 남겨 둠).
 */
export default function LegacyPreviewPage() {
  redirect("/");
}
