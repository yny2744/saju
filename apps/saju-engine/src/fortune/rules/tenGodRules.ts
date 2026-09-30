/**
 * 십신(十神) → 카테고리별 해석 문구 테이블.
 *
 * 지시서 8조: "Rule 조건 → 해석 의미 → 카테고리 → 우선순위 → 문장" 구조.
 * 계산 코드(fortuneRelations.ts)와 해석 문구(이 파일)를 분리해서, 향후 문구
 * 수정 시 계산 로직을 건드리지 않아도 되게 한다.
 *
 * 전통적 십신-영역 대응(재성=재물, 관성=직장/책임, 식상=표현/연애, 인성=안정,
 * 비겁=자기주장/대인관계)을 기반으로 하되, 유파에 따라 세부 해석은 갈릴 수
 * 있다는 점을 명시한다 — DECISION REQUIRED 성격의 영역이므로 문구는 보수적으로
 * 작성했다.
 */
import type { TenGodName } from "../../rules/tenGodTables";
import type { FortuneRule } from "./types";

export const TEN_GOD_RULES: Record<TenGodName, FortuneRule[]> = {
  비견: [
    { ruleId: "tenGod-비견-overall", category: "overall", priority: 5, text: "오늘은 자기 주관이 뚜렷해지는 날이에요. 스스로 결정하고 밀어붙이기 좋은 기운이에요." },
    { ruleId: "tenGod-비견-relationship", category: "relationship", priority: 5, text: "주변 사람과 대등한 입장에서 협력하거나, 반대로 은근한 경쟁심이 생길 수 있어요." },
  ],
  겁재: [
    { ruleId: "tenGod-겁재-overall", category: "overall", priority: 5, text: "추진력은 좋지만 성급해지기 쉬운 날이에요. 속도보다 방향을 한 번 더 확인하세요." },
    { ruleId: "tenGod-겁재-money", category: "money", priority: 6, text: "충동적인 지출이나 무리한 투자는 주의가 필요해요." },
  ],
  식신: [
    { ruleId: "tenGod-식신-overall", category: "overall", priority: 5, text: "여유롭고 편안한 흐름이에요. 몸과 마음을 잘 챙기기 좋은 날이에요." },
    { ruleId: "tenGod-식신-love", category: "love", priority: 5, text: "다정하고 부드러운 표현이 잘 통하는 날이에요." },
  ],
  상관: [
    { ruleId: "tenGod-상관-overall", category: "overall", priority: 5, text: "표현하고 싶은 게 많아지는 날이에요. 재치와 아이디어가 빛을 발할 수 있어요." },
    { ruleId: "tenGod-상관-relationship", category: "relationship", priority: 6, text: "직설적인 말이 오해를 살 수 있으니 표현 방식에 조금 더 신경 쓰세요." },
  ],
  편재: [
    { ruleId: "tenGod-편재-money", category: "money", priority: 6, text: "생각지 못한 곳에서 돈이 들어오거나 나갈 수 있는 유동적인 재물운이에요." },
    { ruleId: "tenGod-편재-overall", category: "overall", priority: 4, text: "활동 범위를 넓히기 좋은 날이에요." },
  ],
  정재: [
    { ruleId: "tenGod-정재-money", category: "money", priority: 7, text: "꾸준히 쌓아온 노력이 안정적인 결실로 돌아올 수 있는 재물운이에요." },
    { ruleId: "tenGod-정재-overall", category: "overall", priority: 4, text: "차분하고 성실하게 하루를 채워가기 좋아요." },
  ],
  편관: [
    { ruleId: "tenGod-편관-work", category: "work", priority: 7, text: "긴장감 있는 업무나 돌발 상황이 생길 수 있어요. 순발력이 필요한 하루예요." },
    { ruleId: "tenGod-편관-overall", category: "overall", priority: 5, text: "부담이나 압박감이 느껴질 수 있지만, 잘 넘기면 성장의 계기가 돼요." },
  ],
  정관: [
    { ruleId: "tenGod-정관-work", category: "work", priority: 7, text: "책임감 있게 맡은 일을 처리하면 주변의 신뢰를 얻기 좋은 날이에요." },
    { ruleId: "tenGod-정관-overall", category: "overall", priority: 4, text: "원칙과 절차를 지키는 게 유리하게 작용해요." },
  ],
  편인: [
    { ruleId: "tenGod-편인-overall", category: "overall", priority: 5, text: "혼자만의 시간이나 새로운 관점이 필요한 날이에요." },
    { ruleId: "tenGod-편인-work", category: "work", priority: 4, text: "익숙하지 않은 방식이나 아이디어가 도움이 될 수 있어요." },
  ],
  정인: [
    { ruleId: "tenGod-정인-overall", category: "overall", priority: 5, text: "배우고 정리하기 좋은, 안정적인 흐름의 날이에요." },
    { ruleId: "tenGod-정인-relationship", category: "relationship", priority: 4, text: "주변의 조언이나 도움이 힘이 되는 하루예요." },
  ],
};
