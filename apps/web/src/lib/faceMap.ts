"use client";

/**
 * 관상도(觀相圖) 그리기 - 브라우저 안에서만 동작한다. AI·서버 전송 없음.
 *
 *  1) 연필 스케치: 사진 픽셀을 흑백 → 반전·흐림 → 닷지(Dodge) 합성 → 종이/먹색 입히기 (이미지 처리 공식)
 *  2) 부위 표시: MediaPipe 얼굴 점(이미 관상 분석에 쓰는 좌표)의 위치에 이름표를 붙인다
 *  3) 삼정: 머리카락 경계(이마 위로 올라가며 어두워지는 지점)·눈썹·코밑·턱끝으로 세 구간을 나눈다
 *
 * 결과는 작은 JPEG data URL 하나뿐이고, 호출부에서 이 탭의 sessionStorage에만 잠깐 보관한다.
 * 얼굴 점 좌표 자체는 이 함수 밖으로 내보내지 않는다.
 * ⚠️ 부위 위치는 얼굴 점 기준의 근사치이며, 머리카락 경계 찾기는 앞머리·모자·어두운 배경에서 실패할 수 있다(그때 상정은 null).
 */

export interface Point {
  x: number;
  y: number;
}

export interface SamJeong {
  upper: number;
  middle: number;
  lower: number;
}

/** 사람 영역 확률(0~1) 마스크 - 원본 사진 크기 기준 */
export interface PersonMask {
  data: Float32Array;
  width: number;
  height: number;
}

export interface FaceMapResult {
  dataUrl: string;
  /** 머리카락 경계를 못 찾으면 null (상정 측정 불가) */
  samjeong: SamJeong | null;
}

/** 부위 이름표: [표시 글자, 얼굴 점 번호] */
const PARTS: Array<[string, number]> = [
  ["天庭 이마", 151],
  ["印堂 미간", 9],
  ["山根 콧대", 168],
  ["準頭 코끝", 4],
  ["人中 인중", 164],
  ["口 입", 14],
  ["地閣 턱", 152],
];

const PAPER = [233, 217, 180];
const INK = [43, 33, 24];
const RED = "#9c3b3b";

/** 가로·세로 상자 흐림 3회 = 가우시안 흐림 근사 (ctx.filter를 지원하지 않는 iOS 대비) */
function blur(src: Float32Array, w: number, h: number, r: number): Float32Array {
  let a = src;
  let b = new Float32Array(src.length);
  for (let pass = 0; pass < 3; pass++) {
    // 가로
    for (let y = 0; y < h; y++) {
      let acc = 0;
      const row = y * w;
      for (let x = -r; x <= r; x++) acc += a[row + Math.min(w - 1, Math.max(0, x))];
      for (let x = 0; x < w; x++) {
        b[row + x] = acc / (2 * r + 1);
        acc += a[row + Math.min(w - 1, x + r + 1)] - a[row + Math.max(0, x - r)];
      }
    }
    // 세로
    const c = new Float32Array(src.length);
    for (let x = 0; x < w; x++) {
      let acc = 0;
      for (let y = -r; y <= r; y++) acc += b[Math.min(h - 1, Math.max(0, y)) * w + x];
      for (let y = 0; y < h; y++) {
        c[y * w + x] = acc / (2 * r + 1);
        acc += b[Math.min(h - 1, y + r + 1) * w + x] - b[Math.max(0, y - r) * w + x];
      }
    }
    a = c;
    b = new Float32Array(src.length);
  }
  return a;
}

export function drawFaceMap(image: HTMLImageElement, landmarks: Point[], personMask: PersonMask | null = null): FaceMapResult | null {
  try {
    const iw = image.naturalWidth;
    const ih = image.naturalHeight;
    const px = (i: number) => ({ x: landmarks[i].x * iw, y: landmarks[i].y * ih });

    // 얼굴 둘레 영역 + 머리·어깨 여유를 잘라낸다
    const xs = landmarks.map((p) => p.x * iw);
    const ys = landmarks.map((p) => p.y * ih);
    const fx0 = Math.min(...xs), fx1 = Math.max(...xs), fy0 = Math.min(...ys), fy1 = Math.max(...ys);
    const fw = fx1 - fx0, fh = fy1 - fy0;
    const cx0 = Math.max(0, fx0 - fw * 0.45);
    const cx1 = Math.min(iw, fx1 + fw * 0.45);
    const cy0 = Math.max(0, fy0 - fh * 0.55);
    const cy1 = Math.min(ih, fy1 + fh * 0.2);

    const W = 520;
    const scale = W / (cx1 - cx0);
    const H = Math.round((cy1 - cy0) * scale);
    const toC = (p: Point) => ({ x: (p.x - cx0) * scale, y: (p.y - cy0) * scale });

    const work = document.createElement("canvas");
    work.width = W;
    work.height = H;
    const wctx = work.getContext("2d");
    if (!wctx) return null;
    wctx.drawImage(image, cx0, cy0, cx1 - cx0, cy1 - cy0, 0, 0, W, H);
    const img = wctx.getImageData(0, 0, W, H);
    const d = img.data;

    // 1) 연필 스케치
    const gray = new Float32Array(W * H);
    for (let i = 0; i < W * H; i++) gray[i] = 0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2];
    const inv = new Float32Array(W * H);
    for (let i = 0; i < W * H; i++) inv[i] = 255 - gray[i];
    const invBlur = blur(inv, W, H, Math.max(3, Math.round(W / 80)));
    // 배경 지우기: 사람 영역 마스크가 있으면 그것을, 없으면 얼굴 둘레 타원(머리 포함)을 쓴다
    const keep = new Float32Array(W * H);
    if (personMask) {
      const mx = personMask.width / iw;
      const my = personMask.height / ih;
      for (let y = 0; y < H; y++) {
        const sy = Math.min(personMask.height - 1, Math.floor((cy0 + y / scale) * my));
        for (let x = 0; x < W; x++) {
          const sx = Math.min(personMask.width - 1, Math.floor((cx0 + x / scale) * mx));
          keep[y * W + x] = personMask.data[sy * personMask.width + sx];
        }
      }
    } else {
      const ecx = ((fx0 + fx1) / 2 - cx0) * scale;
      const ecy = ((fy0 + fy1) / 2 - fh * 0.12 - cy0) * scale;
      const rx = fw * 0.62 * scale;
      const ry = fh * 0.78 * scale;
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          const r = Math.hypot((x - ecx) / rx, (y - ecy) / ry);
          keep[y * W + x] = r < 0.85 ? 1 : r > 1.0 ? 0 : (1.0 - r) / 0.15;
        }
      }
    }
    const keepSoft = blur(keep, W, H, 2);

    for (let i = 0; i < W * H; i++) {
      const dodge = Math.min(255, (gray[i] * 256) / Math.max(1, 255 - invBlur[i]));
      const sketchT = Math.min(1, Math.max(0, ((dodge - 90) * 1.6) / 255));
      const k = Math.min(1, Math.max(0, (keepSoft[i] - 0.15) / 0.7));
      const t = sketchT * k + (1 - k); // 배경(k=0)은 종이색
      d[i * 4] = t * PAPER[0] + (1 - t) * INK[0];
      d[i * 4 + 1] = t * PAPER[1] + (1 - t) * INK[1];
      d[i * 4 + 2] = t * PAPER[2] + (1 - t) * INK[2];
    }
    wctx.putImageData(img, 0, 0);

    // 3) 삼정 - 머리카락 경계 찾기 (이마 위쪽 끝 점 10번에서 위로 올라가며 어두워지는 곳)
    const softGray = blur(gray, W, H, 2);
    const top = toC(px(10));
    const fore = toC(px(151));
    const sample = (x: number, y: number) => {
      let s = 0, n = 0;
      for (let dx = -12; dx <= 12; dx++) {
        const xx = Math.round(x + dx);
        if (xx < 0 || xx >= W || y < 0 || y >= H) continue;
        s += softGray[Math.round(y) * W + xx];
        n++;
      }
      return n ? s / n : 255;
    };
    const skin = sample(fore.x, fore.y);
    let hairY: number | null = null;
    for (let y = Math.round(top.y); y > 2; y--) {
      if (sample(top.x, y) < skin * 0.5) {
        hairY = y;
        break;
      }
    }
    const brow = (toC(px(105)).y + toC(px(334)).y) / 2;
    const noseBottom = toC(px(2)).y;
    const chin = toC(px(152)).y;
    let samjeong: SamJeong | null = null;
    if (hairY !== null && brow - hairY > (chin - noseBottom) * 0.4) {
      const seg = [brow - hairY, noseBottom - brow, chin - noseBottom];
      const total = seg[0] + seg[1] + seg[2];
      const up = Math.round((seg[0] / total) * 100);
      const mid = Math.round((seg[1] / total) * 100);
      samjeong = { upper: up, middle: mid, lower: 100 - up - mid };
    }

    // 2) 최종 캔버스: 양옆 여백에 이름표
    const M = 120;
    const out = document.createElement("canvas");
    out.width = W + M * 2;
    out.height = H;
    const ctx = out.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = `rgb(${PAPER.join(",")})`;
    ctx.fillRect(0, 0, out.width, out.height);
    ctx.drawImage(work, M, 0);

    // 삼정선 (오른쪽 여백에 구간 이름)
    ctx.setLineDash([7, 5]);
    ctx.strokeStyle = RED;
    ctx.lineWidth = 1.5;
    const lines = samjeong && hairY !== null ? [hairY, brow, noseBottom, chin] : [brow, noseBottom, chin];
    for (const y of lines) {
      ctx.beginPath();
      ctx.moveTo(M - 8, y);
      ctx.lineTo(M + W + 8, y);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.fillStyle = RED;
    ctx.font = "bold 17px sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    const bands: Array<[string, number, number]> = [];
    if (samjeong && hairY !== null) bands.push(["상정", hairY, brow]);
    bands.push(["중정", brow, noseBottom], ["하정", noseBottom, chin]);
    for (const [name, a, b] of bands) ctx.fillText(name, M + W + 14, (a + b) / 2);

    // 부위 이름표 (왼쪽 여백, 겹치지 않게 아래로 밀어냄)
    ctx.font = "16px sans-serif";
    ctx.textAlign = "right";
    const used: number[] = [];
    for (const [label, idx] of PARTS) {
      const p = toC(px(idx));
      const pxs = p.x + M;
      let ty = p.y;
      while (used.some((u) => Math.abs(u - ty) < 24)) ty += 24;
      used.push(ty);
      ctx.strokeStyle = "rgba(122,106,85,0.9)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(pxs, p.y);
      ctx.lineTo(M - 4, ty);
      ctx.lineTo(M - 10, ty);
      ctx.stroke();
      ctx.fillStyle = RED;
      ctx.beginPath();
      ctx.arc(pxs, p.y, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgb(${INK.join(",")})`;
      ctx.fillText(label, M - 14, ty);
    }

    return { dataUrl: out.toDataURL("image/jpeg", 0.85), samjeong };
  } catch {
    return null; // 관상도는 부가 기능 - 실패해도 관상 분석은 계속한다
  }
}
