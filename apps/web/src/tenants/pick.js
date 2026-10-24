/**
 * 빌드할 고객사 설정 파일 고르기 (next.config.js · jest.config.js 에서 함께 쓴다).
 *   Vercel 환경변수 NEXT_PUBLIC_TENANT = 고객사 id (= src/tenants/<id>.ts 파일 이름). 없으면 류결사주.
 *   빌드에는 고른 고객사 파일 하나만 들어간다 - 다른 고객사의 사업자 정보가 화면 코드에 실려 나가지 않게.
 */
const fs = require("fs");
const path = require("path");

const DEFAULT_TENANT_ID = "ryugyeol";

function tenantId(env = process.env) {
  return (env.NEXT_PUBLIC_TENANT || "").trim() || DEFAULT_TENANT_ID;
}

function tenantFile(env = process.env) {
  const id = tenantId(env);
  if (!/^[a-z0-9-]+$/.test(id)) throw new Error(`NEXT_PUBLIC_TENANT 값이 이상해요: "${id}" (영문 소문자·숫자·- 만)`);
  const file = path.join(__dirname, `${id}.ts`);
  // 철자가 틀린 고객사로 조용히 류결사주가 뜨면 남의 사업자 정보가 노출된다 - 빌드를 멈춘다
  if (["index", "types", "pick"].includes(id) || !fs.existsSync(file)) throw new Error(`알 수 없는 고객사 설정: NEXT_PUBLIC_TENANT="${id}" (src/tenants/${id}.ts 가 없어요)`);
  return file;
}

module.exports = { DEFAULT_TENANT_ID, tenantId, tenantFile };
