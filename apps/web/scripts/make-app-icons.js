/**
 * 앱(PWA) 아이콘 만들기 (2026-11-01) - 고객사마다 public/icons/<id>/ 에 PNG 를 만든다.
 *   명견만리처럼 대문 엠블럼이 있으면 검은 옻칠 바탕 + 금테 + 엠블럼, 없으면 감청 바탕 + 금빛 로고 글자.
 *   2026-11-01 유샘 지시서: 명견만리는 엠블럼 그림 대신 流結 두 글자를 아이콘 높이의 약 70%로 크게 (마스커블은 안전 영역 때문에 약 62%),
 *     장식은 얇은 금빛 원 테두리 하나만. 검은 옻칠 바탕·금빛 유지. 글꼴은 사이트와 같은 Noto Serif KR(구글 폰트, 굵게).
 *   실행: node scripts/make-app-icons.js [고객사id …]  (Playwright 가 설치된 곳에서 - 그림을 다시 만들 때만, id 를 주면 그 고객사만)
 */
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const ROOT = path.join(__dirname, "..");
const TENANTS = [
  { id: "mgml", emblem: "", text: "流結", lacquer: true },
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

/** 명견만리: 옻칠 바탕 + 얇은 금빛 원 + 크게 세운 流結 (maskable 이면 조금 작게) */
function lacquerHtml(t, size, maskable) {
  const ring = size * (maskable ? 0.78 : 0.88);
  const fs1 = size * (maskable ? 0.31 : 0.36);
  const stroke = Math.max(1.5, size / 110);
  return `<html><head><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@900&text=${encodeURIComponent(t.text)}"></head>
  <body style="margin:0;width:${size}px;height:${size}px;background:radial-gradient(circle at 50% 38%,#2e2823 0%,#0b0908 72%);display:flex;align-items:center;justify-content:center">
  <div style="position:relative;width:${ring}px;height:${ring}px;border-radius:50%;box-shadow:inset 0 0 0 ${stroke}px #c9a04a;display:flex;align-items:center;justify-content:center">
    <div style="display:flex;flex-direction:column;align-items:center;font-family:'Noto Serif KR',serif;font-weight:900;font-size:${fs1}px;line-height:1;letter-spacing:0">${[...t.text]
      .map((ch) => `<span style="display:block;background:linear-gradient(170deg,#fff3c9 0%,#e8c46e 38%,#c99a3c 70%,#f2d58c 100%);-webkit-background-clip:text;color:transparent;filter:drop-shadow(0 ${size / 160}px ${size / 120}px rgba(0,0,0,.55))">${ch}</span>`)
      .join("")}</div></div></body></html>`;
}

function html(t, size, pad) {
  if (t.lacquer) return lacquerHtml(t, size, pad >= 0.2);
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
  const only = process.argv.slice(2);
  for (const t of TENANTS.filter((x) => only.length === 0 || only.includes(x.id))) {
    const dir = path.join(ROOT, "public/icons", t.id);
    fs.mkdirSync(dir, { recursive: true });
    for (const s of SIZES) {
      const p = await b.newPage({ viewport: { width: s.size, height: s.size } });
      await p.setContent(html(t, s.size, s.pad), { waitUntil: "networkidle" });
      await p.evaluate(() => document.fonts.ready);
      await p.waitForTimeout(300);
      await p.screenshot({ path: path.join(dir, s.name) });
      await p.close();
    }
    console.log("만듦:", t.id);
  }
  await b.close();
})();
