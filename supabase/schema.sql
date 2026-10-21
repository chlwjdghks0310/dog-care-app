-- 멍케어 기록 서버 저장 + 가족 공유 (Supabase SQL Editor에 그대로 붙여 넣어 실행)
-- 공유 단위는 강아지 한 마리(pets). 그 강아지의 구성원(pet_members)만 기록(pet_items)을 읽고 쓴다 — DB 규칙(RLS)이 직접 막는다.
-- 앱 코드: src/services/sync/engine.js(맞추기), src/services/sync/items.js(항목 쪼개기)

-- 강아지(공유 단위). id는 앱에서 만든 강아지 id("dog-<시각>-<난수>") 그대로
create table if not exists public.pets (
  id text primary key,
  created_by uuid not null default auth.uid() references auth.users on delete cascade,
  created_at timestamptz not null default now()
);

-- 구성원: owner(보호자: 초대·내보내기·삭제) / family(가족: 보기·쓰기)
create table if not exists public.pet_members (
  pet_id text not null references public.pets on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  role text not null check (role in ('owner', 'family')),
  display_name text,
  joined_at timestamptz not null default now(),
  primary key (pet_id, user_id)
);

-- 기록 항목: (강아지, 저장 키, 항목) 하나가 한 행. 지운 항목은 deleted=true로 남겨 다른 폰에도 지워지게 한다.
create table if not exists public.pet_items (
  pet_id text not null references public.pets on delete cascade,
  key text not null,
  item text not null,
  shape text not null default 'single',
  value jsonb,
  deleted boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid() references auth.users on delete set null,
  primary key (pet_id, key, item)
);
create index if not exists pet_items_pet_updated on public.pet_items (pet_id, updated_at);

-- 시각·작성자는 서버가 찍는다(폰 시계가 틀려도 순서가 맞게, 남의 이름으로 못 쓰게)
create or replace function public.stamp_item() returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end $$;
drop trigger if exists pet_items_stamp on public.pet_items;
create trigger pet_items_stamp before insert or update on public.pet_items for each row execute function public.stamp_item();

-- 권한 확인 함수(RLS 안에서 같은 표를 다시 읽을 때 무한 반복을 피하려고 security definer)
create or replace function public.is_member(p text) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from pet_members where pet_id = p and user_id = auth.uid())
$$;
create or replace function public.is_owner(p text) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from pet_members where pet_id = p and user_id = auth.uid() and role = 'owner')
$$;

-- 가족 목록에 보일 이름: 카카오 닉네임 등 로그인 정보의 이름만(이메일 주소는 가족에게 보이지 않게 쓰지 않는다)
create or replace function public.member_name(uid uuid) returns text language sql stable security definer set search_path = public, auth as $$
  select coalesce(u.raw_user_meta_data->>'name', u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'nickname', u.raw_user_meta_data->>'preferred_username')
  from auth.users u where u.id = uid
$$;
revoke all on function public.member_name(uuid) from public, anon, authenticated;

-- 강아지를 만들면 만든 사람이 보호자로 들어간다
create or replace function public.add_owner() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into pet_members (pet_id, user_id, role, display_name) values (new.id, new.created_by, 'owner', member_name(new.created_by)) on conflict do nothing;
  return new;
end $$;
drop trigger if exists pets_add_owner on public.pets;
create trigger pets_add_owner after insert on public.pets for each row execute function public.add_owner();

alter table public.pets enable row level security;
alter table public.pet_members enable row level security;
alter table public.pet_items enable row level security;

drop policy if exists pets_select on public.pets;
-- 만든 사람도 보이게: 등록(upsert = insert ... on conflict)할 때 새 행이 읽기 규칙도 통과해야 하는데, 보호자 등록 트리거는 그 뒤에 돈다
create policy pets_select on public.pets for select using (created_by = auth.uid() or public.is_member(id));
drop policy if exists pets_insert on public.pets;
create policy pets_insert on public.pets for insert with check (created_by = auth.uid());
drop policy if exists pets_delete on public.pets;
create policy pets_delete on public.pets for delete using (public.is_owner(id));

drop policy if exists members_select on public.pet_members;
create policy members_select on public.pet_members for select using (public.is_member(pet_id));
-- 나가기(본인) 또는 내보내기(보호자). 들어오기는 아래 accept_invite로만
drop policy if exists members_delete on public.pet_members;
create policy members_delete on public.pet_members for delete using (user_id = auth.uid() or public.is_owner(pet_id));

drop policy if exists items_select on public.pet_items;
create policy items_select on public.pet_items for select using (public.is_member(pet_id));
drop policy if exists items_insert on public.pet_items;
create policy items_insert on public.pet_items for insert with check (public.is_member(pet_id));
drop policy if exists items_update on public.pet_items;
create policy items_update on public.pet_items for update using (public.is_member(pet_id)) with check (public.is_member(pet_id));


-- ── 가족 초대(초대 코드) ──
-- 예전 1회용 초대 표(pet_invites)는 앱에서 쓴 적이 없다 → 코드 원문 대신 해시만 저장하는 표로 바꾼다. 다시 실행해도 안전.
drop function if exists public.accept_invite(text, text);
drop table if exists public.pet_invites;

create table if not exists public.pet_invite_codes (
  id uuid primary key default gen_random_uuid(),
  code_hash text not null unique,           -- sha256(코드). 원문은 만든 사람 화면에만 보인다
  pet_id text not null references public.pets on delete cascade,
  created_by uuid not null default auth.uid() references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '24 hours',
  max_uses int not null default 5,
  use_count int not null default 0,
  revoked_at timestamptz                    -- 새 코드를 만들면 이전 코드는 여기 시각이 찍혀 못 쓴다
);
create index if not exists pet_invite_codes_pet on public.pet_invite_codes (pet_id);
-- 코드 입력 시도 기록(무차별 대입 막기: 15분에 틀린 시도 10번까지)
create table if not exists public.pet_invite_attempts (
  user_id uuid not null references auth.users on delete cascade,
  at timestamptz not null default now(),
  ok boolean not null
);
create index if not exists pet_invite_attempts_user on public.pet_invite_attempts (user_id, at);
-- 두 표 모두 RLS를 켜고 정책을 두지 않는다 → 앱에서 직접 읽고 쓸 수 없고, 아래 함수로만 다룬다
alter table public.pet_invite_codes enable row level security;
alter table public.pet_invite_attempts enable row level security;

create or replace function public.invite_hash(code text) returns text language sql immutable as $$
  select encode(sha256(convert_to(upper(regexp_replace(coalesce(code, ''), '[^A-Za-z0-9]', '', 'g')), 'UTF8')), 'hex')
$$;

-- 초대 코드 만들기(보호자만): 헷갈리는 글자(0/O, 1/I) 뺀 32글자 중 8자리, 24시간·5명까지. 이전 코드는 바로 무효
create or replace function public.create_invite(p text) returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  b bytea := uuid_send(gen_random_uuid()) || uuid_send(gen_random_uuid()); -- 무작위 바이트(버전 표시가 없는 위치만 쓴다)
  pos constant int[] := array[0, 1, 2, 3, 4, 5, 16, 17];
  c text := '';
  i int;
  exp timestamptz;
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  if not is_owner(p) then raise exception 'only owner can invite'; end if;
  foreach i in array pos loop c := c || substr(alphabet, get_byte(b, i) % 32 + 1, 1); end loop;
  update pet_invite_codes set revoked_at = now() where pet_id = p and revoked_at is null;
  insert into pet_invite_codes (code_hash, pet_id) values (invite_hash(c), p) returning expires_at into exp;
  return jsonb_build_object('code', c, 'expires_at', exp);
end $$;

-- 초대 코드 받기: 확인·횟수 차감·가족 등록을 한 번에(동시에 눌러도 잠금으로 순서대로). 실패해도 아무것도 바뀌지 않는다.
-- 실패 이유는 예외 대신 값으로 돌려준다 — 예외면 시도 기록까지 되돌려져 횟수 제한이 안 걸리기 때문
create or replace function public.accept_invite(invite_code text) returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  inv pet_invite_codes;
  fails int;
begin
  if uid is null then raise exception 'login required'; end if;
  select count(*) into fails from pet_invite_attempts where user_id = uid and not ok and at > now() - interval '15 minutes';
  if fails >= 10 then return jsonb_build_object('ok', false, 'reason', 'too_many'); end if;
  select * into inv from pet_invite_codes where code_hash = invite_hash(invite_code) for update;
  if inv.id is null or inv.revoked_at is not null or inv.expires_at < now() then
    insert into pet_invite_attempts (user_id, ok) values (uid, false);
    return jsonb_build_object('ok', false, 'reason', case when inv.id is null then 'invalid' when inv.revoked_at is not null then 'revoked' else 'expired' end);
  end if;
  if exists (select 1 from pet_members where pet_id = inv.pet_id and user_id = uid) then
    return jsonb_build_object('ok', true, 'pet_id', inv.pet_id, 'already', true); -- 이미 가족이면 횟수를 쓰지 않는다
  end if;
  if inv.use_count >= inv.max_uses then
    insert into pet_invite_attempts (user_id, ok) values (uid, false);
    return jsonb_build_object('ok', false, 'reason', 'used_up');
  end if;
  insert into pet_members (pet_id, user_id, role, display_name) values (inv.pet_id, uid, 'family', member_name(uid));
  update pet_invite_codes set use_count = use_count + 1 where id = inv.id;
  insert into pet_invite_attempts (user_id, ok) values (uid, true);
  return jsonb_build_object('ok', true, 'pet_id', inv.pet_id);
end $$;

-- 가족 목록(구성원만): 이름·역할·들어온 날만. 이메일 등 계정 정보는 주지 않는다
create or replace function public.pet_member_list(p text) returns table (user_id uuid, role text, display_name text, joined_at timestamptz, is_me boolean)
language sql stable security definer set search_path = public as $$
  select m.user_id, m.role, m.display_name, m.joined_at, m.user_id = auth.uid() from pet_members m
  where m.pet_id = p and is_member(p) order by m.role desc, m.joined_at
$$;

-- 마지막 보호자는 빠질 수 없다(기록이 주인 없이 남지 않게). 강아지 자체를 지울 때(cascade)는 허용
create or replace function public.keep_owner() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.role = 'owner' and exists (select 1 from pets where id = old.pet_id)
     and not exists (select 1 from pet_members where pet_id = old.pet_id and role = 'owner' and user_id <> old.user_id) then
    raise exception 'last owner cannot leave';
  end if;
  return old;
end $$;
drop trigger if exists pet_members_keep_owner on public.pet_members;
create trigger pet_members_keep_owner before delete on public.pet_members for each row execute function public.keep_owner();

revoke all on function public.create_invite(text), public.accept_invite(text), public.pet_member_list(text) from public, anon;
grant execute on function public.create_invite(text), public.accept_invite(text), public.pet_member_list(text) to authenticated;

-- 실시간: 가족이 기록을 바꾸면 다른 폰이 바로 받아 가도록(RLS가 그대로 적용돼 내 강아지 변경만 온다)
do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'pet_items') then
    alter publication supabase_realtime add table public.pet_items;
  end if;
end $$;
