-- 멍케어 이용 통계 (Supabase SQL Editor에 그대로 붙여 넣어 실행, 여러 번 실행해도 됨)
-- 무엇: 날짜별 홈페이지 방문·앱 첫 실행·로그인/비로그인 사용자·AI 사용·유입 경로·재방문을 숫자로만 쌓는다.
-- 개인정보: 이름·이메일·IP를 저장하지 않는다. 기기마다 앱이 만든 무작위 번호를 서버가 한 번 더 해시해 "몇 명"을 셀 때만 쓴다.
-- 쓰기는 서버(server/index.js의 /api/t, AI 요청)만 service_role 키로 한다 — RLS를 켜고 규칙을 두지 않아 앱은 못 읽고 못 쓴다.
-- 보기: Table Editor → 보기(View) analytics_report(날짜별) · analytics_sources(어디서 왔나) · analytics_retention(다시 왔나)

-- 날짜·항목·유입 경로별 횟수 (예: 2026-11-03 / page:intro / threads / 12)
create table if not exists public.analytics_daily (
  day date not null,
  metric text not null,
  source text not null default '',
  count bigint not null default 0,
  primary key (day, metric, source)
);

-- 날짜별 "누가 한 번이라도 했나" — 사람 수를 세는 용도(같은 날 여러 번 와도 1명)
-- kind: web(홈페이지) app(앱) app_login app_anon app_installed(홈 화면 앱) app_dog(강아지 등록함) ai ai_login ai_anon
create table if not exists public.analytics_seen (
  day date not null,
  kind text not null,
  visitor text not null,
  primary key (day, kind, visitor)
);

alter table public.analytics_daily enable row level security;
alter table public.analytics_seen enable row level security;
revoke all on public.analytics_daily, public.analytics_seen from anon, authenticated;

-- 한 번에 횟수 +1, 사람 표시. 서버가 /rest/v1/rpc/analytics_track 으로 부른다
create or replace function public.analytics_track(p_day date, p_metric text, p_source text, p_visitor text, p_kinds text[])
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into analytics_daily (day, metric, source, count) values (p_day, p_metric, coalesce(p_source, ''), 1)
  on conflict (day, metric, source) do update set count = analytics_daily.count + 1;
  if p_visitor is not null and p_kinds is not null then
    insert into analytics_seen (day, kind, visitor) select p_day, k, p_visitor from unnest(p_kinds) k
    on conflict do nothing;
  end if;
end $$;
revoke execute on function public.analytics_track(date, text, text, text, text[]) from public, anon, authenticated;
grant execute on function public.analytics_track(date, text, text, text, text[]) to service_role;

-- ① 날짜별 한눈에 (최근 날짜가 위)
create or replace view public.analytics_report with (security_invoker = true) as
with days as (
  select generate_series(
    least((select min(day) from analytics_daily), (select min(created_at at time zone 'Asia/Seoul')::date from auth.users), (now() at time zone 'Asia/Seoul')::date),
    (now() at time zone 'Asia/Seoul')::date, interval '1 day')::date as day
),
c as (
  select day,
    sum(count) filter (where metric like 'page:%') as page_views,
    sum(count) filter (where metric = 'cta_app') as cta,
    sum(count) filter (where metric = 'guide_download') as downloads,
    sum(count) filter (where metric = 'app_first_open') as first_open,
    sum(count) filter (where metric = 'app_first_open_installed') as first_open_installed,
    sum(count) filter (where metric = 'app_open') as app_open,
    sum(count) filter (where metric like 'ai_chat:%') as ai_chat,
    sum(count) filter (where metric = 'ai_chat:anon') as ai_chat_anon,
    sum(count) filter (where metric like 'ai_other:%') as ai_other,
    sum(count) filter (where metric = 'ai_error') as ai_error
  from analytics_daily group by day
),
u as (
  select day,
    count(*) filter (where kind = 'web') as web_people,
    count(*) filter (where kind = 'app') as app_people,
    count(*) filter (where kind = 'app_login') as login_people,
    count(*) filter (where kind = 'app_anon') as anon_people,
    count(*) filter (where kind = 'app_installed') as installed_people,
    count(*) filter (where kind = 'app_dog') as dog_people,
    count(*) filter (where kind = 'ai') as ai_people,
    count(*) filter (where kind = 'ai_anon') as ai_anon_people
  from analytics_seen group by day
),
s as (
  select (created_at at time zone 'Asia/Seoul')::date as day, count(*) as signups
  from auth.users group by 1
)
select
  d.day as "날짜",
  coalesce(c.page_views, 0) as "홈페이지 방문(회)",
  coalesce(u.web_people, 0) as "홈페이지 방문자(명)",
  coalesce(c.cta, 0) as "앱 버튼 누름(회)",
  coalesce(c.downloads, 0) as "가이드북 받기(회)",
  coalesce(c.first_open, 0) as "앱 처음 연 횟수",
  coalesce(c.first_open_installed, 0) as "그중 홈 화면 앱",
  coalesce(c.app_open, 0) as "앱 실행(회)",
  coalesce(u.app_people, 0) as "앱 사용자(명)",
  coalesce(u.login_people, 0) as "로그인 사용자(명)",
  coalesce(u.anon_people, 0) as "로그인 안 한 사용자(명)",
  coalesce(u.installed_people, 0) as "홈 화면 앱 사용자(명)",
  coalesce(u.dog_people, 0) as "강아지 등록한 사용자(명)",
  coalesce(s.signups, 0) as "새 가입(명)",
  sum(coalesce(s.signups, 0)) over (order by d.day) as "누적 가입(명)",
  coalesce(c.ai_chat, 0) as "AI 채팅(회)",
  coalesce(c.ai_chat_anon, 0) as "그중 로그인 안 함(회)",
  coalesce(u.ai_people, 0) as "AI 쓴 사람(명)",
  coalesce(u.ai_anon_people, 0) as "AI 쓴 비로그인(명)",
  coalesce(c.ai_other, 0) as "AI 사진·음성 등(회)",
  coalesce(c.ai_error, 0) as "AI 오류(회)"
from days d
left join c using (day) left join u using (day) left join s using (day)
order by d.day desc;

-- ② 어디서 왔나 (블로그·스레드·인스타·QR·검색 등)
create or replace view public.analytics_sources with (security_invoker = true) as
select
  day as "날짜",
  case
    when metric like 'page:%' then '홈페이지 방문'
    when metric = 'cta_app' then '앱 버튼 누름'
    when metric = 'app_first_open' then '앱 처음 열기'
    when metric = 'app_first_open_installed' then '홈 화면 앱 처음 열기'
  end as "무엇",
  coalesce(nullif(source, ''), '바로 들어옴') as "어디서",
  sum(count) as "횟수"
from analytics_daily
where metric like 'page:%' or metric in ('cta_app', 'app_first_open', 'app_first_open_installed')
group by 1, 2, 3
order by 1 desc, 2, 4 desc;

-- ③ 다시 왔나 (앱을 처음 쓴 날 기준)
create or replace view public.analytics_retention with (security_invoker = true) as
with f as (select visitor, min(day) as d0 from analytics_seen where kind = 'app' group by visitor)
select
  f.d0 as "처음 쓴 날",
  count(*) as "사용자(명)",
  count(*) filter (where exists (select 1 from analytics_seen s where s.kind = 'app' and s.visitor = f.visitor and s.day = f.d0 + 1)) as "다음 날 다시(명)",
  count(*) filter (where exists (select 1 from analytics_seen s where s.kind = 'app' and s.visitor = f.visitor and s.day between f.d0 + 2 and f.d0 + 7)) as "2~7일 안에 다시(명)",
  count(*) filter (where exists (select 1 from analytics_seen s where s.kind = 'app' and s.visitor = f.visitor and s.day between f.d0 + 8 and f.d0 + 30)) as "8~30일 안에 다시(명)"
from f group by f.d0
order by f.d0 desc;

revoke all on public.analytics_report, public.analytics_sources, public.analytics_retention from anon, authenticated;

-- ④ 운영자 화면(앱 설정 → 이용 통계): 이 표에 들어 있는 계정만 숫자를 볼 수 있다
-- 운영자 추가: insert into public.analytics_admins (user_id) values ('Authentication → Users에서 복사한 내 계정 UID');
create table if not exists public.analytics_admins (user_id uuid primary key references auth.users on delete cascade);
alter table public.analytics_admins enable row level security;
revoke all on public.analytics_admins from anon, authenticated;

create or replace function public.is_analytics_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from analytics_admins where user_id = auth.uid())
$$;

create or replace function public.analytics_dashboard(p_days int default 30) returns json
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_analytics_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  return json_build_object(
    'report', (select coalesce(json_agg(r), '[]') from (select * from analytics_report limit p_days) r),
    'sources', (select coalesce(json_agg(s), '[]') from (select * from analytics_sources where "날짜" > (now() at time zone 'Asia/Seoul')::date - p_days) s),
    'retention', (select coalesce(json_agg(t), '[]') from (select * from analytics_retention limit p_days) t)
  );
end $$;
revoke execute on function public.is_analytics_admin(), public.analytics_dashboard(int) from public, anon;
grant execute on function public.is_analytics_admin(), public.analytics_dashboard(int) to authenticated;
