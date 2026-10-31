import { BUSINESS_INFO } from "@/lib/businessInfo";

export const metadata = { title: `오픈소스 고지 | ${BUSINESS_INFO.serviceName}` };

/**
 * 오픈소스 라이선스 고지 (2026-10-31 유샘 승인) - 하단 Footer 링크.
 * 각 라이선스가 요구하는 저작권 표시를 모아 둔다. 원문은 저장소의 해당 LICENSE 파일과
 * 각 패키지(node_modules/<이름>/LICENSE)에 있다.
 * 새 라이브러리·글꼴·자료를 들이면 여기에도 한 줄 더한다.
 */

interface Item {
  name: string;
  use: string;
  license: string;
  copyright: string;
  url: string;
}

const ITEMS: Item[] = [
  {
    name: "lunar-javascript",
    use: "만세력(양력·음력·절기·간지) 계산",
    license: "MIT License",
    copyright: "Copyright (c) 2018 6tail",
    url: "https://github.com/6tail/lunar-javascript",
  },
  {
    name: "MediaPipe Tasks Vision",
    use: "관상 - 브라우저 안에서 얼굴 특징점 찾기",
    license: "Apache License 2.0",
    copyright: "Copyright The MediaPipe Authors (Google LLC)",
    url: "https://github.com/google-ai-edge/mediapipe",
  },
  {
    name: "Noto Serif CJK KR (일부 글자만 담은 글꼴)",
    use: "사주 책자·작명서 PDF 글꼴",
    license: "SIL Open Font License 1.1",
    copyright: "Copyright 2017 Adobe (http://www.adobe.com/), with Reserved Font Name 'Source'",
    url: "https://github.com/notofonts/noto-cjk",
  },
  {
    name: "libhangul 한자 사전",
    use: "작명·이름 풀이의 한자 뜻과 음",
    license: "BSD 3-Clause License",
    copyright: "Copyright (c) 2005, 2006 Choe Hwanjin",
    url: "https://github.com/libhangul/libhangul",
  },
  {
    name: "Unicode 한자 자료 (Unihan)",
    use: "작명·이름 풀이의 한자 획수·자료",
    license: "Unicode License V3",
    copyright: "Copyright © 1991-2026 Unicode, Inc.",
    url: "https://www.unicode.org/license.txt",
  },
  {
    name: "Next.js · React",
    use: "웹 화면",
    license: "MIT License",
    copyright: "Copyright (c) 2024 Vercel, Inc. · Copyright (c) Facebook, Inc. and its affiliates",
    url: "https://github.com/vercel/next.js",
  },
  {
    name: "PDFKit",
    use: "PDF 만들기",
    license: "MIT License",
    copyright: "Copyright (c) 2014 Devon Govett",
    url: "https://github.com/foliojs/pdfkit",
  },
  {
    name: "node-qrcode",
    use: "공유용 QR 코드",
    license: "MIT License",
    copyright: "Copyright (c) 2012 Ryan Day",
    url: "https://github.com/soldair/node-qrcode",
  },
  {
    name: "html-to-image",
    use: "결과 카드 이미지 저장",
    license: "MIT License",
    copyright: "Copyright (c) 2017-2025 W.Y.",
    url: "https://github.com/bubkoo/html-to-image",
  },
  {
    name: "node-postgres (pg) · bcrypt.js",
    use: "회원 정보 저장 · 비밀번호 암호화",
    license: "MIT License · BSD 3-Clause License",
    copyright: "Copyright (c) 2010 - 2021 Brian Carlson · Copyright (c) 2012 Nevins Bartolomeo, Copyright (c) 2012 Shane Girish, Copyright (c) 2025 Daniel Wirtz",
    url: "https://github.com/brianc/node-postgres",
  },
];

export default function LicensesPage() {
  return (
    <>
      <main className="mx-auto min-h-screen max-w-xl px-5 pb-10 pt-12 sm:pt-16">
        <p className="section-label mb-1.5">법적 고지</p>
        <h1 className="mb-3 text-[26px] font-bold leading-snug">오픈소스 고지</h1>
        <p className="mb-6 text-sm leading-relaxed" style={{ color: "var(--color-ink-soft)" }}>
          {BUSINESS_INFO.serviceName}는 아래 오픈소스 소프트웨어와 자료를 사용합니다. 각 저작권자에게 감사드리며, 라이선스가
          요구하는 저작권 표시를 아래에 밝힙니다. 라이선스 원문은 각 프로젝트 주소에서 볼 수 있습니다.
        </p>

        <ul className="space-y-3">
          {ITEMS.map((it) => (
            <li
              key={it.name}
              className="rounded-xl px-4 py-3 text-sm leading-relaxed"
              style={{ border: "1px solid var(--color-line)", backgroundColor: "var(--color-card)", color: "var(--color-ink-soft)" }}
            >
              <p className="text-base font-semibold" style={{ color: "var(--color-ink)" }}>
                {it.name}
              </p>
              <p className="mt-0.5 text-[13px]">{it.use}</p>
              <p className="mt-1.5 text-[13px]">
                <b>{it.license}</b> · {it.copyright}
              </p>
              <a href={it.url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block break-all text-[12px] underline underline-offset-2">
                {it.url}
              </a>
            </li>
          ))}
        </ul>

        <p className="mt-6 text-[12px] leading-relaxed" style={{ color: "var(--color-ink-faint)" }}>
          배경음악은 공유마당(한국저작권위원회) 자유이용 기증 저작물이며, 출처는 화면 아래에 함께 적었습니다.
        </p>
      </main>
    </>
  );
}
