-- Execute no NOVO projeto Supabase. Exclusivamente comentários EM TEXTO.
-- Se você já executou o SQL da versão com imagens, consulte a migração separada.
create table if not exists public.oitutigas_comments (
  id uuid primary key default gen_random_uuid(),
  question_id text not null check(length(question_id) between 1 and 160 and question_id ~ '^[A-Za-z0-9:_./-]+$'),
  author_name text not null check(length(btrim(author_name)) between 1 and 60),
  body text not null check(length(btrim(body)) between 1 and 2000),
  delete_token_hash text not null check(delete_token_hash ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null default now()
);
create index if not exists oitutigas_comments_question_created_idx
  on public.oitutigas_comments(question_id,created_at desc);
create table if not exists public.oitutigas_rate_limits(
  ip_hash text primary key check(length(ip_hash)=64),
  window_started timestamptz not null default now(),
  post_count integer not null default 1 check(post_count between 1 and 8)
);
alter table public.oitutigas_comments enable row level security;
alter table public.oitutigas_rate_limits enable row level security;
revoke all on public.oitutigas_comments from public,anon,authenticated;
revoke all on public.oitutigas_rate_limits from public,anon,authenticated;
grant select,insert,delete on public.oitutigas_comments to service_role;
grant select,insert,update on public.oitutigas_rate_limits to service_role;
create or replace function public.oitutigas_try_post(p_ip_hash text)
returns boolean language plpgsql security invoker set search_path=public as $$
declare admitted boolean;
begin
  if p_ip_hash !~ '^[a-f0-9]{64}$' then return false; end if;
  insert into public.oitutigas_rate_limits as r(ip_hash,window_started,post_count)
  values(p_ip_hash,now(),1)
  on conflict(ip_hash) do update
    set window_started=case when r.window_started<=now()-interval '1 hour' then now() else r.window_started end,
        post_count=case when r.window_started<=now()-interval '1 hour' then 1 else r.post_count+1 end
    where r.window_started<=now()-interval '1 hour' or r.post_count<8
  returning true into admitted;
  return coalesce(admitted,false);
end;$$;
revoke all on function public.oitutigas_try_post(text) from public,anon,authenticated;
grant execute on function public.oitutigas_try_post(text) to service_role;
-- Não é necessário criar bucket de Storage: imagens foram desativadas.
