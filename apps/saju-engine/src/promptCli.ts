import { calculateSaju } from "./index";
import { buildSajuPrompt } from "./prompts/promptBuilder";
import type { ProductType } from "./prompts/productTemplates";

// 사용법: npx ts-node src/promptCli.ts 1967-04-03 04:50 male FREE_BASIC
const [, , dateArg, timeArg, genderArg, productArg] = process.argv;

if (!dateArg || !productArg) {
  console.log(
    "사용법: npx ts-node src/promptCli.ts YYYY-MM-DD HH:mm male|female PRODUCT_TYPE"
  );
  console.log(
    "PRODUCT_TYPE: FREE_BASIC | LOVE_3900 | MONEY_3900 | CAREER_3900 | YEARLY_3900 | PREMIUM_9900"
  );
  process.exit(1);
}

const saju = calculateSaju({
  calendarType: "solar",
  date: dateArg,
  time: timeArg,
  gender: (genderArg as "male" | "female") ?? "female",
}, 2024);

const prompt = buildSajuPrompt(saju, productArg as ProductType);

console.log("=========== [SYSTEM PROMPT] ===========\n");
console.log(prompt.system);
console.log("\n=========== [USER PROMPT] ===========\n");
console.log(prompt.user);
