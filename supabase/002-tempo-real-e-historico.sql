-- Atualização: histórico de alterações e atualização em tempo real.
-- Rode no Supabase: SQL Editor > New query > colar este arquivo inteiro > Run.
-- (Pode rodar mais de uma vez sem problema.)

-- ============ Histórico ============
create table if not exists public.history (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  user_email text not null,
  team_id uuid references public.teams(id) on delete set null,
  team_name text not null default '',
  action text not null
);
create index if not exists history_created_at_idx on public.history (created_at desc);

alter table public.history enable row level security;
drop policy if exists "logados leem historico" on public.history;
create policy "logados leem historico" on public.history
  for select to authenticated using (true);
-- Ninguém escreve direto no histórico: só os gatilhos abaixo.

create or replace function public.log_history(p_team_id uuid, p_action text)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.history (user_email, team_id, team_name, action)
  values (
    coalesce(auth.jwt() ->> 'email', 'sistema'),
    p_team_id,
    coalesce((select name from public.teams where id = p_team_id), ''),
    p_action
  );
end $$;
revoke all on function public.log_history(uuid, text) from public, anon, authenticated;

create or replace function public.role_label(r text)
returns text language sql immutable as $$
  select case r
    when 'lider' then 'Líder'
    when 'organizador' then 'Organizador'
    when 'programador' then 'Programador'
    when 'construtor' then 'Construtor'
    else r end
$$;

-- Equipes: cor e anotações
create or replace function public.trg_teams_history()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.color is distinct from old.color then
    perform public.log_history(new.id,
      case
        when new.color is null then 'Removeu a cor ' || initcap(old.color)
        when old.color is null then 'Escolheu a cor ' || initcap(new.color)
        else 'Trocou a cor de ' || initcap(old.color) || ' para ' || initcap(new.color)
      end);
  end if;
  if new.notes is distinct from old.notes then
    perform public.log_history(new.id, 'Editou as anotações');
  end if;
  return new;
end $$;
drop trigger if exists teams_history on public.teams;
create trigger teams_history after update on public.teams
  for each row execute function public.trg_teams_history();

-- Integrantes
create or replace function public.trg_members_history()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  old_name text := case when tg_op = 'UPDATE' then coalesce(old.name, '') else '' end;
begin
  if coalesce(new.name, '') = old_name then return new; end if;
  perform public.log_history(new.team_id,
    case
      when new.name = '' then public.role_label(new.role) || ': removeu "' || old_name || '"'
      when old_name = '' then public.role_label(new.role) || ': definiu "' || new.name || '"'
      else public.role_label(new.role) || ': trocou "' || old_name || '" por "' || new.name || '"'
    end);
  return new;
end $$;
drop trigger if exists members_history on public.members;
create trigger members_history after insert or update on public.members
  for each row execute function public.trg_members_history();

-- Músicas
create or replace function public.trg_songs_history()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    perform public.log_history(new.team_id, 'Adicionou a música "' || new.title || '"');
    return new;
  end if;
  perform public.log_history(old.team_id, 'Removeu a música "' || old.title || '"');
  return old;
end $$;
drop trigger if exists songs_history on public.songs;
create trigger songs_history after insert or delete on public.songs
  for each row execute function public.trg_songs_history();

-- Arquivos
create or replace function public.trg_files_history()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    perform public.log_history(new.team_id, 'Enviou o arquivo "' || new.name || '"');
    return new;
  end if;
  perform public.log_history(old.team_id, 'Removeu o arquivo "' || old.name || '"');
  return old;
end $$;
drop trigger if exists files_history on public.files;
create trigger files_history after insert or delete on public.files
  for each row execute function public.trg_files_history();

-- ============ Tempo real ============
-- Avisa o site sempre que algo muda, para as telas se atualizarem sozinhas.
do $$
declare t text;
begin
  foreach t in array array['teams','members','songs','files','history'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
