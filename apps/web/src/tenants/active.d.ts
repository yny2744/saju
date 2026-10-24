/**
 * "@tenant-active" = 이번 빌드의 고객사 설정 파일. 실제 연결은 next.config.js(webpack)와 jest.config.js 가 한다
 * (tsconfig paths 로 걸면 Next가 그쪽을 먼저 따라가 고객사가 류결사주로 고정되므로 타입만 여기서 선언).
 */
declare module "@tenant-active" {
  const tenant: import("./types").TenantConfig;
  export default tenant;
}
