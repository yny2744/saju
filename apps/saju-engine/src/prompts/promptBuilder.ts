import { SYSTEM_PROMPT } from "./systemPrompt";
import { PRODUCT_TEMPLATES, ProductType } from "./productTemplates";
import type { PillarPosition } from "../elements";
import type { SajuJson } from "../types";

export interface BuiltPrompt {
  system: string;
  user: string;
}

const POSITION_LABEL: Record<PillarPosition, string> = {
  year: "연주",
  month: "월주",
  day: "일주",
  hour: "시주",
};

function formatPillarsBlock(saju: SajuJson): string {
  const { pillars } = saju;
  const hourLine = pillars.hour
    ? `시주: ${pillars.hour.ganzhi} (천간 ${pillars.hour.heavenlyStem}, 지지 ${pillars.hour.earthlyBranch})`
    : "시주: 정보 없음 (출생시간 미입력 - 시주/시지 관련 내용은 추측하지 말고 생략하거나 일반론으로 대체할 것)";

  return `## 사주 원국 (4기둥)
연주: ${pillars.year.ganzhi} (천간 ${pillars.year.heavenlyStem}, 지지 ${pillars.year.earthlyBranch})
월주: ${pillars.month.ganzhi} (천간 ${pillars.month.heavenlyStem}, 지지 ${pillars.month.earthlyBranch})
일주: ${pillars.day.ganzhi} (천간 ${pillars.day.heavenlyStem}, 지지 ${pillars.day.earthlyBranch})
${hourLine}
성별: ${saju.birth.gender === "male" ? "남성" : "여성"}`;
}

function formatElementsBlock(saju: SajuJson): string {
  const { summary, hiddenStems } = saju.elements;
  const counts = Object.entries(summary.counts)
    .map(([el, count]) => `${el}=${count}`)
    .join(", ");
  const lacking = summary.lacking.length > 0 ? summary.lacking.join(", ") : "없음";

  const hiddenStemLines = (Object.keys(hiddenStems) as PillarPosition[])
    .map((pos) => {
      const entries = hiddenStems[pos]!;
      const entryText = entries
        .map((h) => `${h.stem}(${h.element}, ${h.type}, 가중치 ${h.weight})`)
        .join(", ");
      return `${POSITION_LABEL[pos]} 지지 지장간: ${entryText}`;
    })
    .join("\n");

  return `## 오행(五行) 분포 - 엔진 계산 완료, 이 값을 그대로 인용해서 서술할 것
오행 점수: ${counts}
우세 오행(dominant): ${summary.dominant}
부족 오행(lacking): ${lacking}

### 지장간(支藏干) - 엔진 계산 완료
${hiddenStemLines || "정보 없음"}`;
}

function formatTenGodsBlock(saju: SajuJson): string {
  const { tenGods } = saju;
  const stemLines = (Object.keys(tenGods.heavenlyStems) as Array<keyof typeof tenGods.heavenlyStems>)
    .map((pos) => `${POSITION_LABEL[pos]} 천간 십신: ${tenGods.heavenlyStems[pos]}`)
    .join("\n");
  const branchLines = (Object.keys(tenGods.earthlyBranches) as PillarPosition[])
    .map((pos) => `${POSITION_LABEL[pos]} 지지 십신(정기 기준): ${tenGods.earthlyBranches[pos]!.primary}`)
    .join("\n");
  const hiddenStemTenGodLines = (Object.keys(tenGods.earthlyBranches) as PillarPosition[])
    .map((pos) => {
      const branch = tenGods.earthlyBranches[pos]!;
      const entryText = branch.hiddenStemTenGods
        .map((h) => `${h.stem}(${h.tenGod}, ${h.type})`)
        .join(", ");
      return `${POSITION_LABEL[pos]} 지지 지장간 십신: ${entryText}`;
    })
    .join("\n");

  return `## 십신(十神) - 엔진 계산 완료, 이 값을 그대로 인용해서 서술할 것
일간(day master): ${tenGods.dayMaster.stem} (오행 ${tenGods.dayMaster.element}, ${tenGods.dayMaster.polarity})
${stemLines}
${branchLines}
${hiddenStemTenGodLines}`;
}

function formatRelationsBlock(saju: SajuJson): string {
  const { relations } = saju;
  const parts: string[] = [];
  if (relations.combination.length > 0) {
    parts.push(
      `합(合): ${relations.combination
        .map((c) => `${c.type}(${c.characters.join("")})${c.resultElement ? ` → 화기(化氣) ${c.resultElement}` : ""}`)
        .join(", ")}`
    );
  }
  if (relations.clash.length > 0) {
    parts.push(`충(沖): ${relations.clash.map((c) => c.branches.join("-")).join(", ")}`);
  }
  if (relations.punishment.length > 0) {
    parts.push(
      `형(刑): ${relations.punishment.map((p) => `${p.type}(${p.branches.join("")})`).join(", ")}`
    );
  }
  if (relations.destruction.length > 0) {
    parts.push(`파(破): ${relations.destruction.map((d) => d.branches.join("-")).join(", ")}`);
  }
  if (relations.harm.length > 0) {
    parts.push(`해(害): ${relations.harm.map((h) => h.branches.join("-")).join(", ")}`);
  }

  return `## 합·충·형·파·해 - 엔진 계산 완료
${parts.length > 0 ? parts.join("\n") : "해당하는 관계 없음"}`;
}

function formatTwelveStagesBlock(saju: SajuJson): string {
  const { twelveStages } = saju;
  const lines = (Object.keys(twelveStages.stages) as PillarPosition[])
    .map((pos) => `${POSITION_LABEL[pos]} 지지: ${twelveStages.stages[pos]}`)
    .join("\n");

  return `## 12운성 - 엔진 계산 완료, 이 값을 그대로 인용해서 서술할 것
${lines}`;
}

/**
 * ⚠️ DECISION REQUIRED / 보류: "현재 대운"을 자동으로 식별해서 보여주는 기능은
 * 이번 3단계 수정에서 의도적으로 제외했다.
 *
 * 이전 버전에는 `saju.birth.date`의 연도와 `saju.seun.year`(조회 연도)를 단순히
 * 빼서 만 나이를 근사하고, 그 근사 나이로 대운 목록 중 하나를 "현재 대운"으로
 * 골라 보여주는 로직이 있었다. 이는:
 *   1) 생일이 지났는지 여부를 따지지 않는 부정확한 근사값이고,
 *   2) "AI Interpretation Layer가 대운을 다시 계산/추정하지 않는다"는 원칙과
 *      정확히 충돌하는 자체 추정 로직이었다.
 *
 * Saju Engine의 DaeunResult에는 "현재 대운이 몇 번째인지"를 알려주는 필드가 없고
 * (대운은 출생연도 기준 시작 나이만 계산되어 있고, "오늘" 또는 조회 시점의 실제
 * 나이와 결합해서 판단하는 필드가 별도로 없다), 그 판단 로직을 다시 만드는 것은
 * "daeun 계산 엔진 자체를 수정하지 않는다"는 지시와도 어긋난다.
 *
 * 따라서 이번 단계에서는 근사값으로 "현재 대운"을 임의로 골라내지 않고,
 * 엔진이 계산한 대운 목록(periods) 전체를 그대로 전달한다. LLM도 이 중 어느 것이
 * "지금" 대운인지 단정해 말하지 않도록 system prompt에서 명시적으로 제한한다.
 */
function formatDaeunBlock(saju: SajuJson): string {
  const { daeun } = saju;
  const warning = daeun.timeUnknownWarning
    ? "\n⚠️ 출생시간 미상으로 대운수는 참고용입니다 - 해석 시 이 점을 반드시 언급할 것."
    : "";

  const periodLines = daeun.periods
    .map((p) => `${p.order}번째 대운: ${p.pillar.ganzhi} (시작 나이 약 ${p.startAgeDisplay}세~)`)
    .join("\n");

  return `## 대운(大運) - 엔진 계산 완료, 이 값을 그대로 인용해서 서술할 것
방향: ${daeun.direction === "forward" ? "순행" : "역행"}
대운수(첫 대운 시작 나이): 약 ${daeun.startAgeDisplay}세
대운 목록 (전체, "현재 대운"은 엔진이 별도로 식별하지 않으므로 특정 시점을 단정하지 말 것):
${periodLines}${warning}`;
}

function formatSeunBlock(saju: SajuJson): string {
  const { seun } = saju;
  return `## 세운(歲運) - 엔진 계산 완료, 이 값을 그대로 인용해서 서술할 것
조회 연도: ${seun.year}년
세운 간지: ${seun.pillar.ganzhi}
일간 대비 세운 십신: ${seun.tenGod}`;
}

/**
 * 엔진이 계산한 Saju JSON 전체(원국 8글자 + 오행 + 십신 + 합충형파해 + 12운성 +
 * 대운 + 세운)를, LLM이 오해 없이 읽을 수 있는 명확한 텍스트 블록으로 변환한다.
 *
 * 개인정보(닉네임, 연락처, 출생지 등)는 절대 포함하지 않는다 - LLM에는 사주 해석에
 * 필요한 최소 정보(생년월일, 성별, 계산된 사주 데이터)만 전달한다.
 */
function formatSajuDataBlock(saju: SajuJson): string {
  return [
    "[사주 계산 데이터 - Saju Engine이 이미 계산 완료, 재계산·수정 금지]",
    formatPillarsBlock(saju),
    formatElementsBlock(saju),
    formatTenGodsBlock(saju),
    formatRelationsBlock(saju),
    formatTwelveStagesBlock(saju),
    formatDaeunBlock(saju),
    formatSeunBlock(saju),
  ].join("\n\n");
}

/**
 * 상품 유형에 맞는 system/user 프롬프트를 조립해서 반환한다.
 * 반환된 { system, user }를 그대로 LLM API의 system / messages[0].content로 사용하면 된다.
 */
export function buildSajuPrompt(saju: SajuJson, productType: ProductType): BuiltPrompt {
  const template = PRODUCT_TEMPLATES[productType];
  if (!template) {
    throw new Error(`알 수 없는 상품 유형: ${productType}`);
  }

  const dataBlock = formatSajuDataBlock(saju);

  const user = `${dataBlock}

# 요청 상품: ${template.displayName}

${template.instruction}

위 [사주 계산 데이터]에 이미 계산되어 있는 오행/십신/관계/12운성/대운/세운 값을
그대로 사용해서 해석하세요. 값을 다시 도출하거나 다른 값으로 바꾸지 말고,
지정된 형식의 JSON으로만 응답하세요.`;

  return { system: SYSTEM_PROMPT, user };
}
