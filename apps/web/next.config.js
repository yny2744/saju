/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // saju-engine은 별도 워크스페이스 패키지(file: 의존성)라서 Next.js가 기본적으로
  // node_modules 내부 코드로 취급해 최적화를 건너뛴다. dist(JS)만 사용하므로
  // 별도 트랜스파일 설정은 필요 없다 - 이미 컴파일된 CommonJS를 그대로 불러온다.
};

module.exports = nextConfig;
