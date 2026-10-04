import { notFound } from "next/navigation";
import { CasualLanding } from "@/components/CasualLanding";
import { isLive } from "@/lib/launchMode";

/** 항상 "류결의사주" 화면을 보여주는 미리보기 경로. 접수용(review) 모드에서는 존재하지 않는 주소(404)로 처리한다. */
export default function CasualLandingPreview() {
  if (!isLive()) notFound();
  return <CasualLanding />;
}
