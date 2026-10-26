# 베이직과 고객사 설정 (2026-10-23)

## 구조

- **베이직**: 이 저장소의 코드 전체. 사주 엔진과 모든 기능(운세·작명·관상·궁합·결제·관리자 화면 …)이 들어 있고, 브랜드가 없다.
  기능 추가·수정은 언제나 베이직에서만 한다. 한 번 push 하면 모든 고객사 사이트가 같이 업데이트된다.
- **고객사 설정**: `src/tenants/<id>.ts` 파일 하나. 브랜드명·로고 글자·문구·사업자 정보·정식 주소·가격·기능 켜기/끄기만 담는다.
  - 1번 `ryugyeol.ts` 류결사주
  - 2번 `injasaju.ts` 인자사주 (사업자 정보 미정 - 시험판)
- 빌드할 고객사는 Vercel 환경변수 **`NEXT_PUBLIC_TENANT=<id>`** 로 고른다. 없으면 류결사주.
  빌드에는 고른 고객사 파일 **하나만** 들어간다 (다른 고객사 사업자 정보가 화면 코드에 실려 나가지 않음).
  등록되지 않은 id 면 빌드가 멈춘다 (`src/tenants/pick.js`).

코드에서 브랜드·사업자·가격을 쓸 때는 반드시 설정에서 읽는다.

| 필요한 것 | 쓰는 법 |
| --- | --- |
| 서비스 이름 | `import { BRAND } from "@/tenants"` |
| 이름 뒤 조사 | `josa(BRAND, "은/는")` → 류결사주는 / 인자사주는 |
| 로고 글자·슬로건 등 | `TENANT.brand.*` |
| 사업자 정보 | `BUSINESS_INFO` (`@/lib/businessInfo`) |
| 가격 | `PRICE` (`@/lib/yeopjeon`) |
| 기능 켜기·끄기 | `TENANT.features.*` (예: `PREMIUM_ON`) |
| 굿즈 추천 링크 (쿠팡 파트너스) | `TENANT.goods.coupang` - 오행별 링크. 비어 있으면 굿즈 칸이 안 보임 (2026-10-26: 류결사주에만) |

"류결사주" 같은 글자를 코드에 직접 쓰지 않는다 (`tests/tenants.test.ts` 가 설정 값을 확인한다).

## 새 고객사 붙이기

1. **브랜드명·도메인 확정** (도메인은 결제사 신청 전에 - 신청한 주소를 나중에 바꾸면 재심사).
2. `ryugyeol.ts` 를 복사해 `src/tenants/<id>.ts` 로 만들고 모든 값을 고객사 것으로 채운다.
   - `id` 는 파일 이름과 같아야 한다 (영문 소문자·숫자·`-`).
   - 사업자 정보는 사업자등록증·통신판매업신고증 원본 그대로. 추측해서 채우지 않는다.
   - 가격은 결제사 심사 전에 확정하고, 심사 중에는 바꾸지 않는다.
3. 테스트 `npx jest tests/tenants.test.ts` - 빈 값이 있으면 실패한다.
4. 같은 GitHub 저장소로 **Vercel 프로젝트를 새로** 만들고 환경변수를 고객사 것으로 넣는다:

| 환경변수 | 내용 |
| --- | --- |
| `NEXT_PUBLIC_TENANT` | 고객사 id |
| `SITE_URL` | 고객사 정식 주소 (예: https://injasaju.com) |
| `DATABASE_URL` | 고객사 전용 DB (Neon 프로젝트 따로) |
| `NEXT_PUBLIC_LAUNCH_MODE` / `NEXT_PUBLIC_LOGIN_REQUIRED` | 류결사주와 같게 (`live` / `true`) |
| `PORTONE_STORE_ID` · `PORTONE_CHANNEL_KEY` · `PORTONE_API_SECRET` · `PORTONE_WEBHOOK_SECRET` | 고객사 명의 결제 |
| `KAKAO_REST_API_KEY` · `KAKAO_CLIENT_SECRET` | 고객사 카카오 앱 (Redirect URI = 고객사 주소) |
| `GEMINI_API_KEY` | 고객사 명의 AI 키 (사용료가 고객사로 청구) |
| `RESULT_TOKEN_SECRET` · `FACE_RESULT_TOKEN_SECRET` · `PAYMENT_TOKEN_SECRET` | 고객사마다 새로 만든 무작위 값 |
| `ADMIN_USER_IDS` | 고객사 관리자 회원 번호 |
| `ERROR_ALERT_WEBHOOK_URL` | (선택) 오류 알림 |
| `NEXT_PUBLIC_SUNEUNG` | (선택) 수능운 켜기 |

5. Vercel 프로젝트의 Production 브랜치는 `main`. 베이직을 main 에 올리면 모든 고객사가 함께 배포된다.

## 아직 모든 고객사가 같이 쓰는 것 (필요해지면 설정으로 뺄 것)

- 대문 영상·포스터 그림 (`public/landing/`), 배경 음원 (`public/audio/`, Footer 출처 표기)
- 로고 모양(물결 SVG) - 글자만 설정에서 바뀐다
- 색상(감청·금장) - `globals.css`
- 화폐 이름 "엽전"·단위 "냥", 가입 선물·초대 보상 금액 (`src/lib/yeopjeon.ts`)
- 브라우저 저장 이름(`ryugyeol_*` 쿠키·키) - 고객사마다 주소가 달라 서로 섞이지 않으므로 그대로 둔다
