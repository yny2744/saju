/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // saju-engine은 별도 워크스페이스 패키지(file: 의존성)라서 Next.js가 기본적으로
  // node_modules 내부 코드로 취급해 최적화를 건너뛴다. dist(JS)만 사용하므로
  // 별도 트랜스파일 설정은 필요 없다 - 이미 컴파일된 CommonJS를 그대로 불러온다.
  experimental: {
    // 2026-10-12 수정안 38 PDF: pdfkit은 자기 폴더의 글꼴 자료(.afm)를 직접 읽으므로 묶지 않고 그대로 쓴다
    serverComponentsExternalPackages: ["pdfkit"],
    // PDF용 한글 글꼴(assets/fonts)을 서버 함수에 함께 싣는다
    outputFileTracingIncludes: {
      "/api/persons/[id]/pdf": ["./assets/fonts/**"],
    },
  },
};

module.exports = nextConfig;
