-- 결제 표 설계(2026-11-20) — 사업자등록·토스페이먼츠 가맹 뒤에 실행한다. 지금은 실행하지 않는다.
-- 지키는 법: 전자상거래법 시행령 제6조(계약·결제 기록 5년, 불만·분쟁 3년), 제13조②(계약 내용 전자문서 교부), 콘텐츠 지침 제19조(결제 전 알림).
-- 개인정보: 이름·카드번호는 두지 않는다(토스가 보관, 우리는 빌링키·끝자리만). 탈퇴해도 거래 기록은 분리 보존(법 제6조②).

create table if not exists public.billing_customers (
  pet_id text primary key,                 -- 강아지 단위(플러스·캐릭터 모두 강아지에 붙는다)
  user_id uuid references auth.users,      -- 로그인했으면 계정(탈퇴 시 null로 끊고 기록은 남김)
  email text,                              -- 결제 알림·영수증 발송용(법 제8조, 지침 19조)
  customer_key text not null unique,       -- 토스 customerKey(무작위)
  billing_key text,                        -- 토스 빌링키(자동결제). 카드번호 아님
  card_last4 text, card_company text,
  created_at timestamptz not null default now()
);

create table if not exists public.billing_orders (
  id text primary key,                     -- 주문번호(토스 orderId)
  pet_id text not null,
  items jsonb not null,                    -- [{id, title, price}] 결제 당시 값 그대로(가격이 바뀌어도 기록 보존)
  total int not null,
  status text not null default 'pending',  -- pending | paid | failed | refunded | partial_refund
  payment_key text,                        -- 토스 paymentKey
  method text,                             -- 카드 | 네이버페이 | 토스페이
  receipt_url text,                        -- 토스 매출전표(법 제8조 결제 사실 통지 보조)
  contract_sent_at timestamptz,            -- 계약 내용 전자문서(이메일) 보낸 시각(법 제13조②)
  created_at timestamptz not null default now(),
  paid_at timestamptz
);
create index if not exists billing_orders_pet on public.billing_orders (pet_id, created_at desc);

create table if not exists public.billing_subscriptions (
  pet_id text primary key,
  plan text not null,                      -- plus_year | plus_month
  price int not null,                      -- 가입 당시 가격(인상 때 별도 동의 전까지 유지, 법 제13조⑥)
  started_at timestamptz not null,
  next_at timestamptz not null,            -- 다음 자동결제일
  notice_sent_at timestamptz,              -- 결제 7일 전 이메일 보낸 시각(콘텐츠 지침 19조)
  status text not null default 'active',   -- active | canceled | expired
  canceled_at timestamptz,
  character_used boolean not null default false, -- 연간 포함 캐릭터를 썼나(중도 해지 공제 4,900)
  price_change_consent jsonb               -- 가격 인상 동의 {from,to,at,effective}(전환 전 30일 내 명시 동의, 시행령 20조의2)
);

create table if not exists public.billing_refunds (
  id bigint generated always as identity primary key,
  order_id text not null references public.billing_orders,
  amount int not null,
  reason text not null,                    -- year_cancel(쓴 달·캐릭터 공제) | not_similar(캐릭터 안 닮음) | error | other
  calc jsonb,                              -- {used, usedAmt, charAmt} 계산 근거
  requested_at timestamptz not null default now(),
  done_at timestamptz                      -- 3영업일 안(콘텐츠 지침 17조)
);

-- 해지·철회 요청 기록(이메일로 온 것도 여기에 적어 "지체 없이 회신"을 남긴다, 콘텐츠 지침 24조)
create table if not exists public.billing_requests (
  id bigint generated always as identity primary key,
  pet_id text, kind text not null,         -- cancel | withdraw | complaint
  via text not null,                       -- app | email
  note text, created_at timestamptz not null default now(), replied_at timestamptz
);

alter table public.billing_customers enable row level security;
alter table public.billing_orders enable row level security;
alter table public.billing_subscriptions enable row level security;
alter table public.billing_refunds enable row level security;
alter table public.billing_requests enable row level security;
revoke all on public.billing_customers, public.billing_orders, public.billing_subscriptions, public.billing_refunds, public.billing_requests from anon, authenticated;
-- 보존: 주문·환불 5년, 요청(불만) 3년 — 지우는 작업은 만들지 않는다(기간 전 삭제 금지). 탈퇴 시 customers.user_id만 null.
