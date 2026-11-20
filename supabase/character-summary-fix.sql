-- 2026-11-20: character_summary의 '오늘 생성비'를 장부 행(오늘 실제로 쓴 돈)으로. Supabase SQL Editor에서 이 파일만 Run.
create or replace function public.character_summary() returns json
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_analytics_admin() then raise exception 'not admin'; end if;
  return (select json_build_object(
    'today_cost', coalesce((select cost from character_jobs where status = 'ledger' and pet_id = '__ledger__' and created_at >= date_trunc('day', now() at time zone 'Asia/Seoul') at time zone 'Asia/Seoul' order by created_at desc limit 1), 0), -- 11/20: 오늘 실제로 쓴 돈(장부 행)
    'by_status', (select coalesce(json_object_agg(status, n), '{}'::json) from (select status, count(*) n from character_jobs group by status) s),
    'waitlist', (select count(*) from character_waitlist),
    'invites_left', (select coalesce(sum(max_uses - used), 0) from character_invites)
  ));
end $$;
revoke all on function public.character_summary() from public, anon, authenticated;
grant execute on function public.character_summary() to authenticated;
