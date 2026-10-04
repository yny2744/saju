/** @type {import('tailwindcss').Config} */
module.exports = {
  // ⚠️ 2026-10 수정: 예전엔 src/app만 스캔해서, src/components의 컴포넌트에서만 쓰는 스타일(예: Footer의
  // gap-x-4, 사주 원국 카드의 grid-cols-4)이 실제 CSS에 만들어지지 않았다. 화면에서 글자가 붙거나 레이아웃이
  // 깨지는 원인이었다. 컴포넌트 폴더도 스캔 대상에 넣는다.
  content: ["./src/app/**/*.{ts,tsx}", "./src/components/**/*.{ts,tsx}"],
  theme: {
    extend: {},
  },
  plugins: [],
};
