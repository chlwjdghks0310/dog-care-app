// 상품·가격·정책 한 곳(11/20 사용자 확정). 앱(src)과 서버(server/billing.js)가 같이 읽는다 — 브라우저 의존 없음.
// 바꿀 때는 여기만 바꾸고, 홈페이지·설명서 숫자도 같이 맞춘다(public/intro).
export const PLUS_MONTH = 3900;
export const PLUS_YEAR = 38900; // 월 × 12 = 46,800 대비 17% 절약, 기본 캐릭터(4,900) 포함이면 25%
export const CHAR_BASIC = 4900;
export const CHAR_PREMIUM = 9900;

export const CATALOG = {
  plus_year: { id: "plus_year", kind: "plus", period: "year", title: "플러스 1년", price: PLUS_YEAR, includesCharacter: true, desc: "1년에 한 번 결제 · 기본 캐릭터 1번 포함" },
  plus_month: { id: "plus_month", kind: "plus", period: "month", title: "플러스 한 달", price: PLUS_MONTH, includesCharacter: false, desc: "매달 같은 날 결제 · 언제든 해지" },
  char_basic: { id: "char_basic", kind: "character", title: "기본 캐릭터", price: CHAR_BASIC, desc: "후보 4장 중 1장 · 다시 뽑기 2번 · 움직임 2편(기다리기·고민하기)" },
  char_premium: { id: "char_premium", kind: "character", title: "정성 캐릭터", price: CHAR_PREMIUM, desc: "기본 + 부가 동작 3편(기쁨·밥 기다림·졸림) · 다시 뽑기 4번 · 사람이 보정" },
  // 추가 옵션: 플러스면 할인가. 정성 올리기(기본→정성)는 차액 5,000, 플러스 2,900(11/18) — 11/20 메모의 5,900은 사용자 확인 필요
  char_style: { id: "char_style", kind: "addon", title: "다른 그림체 하나 더", price: 3900, plusPrice: 2900, desc: "추가로 내는 돈" },
  char_upgrade: { id: "char_upgrade", kind: "addon", title: "정성으로 올리기", price: CHAR_PREMIUM - CHAR_BASIC, plusPrice: 2900, desc: "기본을 이미 만든 뒤 부가 동작 3편 추가" },
};

// 스탬프 배지 10개 = 정성 캐릭터 할인권(11/19). 금액은 미결 — 2,000원으로 두고 결제 열 때 확정
export const STAMP_DISCOUNT = 2000;

// 결제 정책(사용자 11/20 01:21 "그대로") — 화면 네 줄과 환불 계산이 전부 이 값을 쓴다
export const POLICY = {
  minAge: 19, // 플러스·캐릭터 결제 모두. 결제 확인 화면에 미성년자 고지 한 줄
  yearCancel: "쓴 달을 월 정가 3,900원으로 빼고, 캐릭터를 이미 만들었으면 4,900원도 빼고 나머지를 돌려드려요. 위약금 없음. 3영업일 안에 결제한 카드로.",
  monthCancel: "해지해도 이번 결제일 전날까지 쓰고, 다음 달부터 결제되지 않아요. 남은 날 환불은 없어요.",
  character: "만든 뒤에는 디지털 콘텐츠라 단순 변심 환불(청약철회)이 안 돼요. 대신 후보 4장을 먼저 보고 고르고, 하나도 안 닮으면 그 자리에서 전액 환불해요.",
  renewNotice: "자동 갱신 결제 7일 전에 이메일로 미리 알려요",
  refundDays: 3, // 영업일
  keepRecordsYears: 5, // 전자상거래법 시행령 제6조: 계약·결제 기록 5년
};

// 플러스 사용자 할인가 적용
export const priceOf = (id, { plus = false } = {}) => { const p = CATALOG[id]; if (!p) return 0; return plus && p.plusPrice != null ? p.plusPrice : p.price; };
