import { calculateSaju } from "./index";
import { createAnthropicInterpretationEngine } from "./ai/interpretationEngine";
import type { ProductType } from "./prompts/productTemplates";

/**
 * 전체 파이프라인(사주 계산 → AI 해석)을 수동으로 확인하기 위한 CLI.
 * 실제 Anthropic API를 호출하므로 ANTHROPIC_API_KEY 환경변수가 필요하다.
 *
 * 사용법: ANTHROPIC_API_KEY=sk-... npx ts-node src/interpretCli.ts 1990-05-20 14:30 female FREE_BASIC 2025
 */
async function main() {
  const [, , dateArg, timeArg, genderArg, productArg, yearArg] = process.argv;

  if (!dateArg || !productArg) {
    console.log(
      "사용법: npx ts-node src/interpretCli.ts YYYY-MM-DD HH:mm male|female PRODUCT_TYPE [YEAR]"
    );
    console.log(
      "PRODUCT_TYPE: FREE_BASIC | LOVE_3900 | MONEY_3900 | CAREER_3900 | YEARLY_3900 | PREMIUM_9900"
    );
    process.exit(1);
  }

  const year = yearArg ? Number(yearArg) : new Date().getFullYear();

  const saju = calculateSaju(
    {
      calendarType: "solar",
      date: dateArg,
      time: timeArg || undefined,
      gender: (genderArg as "male" | "female") ?? "female",
    },
    year
  );

  const engine = createAnthropicInterpretationEngine();

  console.log("=========== [Saju JSON] ===========");
  console.log(JSON.stringify(saju, null, 2));

  console.log("\n=========== [AI Interpretation] ===========");
  const result = await engine.interpret(saju, { productType: productArg as ProductType });
  console.log(JSON.stringify(result, null, 2));
}

main().catch((err) => {
  console.error("해석 실패:", err);
  process.exit(1);
});
