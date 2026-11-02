import SuneungLanding from "@/app/suneung/page";
import { SuneungGate } from "@/components/suneung/SuneungGate";

export { generateMetadata } from "@/app/suneung/page";
export const revalidate = 3600;

/**
 * 수능 대박운 링크 대문 (2026-11-02 유샘 지시서) - /go/suneung
 *   수능 전용 화면(/suneung)을 그대로 그리고, 그 위를 영상 대문(SuneungGate)이 덮는다.
 *   단추를 눌러 문이 열리면 대문만 걷혀서, 같은 화면에서 맨 위 수능 영상이 소리와 함께 이어진다.
 */
export default function SuneungGatePage() {
  return (
    <>
      <SuneungGate />
      <SuneungLanding />
    </>
  );
}
