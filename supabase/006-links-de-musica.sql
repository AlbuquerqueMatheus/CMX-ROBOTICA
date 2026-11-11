-- Atualização: músicas por link (ex.: músicas geradas por IA que não dá para baixar).
-- Rode no Supabase: SQL Editor > New query > colar este arquivo inteiro > Run.
-- (Pode rodar mais de uma vez sem problema. Precisa do 002, 004 e 005 já rodados.)

alter table public.songs add column if not exists link text;
alter table public.songs alter column path drop not null;
alter table public.songs drop constraint if exists songs_arquivo_ou_link;
alter table public.songs add constraint songs_arquivo_ou_link check (path is not null or link is not null);

create or replace function public.trg_songs_history()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    perform public.log_history(new.team_id,
      case when new.path is null then 'Adicionou o link da música "' || new.title || '"'
           else 'Adicionou a música "' || new.title || '"' end);
    return new;
  end if;
  perform public.log_history(old.team_id,
    case when old.path is null then 'Removeu o link da música "' || old.title || '"'
         else 'Removeu a música "' || old.title || '"' end);
  return old;
end $$;

-- Restaurar a equipe: músicas por link não têm arquivo para apagar.
create or replace function public.reset_team(p_team_id uuid)
returns table (bucket text, path text)
language plpgsql security definer set search_path = public as $$
declare
  n_songs int; n_files int;
begin
  if auth.uid() is null then raise exception 'É preciso estar logado.'; end if;
  if not exists (select 1 from public.teams where id = p_team_id) then raise exception 'Equipe não encontrada.'; end if;

  create temp table if not exists _reset_paths (bucket text, path text) on commit drop;
  delete from _reset_paths;

  perform set_config('app.restaurando', '1', true);

  with d as (delete from public.songs s where s.team_id = p_team_id returning s.path)
  insert into _reset_paths select 'musicas', d.path from d;
  get diagnostics n_songs = row_count;

  with d as (delete from public.files f where f.team_id = p_team_id returning f.path)
  insert into _reset_paths select 'arquivos', d.path from d;
  get diagnostics n_files = row_count;

  update public.members set name = '', updated_at = now() where team_id = p_team_id;
  update public.teams
    set color = null, notes = '', flag_owner = '', music_owner = '', music_dancers = '{}'
    where id = p_team_id;

  perform set_config('app.restaurando', '', true);
  perform public.log_history(p_team_id,
    'Restaurou a equipe ao zero (' || n_songs || ' música(s) e ' || n_files || ' arquivo(s) apagados)');

  return query select r.bucket, r.path from _reset_paths r where r.path is not null;
end $$;
revoke all on function public.reset_team(uuid) from public, anon;
grant execute on function public.reset_team(uuid) to authenticated;
