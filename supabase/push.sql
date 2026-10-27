-- 멍케어 푸시 알람 서버 저장 + 서버 깨우기 (Supabase SQL Editor에 그대로 붙여 넣어 실행, 여러 번 실행해도 됨)
-- 왜: 알람 구독을 서버 메모리에만 두면 배포·서버 잠들기(무료 Render 15분)마다 사라져 알람이 안 울린다.
-- 읽기·쓰기는 서버(server/index.js)만 service_role 키로 한다 — RLS를 켜고 규칙을 두지 않아 앱(anon·로그인 사용자)은 못 본다.

-- 기기 하나 = 한 행. subscription에는 푸시 주소·암호 키, alarms에는 매일 울릴 알람 목록
create table if not exists public.push_devices (
  endpoint text primary key,
  subscription jsonb not null,
  alarms jsonb not null default '[]',
  pets text[], -- 가족으로 확인된 강아지 id(로그인 안 했으면 null)
  time_zone text not null default 'Asia/Seoul',
  sent_date text, -- 오늘 이미 보낸 알람(서버가 다시 켜져도 두 번 보내지 않게)
  sent text[] not null default '{}',
  updated_at timestamptz not null default now()
);

-- 가족 공유 강아지의 알람 목록(가족 중 마지막으로 보낸 기기 기준)
create table if not exists public.push_pet_alarms (
  pet_id text primary key,
  alarms jsonb not null default '[]',
  updated_at timestamptz not null default now()
);

alter table public.push_devices enable row level security;
alter table public.push_pet_alarms enable row level security;
revoke all on public.push_devices, public.push_pet_alarms from anon, authenticated;

-- 1분마다 서버를 불러 알람 시각을 확인하게 한다(요청이 계속 오니 무료 서버도 잠들지 않음)
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;
select cron.unschedule('meongcare-push-tick') where exists (select 1 from cron.job where jobname = 'meongcare-push-tick');
select cron.schedule('meongcare-push-tick', '* * * * *', $$ select net.http_get(url := 'https://dog-care-app.onrender.com/api/push/tick', timeout_milliseconds := 60000) $$);
