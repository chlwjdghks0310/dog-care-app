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

-- 가족 초대 코드(링크에 담아 카카오톡으로 보냄). 7일 동안 1번 쓸 수 있음
create table if not exists public.pet_invites (
  code text primary key,
  pet_id text not null references public.pets on delete cascade,
  created_by uuid not null default auth.uid() references auth.users on delete cascade,
  expires_at timestamptz not null default now() + interval '7 days',
  used_by uuid references auth.users on delete set null,
  used_at timestamptz
);

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

-- 강아지를 만들면 만든 사람이 보호자로 들어간다
create or replace function public.add_owner() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into pet_members (pet_id, user_id, role) values (new.id, new.created_by, 'owner') on conflict do nothing;
  return new;
end $$;
drop trigger if exists pets_add_owner on public.pets;
create trigger pets_add_owner after insert on public.pets for each row execute function public.add_owner();

alter table public.pets enable row level security;
alter table public.pet_members enable row level security;
alter table public.pet_items enable row level security;
alter table public.pet_invites enable row level security;

drop policy if exists pets_select on public.pets;
create policy pets_select on public.pets for select using (public.is_member(id));
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

drop policy if exists invites_select on public.pet_invites;
create policy invites_select on public.pet_invites for select using (public.is_owner(pet_id));
drop policy if exists invites_insert on public.pet_invites;
create policy invites_insert on public.pet_invites for insert with check (public.is_owner(pet_id) and created_by = auth.uid());

-- 초대 받기: 코드가 맞고 안 쓰였고 기한 안이면 가족으로 넣고 강아지 id를 돌려준다
create or replace function public.accept_invite(invite_code text, name text default null) returns text
language plpgsql security definer set search_path = public as $$
declare inv pet_invites;
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  select * into inv from pet_invites where code = invite_code for update;
  if not found then raise exception 'invalid invite'; end if;
  if inv.used_by is not null and inv.used_by <> auth.uid() then raise exception 'invite already used'; end if;
  if inv.expires_at < now() then raise exception 'invite expired'; end if;
  insert into pet_members (pet_id, user_id, role, display_name) values (inv.pet_id, auth.uid(), 'family', name) on conflict (pet_id, user_id) do nothing;
  update pet_invites set used_by = auth.uid(), used_at = now() where code = invite_code;
  return inv.pet_id;
end $$;
revoke all on function public.accept_invite(text, text) from public, anon;
grant execute on function public.accept_invite(text, text) to authenticated;
