import type { ElementKo } from "@/lib/pillarView";
import type { TenGodGroup } from "@/lib/journey";

/** 운세 하나의 문장 창고 (수정안 33) */
export interface TopicLib {
  /** 일간 오행으로 본 이 운세의 결 (1문장) */
  lens: Record<ElementKo, string>;
  /** 가장 두드러진 십신 묶음 × 이 운세 (2~3문장) */
  strong: Record<TenGodGroup, string>;
  /** 지금 대운 천간의 십신 묶음 × 이 운세 (1~2문장) */
  flow: Record<TenGodGroup, string>;
  /** 부족한 오행 × 이 운세 - "그래서 …" (1~2문장, LACK_CORE 다음에 붙는다) */
  lack: Record<ElementKo, string>;
}
