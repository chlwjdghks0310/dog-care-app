-- 베타 준비(2026-11-10): 앱 안 [의견 보내기]와 오류 자동 보고가 쌓이는 표. 서버(service key)만 넣고, 운영자(analytics_admins)만 beta_inbox()로 본다.
-- Supabase SQL Editor에서 한 번 실행. analytics.sql(is_analytics_admin)이 먼저 있어야 한다.

create table if not exists public.beta_feedback (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  kind text not null,          -- bug | wish | good
  text text not null,
  shot text,                   -- 스크린샷 data URL(긴 변 1000px JPEG) — 선택
  ver text, path text, ua text, visitor text
);
create table if not exists public.app_errors (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  ver text, path text, msg text not null, stack text, ua text, visitor text
);
alter table public.beta_feedback enable row level security;
alter table public.app_errors enable row level security;
revoke all on public.beta_feedback from anon, authenticated;
revoke all on public.app_errors from anon, authenticated;

-- 운영자용: 최근 p_days일의 의견 전체 + 오류는 메시지별로 묶어서(횟수·마지막 시각·버전)
create or replace function public.beta_inbox(p_days int default 30) returns json
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_analytics_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  return json_build_object(
    'feedback', (select coalesce(json_agg(f order by f.created_at desc), '[]'::json) from (
      select id, created_at, kind, text, shot, ver, path, ua from beta_feedback where created_at > now() - make_interval(days => p_days)) f),
    'errors', (select coalesce(json_agg(e order by e.last desc), '[]'::json) from (
      select msg, count(*) as n, max(created_at) as last, max(ver) as ver, max(path) as path, max(stack) as stack, count(distinct visitor) as people
      from app_errors where created_at > now() - make_interval(days => p_days) group by msg) e)
  );
end $$;
revoke all on function public.beta_inbox(int) from public, anon;
grant execute on function public.beta_inbox(int) to authenticated;
