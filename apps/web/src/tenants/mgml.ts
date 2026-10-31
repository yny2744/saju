import type { TenantConfig } from "./types";
import ryugyeol from "./ryugyeol";

/**
 * 3번 고객사: 류결의 명견만리 (약칭 mgml) - 2026-10-28 유샘.
 * 류결사주와 같은 사업자(엔와이 · 유남영)가 운영하는 새 대문 판. 사업자 정보·가격·굿즈는 류결사주 설정을 그대로 쓰고,
 * 대문만 "세 길·일곱 운(삼도칠운)" 대문(gate)으로 바꾼다.
 * 배포: GitHub mgml 브랜치 + Vercel 환경변수 NEXT_PUBLIC_TENANT=mgml (saju-mgml.zip / saju-deploy-mgml.ps1).
 *
 * TODO(유샘): 명리심리사 1급 발급 기관·민간자격 등록번호를 받으면 gate.intro.credential 에 넣는다.
 */
const mgml: TenantConfig = {
  ...ryugyeol,
  id: "mgml",
  brand: {
    ...ryugyeol.brand,
    description: "류결의 명견만리 — 천 년의 명리학과 오늘의 AI가 만나는 곳. 나를 알고, 마음을 보고, 만 리 앞을 내다본다.",
  },
  /** 정식 주소가 정해지기 전에는 Vercel 환경변수 SITE_URL 이 먼저 쓰인다 */
  siteUrl: "https://saju-web-git-mgml-yny2744.vercel.app",
  gate: {
    title: "류결의 명견만리",
    sideLeft: "三道",
    sideRight: "七運",
    tarotMotto: "明見萬里",
    emblem: "/gate/mgml/emblem.png",
    media: {
      landscape: "/gate/mgml/hero-pc.mp4",
      portrait: "/gate/mgml/hero-mobile.mp4",
      posterLandscape: "/gate/mgml/poster-pc.jpg",
      posterPortrait: "/gate/mgml/poster-mobile.jpg",
    },
    intro: {
      heading: "천 년의 지혜와 오늘이 만나는 곳",
      tagline: "나를 알고, 마음을 보고, 만 리 앞을 내다본다",
      paragraphs: [
        "사람은 누구나 묻습니다. 나는 어떤 사람인지, 지금 이 마음은 어디로 가는지, 내일을 어떻게 준비해야 하는지.",
        "명리학은 천 년 넘게 그 물음과 함께해 온 학문입니다. 오늘날 사주명리의 체계는 송나라 때 정립되었고, 조선은 관상감에 명과학(命課學)을 두어 나라의 제도로 운영했습니다. 태어난 때에 담긴 기운의 흐름을 읽는 이 원리는 오랜 세월 사람의 삶 곁에서 다듬어져 왔습니다.",
        "류결은 그 원리 위에 현대 AI의 분석 능력을 더했습니다. 전통 명리학이 길을 밝히고, AI는 그 길을 한 사람의 삶에 맞게 세밀하게 풀어냅니다.",
        "류결(流結)은 흐르고 맺는다는 뜻입니다. 천 년의 지혜가 오늘의 기술로 흐르고, 그 흐름이 당신의 삶 위에서 하나의 이해로 맺힙니다.",
      ],
      bridge: "명리심리사 1급 류결은 오랜 준비 끝에 옛 학문과 새 기술 사이에 다리를 놓았습니다.",
      credential: "명리심리사 1급 (민간자격)",
      closing: "운명의 문이 열리는 날, 류결의 명견만리에서 당신의 길을 만나 보세요.",
    },
    ways: [
      {
        key: "know",
        name: "나를 아는 길",
        question: "나는 어떤 사람으로 태어났는가",
        uns: [
          {
            key: "self",
            glyph: "命",
            short: "타고난 나",
            name: "타고난 나의 운",
            rooms: [
              { name: "사주관", desc: "만세력 · 여덟 글자 · 오행 · 대운", href: "/start" },
              { name: "관상관", desc: "얼굴로 보는 타고난 기질", href: "/face" },
              { name: "손금관", desc: "손바닥에 새겨진 삶의 결" },
            ],
            landing: { headline: "나는 어떤 그릇으로 태어났을까", lead: "태어난 때의 여덟 글자와 얼굴에 담긴 기질로, 타고난 나를 차분히 읽어 드립니다." },
          },
          {
            key: "symbol",
            glyph: "星",
            short: "나의 상징",
            name: "나의 상징의 운",
            rooms: [
              { name: "별자리관", desc: "태어난 날의 별자리와 사주의 만남", href: "/fun/zodiac" },
              { name: "탄생화관", desc: "나를 닮은 꽃 한 송이", href: "/fun/flower" },
              { name: "수비학관", desc: "생일 숫자로 보는 인생 수", href: "/fun/numerology" },
              { name: "탄생석관", desc: "태어난 달의 보석과 나를 채우는 돌", href: "/fun/birthstone" },
            ],
            landing: { headline: "나를 닮은 별, 꽃, 숫자", lead: "별자리·탄생화·인생 수로 가볍게 나를 보고, 사주와 겹쳐 한 번 더 깊이 봅니다." },
          },
          {
            key: "nature",
            glyph: "性",
            short: "성향과 적성",
            name: "성향과 적성의 운",
            rooms: [
              { name: "성향관", desc: "나는 어떤 그릇의 사람인가", href: "/go?topic=nature" },
              { name: "적성관", desc: "나에게 맞는 일과 자리", href: "/go?topic=job" },
              { name: "혈액형관", desc: "혈액형으로 보는 나, 사주와 함께", href: "/fun/blood" },
              { name: "MBTI관", desc: "MBTI와 사주로 보는 나" },
            ],
            landing: { headline: "나에게 맞는 일, 나다운 자리", lead: "타고난 성향과 적성을 사주로 읽고, 어떤 일에서 빛나는지 짚어 드립니다." },
          },
        ],
      },
      {
        key: "heart",
        name: "마음을 보는 길",
        question: "지금 내 마음과 관계는 어디에 있는가",
        uns: [
          {
            key: "mind",
            glyph: "心",
            short: "지금 내 마음",
            name: "지금 내 마음의 운",
            rooms: [
              { name: "오늘의 운세관", desc: "내 사주와 오늘 기운의 만남", href: "/start?next=fortune" },
              { name: "띠별 운세관", desc: "생년월일 없이 띠로 보는 오늘·내일", href: "/tti" },
              { name: "타로관", desc: "지금 마음에 걸린 물음 하나", href: "/fun/tarot" },
            ],
            landing: { headline: "요즘 내 마음은 왜 이럴까", lead: "오늘의 기운과 내 사주를 겹쳐, 지금 마음이 머무는 자리를 살펴봅니다." },
          },
          {
            key: "bond",
            glyph: "緣",
            short: "우리 사이",
            name: "우리 사이의 운",
            rooms: [
              { name: "궁합관", desc: "두 사람의 사주로 보는 끌림과 인연", href: "/couple" },
              { name: "연애관", desc: "끌리는 사람, 인연이 오는 때", href: "/go?topic=love" },
              { name: "결혼관", desc: "배우자 자리와 결혼의 흐름", href: "/go?topic=marriage" },
              { name: "인연관", desc: "사람 복과 귀인", href: "/go?topic=relationship" },
            ],
            landing: { headline: "우리, 잘 맞는 사이일까", lead: "두 사람의 사주로 끌림과 어긋남을 함께 읽고, 관계를 이어 가는 길을 찾습니다." },
          },
        ],
      },
      {
        key: "ahead",
        name: "앞을 내다보는 길",
        question: "앞으로 무엇을 준비해야 하는가",
        uns: [
          {
            key: "future",
            glyph: "來",
            short: "앞날",
            name: "앞날의 운",
            rooms: [
              { name: "올해 운세관", desc: "올해 무엇이 들어오고 나가나", href: "/go?topic=year" },
              { name: "재물관", desc: "재물 그릇과 돈이 모이는 때", href: "/go?topic=money" },
              { name: "승진관", desc: "자리와 이름이 오르는 때", href: "/go?topic=promotion" },
              { name: "대운관", desc: "10년마다 바뀌는 큰 흐름", href: "/go?topic=daeun" },
              { name: "수능대박운관", desc: "시험을 앞둔 수험생의 기운", href: "/go?exam=1" },
            ],
            landing: { headline: "앞으로의 흐름, 미리 읽어 두면 다릅니다", lead: "올해와 다가올 큰 흐름 속에서 재물·일·자리의 때를 짚어 드립니다." },
          },
          {
            key: "namedate",
            glyph: "名",
            short: "이름과 날짜",
            name: "이름과 날짜의 운",
            rooms: [
              { name: "작명관", desc: "이름 풀이 · 개명 · 아기 이름", href: "/name" },
              { name: "상호 작명관", desc: "대표자 사주로 짓는 가게·회사 이름", href: "/name/business" },
              { name: "택일관", desc: "이사·결혼·개업에 좋은 날" },
            ],
            landing: { headline: "좋은 이름, 좋은 날", lead: "사주의 남은 작은 빈자리를 채우는 이름을 짓고, 중요한 날을 고르는 길을 안내합니다." },
          },
        ],
      },
    ],
    fruit: {
      glyph: "結",
      title: "채움",
      sub: "남은 작은 빈자리를 채우는 길",
      desc: "풀이에서 드러난 남은 작은 빈자리를 일상의 실천과 곁에 두는 물건으로 채워, 아는 데서 그치지 않고 삶으로 이어지게 합니다.",
    },
    // 2026-10-30 광고별 홀로그램 대문 - 광고 주소 예: /?utm_source=youtube&utm_campaign=suneung01 또는 /?door=suneung
    doors: {
      list: [{ key: "suneung", match: ["suneung", "exam"], title: "수능 대박운 무료 보기", sub: "운명의 문을 여세요", href: "/suneung", needs: "suneung" }],
      // 꼬리표 없이 들어온 분 (문구는 추후 유샘 확정)
      fallback: { key: "today", title: "오늘의 운세 무료 보기", sub: "운명의 문을 여세요", href: "/start?next=fortune" },
    },
    seasonal: [
      {
        key: "newyear",
        glyph: "歲",
        name: "한 해의 운",
        headline: "한 해의 흐름을 미리 읽다",
        lead: "올해의 기운과 열두 달의 흐름, 그리고 10년 큰 흐름까지. 새해를 앞두고 한 번에 살펴보세요.",
        rooms: [
          { name: "올해 운세관", desc: "올해 무엇이 들어오고 나가나", href: "/go?topic=year" },
          { name: "대운관", desc: "10년마다 바뀌는 큰 흐름", href: "/go?topic=daeun" },
          { name: "재물관", desc: "재물 그릇과 돈이 모이는 때", href: "/go?topic=money" },
        ],
      },
    ],
  },
};

export default mgml;
