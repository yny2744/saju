"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("./index");
// 사용법: npm run dev -- 1990-05-20 14:30 female
const [, , dateArg, timeArg, genderArg] = process.argv;
if (!dateArg) {
    console.log("사용법: npm run dev -- YYYY-MM-DD [HH:mm] [male|female]");
    process.exit(1);
}
const result = (0, index_1.calculateSaju)({
    calendarType: "solar",
    date: dateArg,
    time: timeArg,
    gender: genderArg ?? "female",
}, 2024);
console.log(JSON.stringify(result, null, 2));
