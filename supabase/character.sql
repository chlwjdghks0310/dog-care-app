-- 우리 아이 캐릭터(2026-11-17): 자동 생성 파이프라인은 다 만들어 두고 문은 잠근다.
--   모두에게: "곧 출시" + [출시되면 알려 주세요](character_waitlist)
--   초대 코드가 있는 사람만: 바로 만들기(character_invites → character_access)
-- 읽기·쓰기는 서버(server/character.js)만 service_role 키로 한다. 앱(anon·로그인)은 어떤 표도 직접 못 본다.
-- Supabase SQL Editor에 그대로 붙여 넣어 실행(여러 번 실행해도 됨).

-- 출시 알림 대기: 푸시 주소 하나 = 한 행. 출시 때 서버가 이 주소들로 "열렸어요" 푸시를 보낸다
create table if not exists public.character_waitlist (
  endpoint text primary key,
  pet_id text,
  created_at timestamptz not null default now()
);

-- 초대 코드: 운영자가 SQL로 넣는다. 예) insert into character_invites(code, note, max_uses) values ('MC-YEOREUM-01', '베타 테스터 ○○', 1);
create table if not exists public.character_invites (
  code text primary key,
  note text,
  max_uses int not null default 1,
  used int not null default 0,
  created_at timestamptz not null default now()
);

-- 코드를 쓴 강아지: 앱은 서버가 준 token(무작위)을 폰에만 저장하고, 이후 요청마다 보낸다(로그인 없이도 됨)
create table if not exists public.character_access (
  pet_id text primary key,
  token_hash text not null,
  code text references public.character_invites,
  granted_at timestamptz not null default now()
);

-- 작업 하나 = 강아지 한 마리의 한 번 만들기
--   status: queued(사진 올림) → sheet(후보 만드는 중) → pick(후보 4장, 고르기 대기) → render(초록판·엎드림·영상 만드는 중) → done | failed
create table if not exists public.character_jobs (
  id uuid primary key default gen_random_uuid(),
  pet_id text not null,
  style text not null check (style in ('3d', 'hand')),
  status text not null default 'queued',
  step text,                       -- 사람이 읽는 진행 문구
  photos text[] not null default '{}',     -- storage(character-private) 경로
  candidates text[] not null default '{}', -- storage(character-public) 경로 4개
  picked int,                      -- 1~4
  regen int not null default 0,    -- 후보 다시 뽑은 횟수(2회까지)
  outputs jsonb,                   -- { idle, thinking, poster, sheet } 공개 URL
  error text,
  cost numeric(8,3) not null default 0, -- 달러
  endpoint text,                   -- 끝나면 알릴 푸시 주소
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists character_jobs_status on public.character_jobs (status, created_at);
create index if not exists character_jobs_pet on public.character_jobs (pet_id, created_at desc);

alter table public.character_waitlist enable row level security;
alter table public.character_invites enable row level security;
alter table public.character_access enable row level security;
alter table public.character_jobs enable row level security;
revoke all on public.character_waitlist, public.character_invites, public.character_access, public.character_jobs from anon, authenticated;

-- 저장소: 사진은 비공개(서버만), 결과(후보·영상·정지 그림)는 공개 주소(경로가 uuid라 추측 불가)
insert into storage.buckets (id, name, public) values ('character-private', 'character-private', false) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('character-public', 'character-public', true) on conflict (id) do nothing;

-- 운영자 조회용: 오늘 쓴 돈·상태별 개수(통계 화면에서 beta_inbox처럼 부를 수 있게)
create or replace function public.character_summary() returns json
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_analytics_admin() then raise exception 'not admin'; end if;
  return (select json_build_object(
    'today_cost', coalesce((select sum(cost) from character_jobs where created_at >= date_trunc('day', now() at time zone 'Asia/Seoul') at time zone 'Asia/Seoul'), 0),
    'by_status', (select coalesce(json_object_agg(status, n), '{}'::json) from (select status, count(*) n from character_jobs group by status) s),
    'waitlist', (select count(*) from character_waitlist),
    'invites_left', (select coalesce(sum(max_uses - used), 0) from character_invites)
  ));
end $$;
revoke all on function public.character_summary() from public, anon, authenticated;
grant execute on function public.character_summary() to authenticated;
