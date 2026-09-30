# Saju Engine (Phase 1 + Phase 2 완료)

결정론적 사주팔자 계산 엔진. 명세서 v1.0 기준 **Phase 1(사주 8글자 계산)부터
Phase 2-1~2-6(오행/십신/합충형파해/12운성/대운/세운)까지** 구현 완료했다.

## 구현 범위

### Phase 1 — 사주 원국 계산
연월일시 4기둥(干支) 계산. 절기 기준 월주, 자시 처리, 태양시 보정, 음력/윤달 입력 지원.

### Phase 2-1 — 오행(五行) 계산
단순 개수가 아닌 가중 방식. 천간 1글자 = 1점, 지지 본기 1글자 = 1점, 지장간은
weight/30 만큼 가중 반영. (세부 계산 기준은 `src/elements.ts` 주석 참고,
학파 간 이견이 있는 지점은 `DECISION REQUIRED`로 명시되어 있음)

### Phase 2-2 — 십신(十神) 계산
일간 기준 천간 십신 + 지지(본기 및 지장간) 십신 계산.

### Phase 2-3 — 합·충·형·파·해 계산
육합/삼합/방합, 충, 형(삼형/자형/상형), 파, 해 판정.

### Phase 2-4 — 12운성 계산
일간 기준 각 지지의 12운성(장생~양) 판정. 무토/기토는 화토동법 채택.

### Phase 2-5 — 대운 계산
순행/역행 판정, 대운수(3일=1년 환산) 계산, 대운 목록 생성.

### Phase 2-6 — 세운 계산
지정 연도의 세운 간지 및 원국과의 관계(십신/12운성 등) 계산.

**Phase 2는 이 버전(v12)에서 완료로 확정한다. 아래 "TODO / DECISION REQUIRED" 항목은
계산 로직의 오류가 아니라 학파/서비스 정책상 확정이 필요한 사항이며, 이 사항들 때문에
Phase 2 코드를 임의로 변경하지 않는다.**

## 사용한 오픈소스 및 라이선스 고지

- **lunar-javascript** (`6tail/lunar-javascript`)
  License: MIT
  Copyright (c) 2018 6tail
  실제 `node_modules/lunar-javascript/LICENSE` 파일에서 직접 확인함.
  → 서비스 화면(예: `/privacy` 또는 별도 오픈소스 고지 페이지)에 위 저작권 표시를 그대로 포함할 것.

## 설치

```bash
npm install
```

## 테스트 실행

```bash
npm test
```

8개 테스트 스위트, 125개 테스트 모두 통과 확인됨
(pillars, elements, tenGods, relations, twelveStages, daeun, seun, 통합 테스트 포함).

## 수동 실행 (CLI)

```bash
npx ts-node src/cli.ts 1990-05-20 14:30 female
```

## 빌드

```bash
npm run build
```

TypeScript 컴파일 오류 없이 정상 빌드됨 확인.

## Docker

```bash
docker build -t saju-engine .
docker run --rm saju-engine
```

> 주의: 이 리포지토리를 만든 환경(Claude 샌드박스)에는 Docker가 설치되어 있지 않아
> Dockerfile 자체의 빌드 성공 여부는 검증하지 못했다. 로컬 PC(Docker 설치된 환경)에서
> 반드시 재검증할 것.

## API

```ts
calculateSaju(input: SajuInput, year: number): SajuJson
```

`year`는 세운 조회 연도로, 계산 결과의 재현성과 결정론적 동작을 위해
**호출부가 명시적으로 지정해야 한다.** "올해 자동 계산" 같은 암묵적 기본값 처리는
의도적으로 두지 않았다. 이 시그니처는 Phase 3에서도 그대로 유지한다.

## 아직 구현되지 않은 것 (Phase 3 이후)

- AI 해석 모듈. Phase 3 설계 원칙: **계산은 엔진이 담당하고, AI는 해석만 담당한다.**
  사주 원국·오행·십신·합충형파해·12운성·대운·세운은 모두 이 엔진이 결정론적으로 계산하며,
  AI(LLM)가 이 값을 다시 계산하도록 만들지 않는다.
- `promptBuilder.ts` / `productTemplates.ts` 등 AI 해석 관련 코드는 Phase 2 마감 시점에서는
  구조만 유지하고 대규모로 수정하지 않았다. 본격적인 개선은 Phase 3에서 진행한다.

## TODO / DECISION REQUIRED (실제 서비스 전 반드시 확정할 것)

명리학적으로 유파 간 이견이 있거나 서비스 정책 결정이 필요해서, 코드에서 임의로
확정하지 않고 현재 채택한 규칙을 유지한 채 표시만 해둔 항목들이다. 전체 근거는
각 파일의 `DECISION REQUIRED` 주석 참고.

### ⭐ Phase 3 진입 전 최우선 확정 필요

1. **자시(子時) 처리 방식** (`src/pillars.ts`)
   - `standard`(현재 기본값): 23:00부터 날짜 자체가 다음날로 넘어간다고 보는 방식
   - `yaja_joja_split`: 23:00~23:59는 당일 유지, 00:00 이후만 다음날로 보는 방식
     (lunar-javascript 라이브러리 원래 기본 동작과 동일)
   - 두 방식 모두 실제 명리학계에서 쓰이며 우열이 합의된 것이 아니다.
2. **세운 연도 경계 기준** (`src/seun.ts`)
   - 입춘(절기) 기준으로 연도가 바뀌는지, 달력상 1월 1일 기준으로 바뀌는지 확정 필요.
   - 실제 서비스에서 사용자에게 보여줄 결과가 달라지는 지점이므로, Phase 3 초기에
     명리학 자문을 받아 확정할 것.

### 그 외 정책/규칙 확정 필요 항목

3. **출생지 경도 테이블** (`src/solarTime.ts`) — 현재 주요 도시 15곳만 근사 좌표로
   하드코딩되어 있음. 시/군/구 단위 정밀 좌표 DB 또는 지오코딩 API 도입 검토 필요.
4. **음력 입력 + 자시/태양시 보정 결합 케이스** (`src/pillars.ts`) — 음력 그믐/초하루
   근처에서 자시 보정으로 날짜가 넘어가는 경우 정밀 검증 필요.
5. **calculationMeta에 `dayShifted`(자시 보정으로 날짜가 실제로 넘어갔는지) 노출 여부**
   — 현재 내부적으로만 계산하고 출력 스키마에는 없음.
6. **절기 절입일시 노출** (`calculationMeta.monthPillarSolarTermBoundary`) — 현재 항상 `null`.
7. **오행 가중치 계산 기준** (`src/elements.ts`) — 지장간 가중 방식(weight/30) 채택.
8. **지지 십신 대표값** (`src/tenGods.ts`) — 지지의 십신을 무엇으로 대표할지 유파 차이.
9. **무토/기토 12운성 장생 위치** (`src/rules/twelveStageTables.ts`) — 화토동법 채택.
10. **오미합(午未合) 화기(火氣) 여부** (`src/rules/relationTables.ts`).
11. **형벌 성립 조건 / 파(破) 판정 기준** (`src/rules/relationTables.ts`) — 유파 간 이견 큰 항목.
12. **대운수 환산 규칙(3일=1년) 및 반올림 표시 방식** (`src/daeun.ts`).

이 12개 항목은 Phase 2 코드에서 임의로 결정하지 않았으며, 현재 구현된 규칙을 그대로
유지한 채 서비스 정책 결정 사항으로 남겨둔다.
