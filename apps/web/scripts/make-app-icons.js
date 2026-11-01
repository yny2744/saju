/**
 * 앱(PWA) 아이콘 만들기 (2026-11-01) - 고객사마다 public/icons/<id>/ 에 PNG 를 만든다.
 *   명견만리처럼 대문 엠블럼이 있으면 검은 옻칠 바탕 + 금테 + 엠블럼, 없으면 감청 바탕 + 금빛 로고 글자.
 *   실행: node scripts/make-app-icons.js  (Playwright 가 설치된 곳에서 - 그림을 다시 만들 때만)
 */
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const ROOT = path.join(__dirname, "..");
const TENANTS = [
  { id: "mgml", emblem: "public/gate/mgml/emblem.png", text: "" },
  { id: "ryugyeol", emblem: "", text: "류결" },
  { id: "injasaju", emblem: "", text: "인자" },
];
// 크기: 192·512 (일반), maskable-512 (안드로이드 둥근 아이콘 - 가운데 80% 안에 그림), apple-180 (아이폰 홈 화면)
const SIZES = [
  { name: "icon-192.png", size: 192, pad: 0.1 },
  { name: "icon-512.png", size: 512, pad: 0.1 },
  { name: "maskable-512.png", size: 512, pad: 0.2 },
  { name: "apple-180.png", size: 180, pad: 0.12 },
];

function html(t, size, pad) {
  const inner = size * (1 - pad * 2);
  const emblem = t.emblem ? `data:image/png;base64,${fs.readFileSync(path.join(ROOT, t.emblem)).toString("base64")}` : "";
  const bg = t.emblem ? "radial-gradient(circle at 50% 40%,#2b2622 0%,#0b0908 75%)" : "radial-gradient(circle at 50% 40%,#24406e 0%,#16294a 60%,#0e1c36 100%)";
  const body = emblem
    ? `<img src="${emblem}" style="width:${inner * 0.78}px;height:${inner * 0.78}px;object-fit:contain"/>`
    : `<div style="display:flex;flex-direction:column;align-items:center;font-family:'Noto Serif CJK KR',serif;font-weight:700;font-size:${inner * 0.3}px;line-height:1.08">${[...t.text]
        .map((ch) => `<span style="background:linear-gradient(100deg,#f7e7b4,#d9b25a 35%,#fff1c4 55%,#b8862e);-webkit-background-clip:text;color:transparent">${ch}</span>`)
        .join("")}</div>`;
  return `<html><body style="margin:0;width:${size}px;height:${size}px;background:${bg};display:flex;align-items:center;justify-content:center">
  <div style="width:${inner}px;height:${inner}px;border-radius:50%;box-shadow:inset 0 0 0 ${Math.max(2, size / 90)}px #c9a04a,inset 0 0 0 ${Math.max(4, size / 45)}px rgba(11,9,8,.0);display:flex;align-items:center;justify-content:center">${body}</div></body></html>`;
}

(async () => {
  const b = await chromium.launch();
  for (const t of TENANTS) {
    const dir = path.join(ROOT, "public/icons", t.id);
    fs.mkdirSync(dir, { recursive: true });
    for (const s of SIZES) {
      const p = await b.newPage({ viewport: { width: s.size, height: s.size } });
      await p.setContent(html(t, s.size, s.pad));
      await p.waitForTimeout(200);
      await p.screenshot({ path: path.join(dir, s.name) });
      await p.close();
    }
    console.log("만듦:", t.id);
  }
  await b.close();
})();
