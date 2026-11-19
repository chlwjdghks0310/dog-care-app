-- 돈·사용량(2026-11-20): 서버가 AI 호출마다 한 행을 적고, 운영자 통계 "돈" 칸이 money_dashboard()로 읽는다.
-- Supabase SQL Editor에서 한 번 실행. analytics.sql(is_analytics_admin)·character.sql이 먼저 있어야 한다.
-- 단가($/MTok)는 서버 PRICES(server/index.js)에 있다 — usd가 null이면 단가를 모르는 모델(화면에 "단가 미확인"으로 보임).

create table if not exists public.ai_usage (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  day date not null,
  feature text not null,          -- ask(비서 빠른 답) ask_detail(자세히) chat(말로 기록) photo stool food food_label vet_doc voice video other
  model text not null,
  visitor text, pet text,         -- 기기 해시 / 강아지 id(비서만). 이름·이메일 없음
  plus boolean not null default false,
  in_tok int not null default 0, out_tok int not null default 0, cache_read int not null default 0, cache_write int not null default 0,
  usd numeric(10,6)
);
create index if not exists ai_usage_day on public.ai_usage (day);
alter table public.ai_usage enable row level security;
revoke all on public.ai_usage from anon, authenticated;

create or replace function public.money_dashboard(p_days int default 30) returns json
language plpgsql stable security definer set search_path = public as $$
declare
  today date := (now() at time zone 'Asia/Seoul')::date;
  p_from date := (now() at time zone 'Asia/Seoul')::date - (p_days - 1);
  m_from date := date_trunc('month', now() at time zone 'Asia/Seoul')::date;
begin
  if not is_analytics_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  return json_build_object(
    -- 날짜별 AI 비용
    'daily', (select coalesce(json_agg(r order by r.day), '[]') from (
      select day, coalesce(sum(usd), 0) usd, count(*) calls from ai_usage where day >= p_from group by day) r),
    -- 기능별: 어디로 빠지나
    'features', (select coalesce(json_agg(r order by r.usd desc nulls last), '[]') from (
      select feature, count(*) calls, count(distinct coalesce(visitor, pet)) people, coalesce(sum(usd), 0) usd,
             count(*) filter (where usd is null) unpriced, count(*) filter (where plus) plus_calls
      from ai_usage where day >= p_from group by feature) r),
    -- 많이 쓰는 기기(해시) 15
    'top', (select coalesce(json_agg(r), '[]') from (
      select coalesce(visitor, pet, '?') who, bool_or(plus) plus, count(*) calls, coalesce(sum(usd), 0) usd, count(distinct day) days,
             count(*) filter (where feature = 'ask_detail') detail_calls
      from ai_usage where day >= p_from group by 1 order by sum(usd) desc nulls last limit 15) r),
    'month', (select json_build_object('usd', coalesce(sum(usd), 0), 'calls', count(*)) from ai_usage where day >= m_from),
    'period', (select json_build_object('usd', coalesce(sum(usd), 0), 'calls', count(*), 'people', count(distinct coalesce(visitor, pet))) from ai_usage where day >= p_from),
    -- 캐릭터(그림·영상)
    'character', json_build_object(
      'period_usd', coalesce((select sum(cost) from character_jobs where status <> 'ledger' and (created_at at time zone 'Asia/Seoul')::date >= p_from), 0),
      'month_usd', coalesce((select sum(cost) from character_jobs where status <> 'ledger' and (created_at at time zone 'Asia/Seoul')::date >= m_from), 0),
      'daily', (select coalesce(json_agg(r order by r.day), '[]') from (
        select (created_at at time zone 'Asia/Seoul')::date day, coalesce(sum(cost), 0) usd, count(*) jobs
        from character_jobs where status <> 'ledger' and (created_at at time zone 'Asia/Seoul')::date >= p_from group by 1) r),
      'jobs', (select count(*) from character_jobs where status <> 'ledger'),
      'done', (select count(*) from character_jobs where status = 'done'),
      'failed', (select count(*) from character_jobs where status = 'failed'),
      'avg_usd', (select coalesce(avg(cost), 0) from character_jobs where status = 'done')),
    -- 플러스·캐릭터 코드 쓴 강아지
    'plus', json_build_object(
      'users', (select count(*) from character_access where code like 'MC-PLUS-%'),
      'character_users', (select count(*) from character_access),
      'codes_left', (select coalesce(sum(max_uses - used), 0) from character_invites where code like 'MC-PLUS-%'),
      'waitlist', (select count(*) from character_waitlist)),
    -- 사람: 들어오고 남고 나가고(기기 기준)
    'people', (with v as (select visitor, min(day) d0, max(day) last, count(*) days from analytics_seen where kind = 'app' group by visitor)
      select json_build_object(
        'total', count(*),
        'new_period', count(*) filter (where d0 >= p_from),
        'active7', count(*) filter (where last >= today - 6),
        'active30', count(*) filter (where last >= today - 29),
        'gone14', count(*) filter (where last < today - 13),
        'gone14_used', count(*) filter (where last < today - 13 and days >= 2),
        'one_day', count(*) filter (where days = 1 and d0 < today - 6),
        'loyal', count(*) filter (where days >= 10)) from v),
    -- 기능별로 기간 안에 쓴 기기 수(act_*는 하루 한 번씩 기록)
    'acts', (select coalesce(json_agg(r order by r.people desc), '[]') from (
      select kind, count(distinct visitor) people, count(*) days from analytics_seen where kind like 'act_%' and day >= p_from group by kind) r),
    'app_people', (select count(distinct visitor) from analytics_seen where kind = 'app' and day >= p_from)
  );
end $$;
revoke execute on function public.money_dashboard(int) from public, anon;
grant execute on function public.money_dashboard(int) to authenticated;
