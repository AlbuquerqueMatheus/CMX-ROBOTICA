-- Atualização: botão "Restaurar equipe ao zero".
-- Rode no Supabase: SQL Editor > New query > colar este arquivo inteiro > Run.
-- (Pode rodar mais de uma vez sem problema. Precisa do 002 e do 003 já rodados.)

-- Durante a restauração, os gatilhos não registram cada item apagado:
-- fica um único registro no histórico.
create or replace function public.log_history(p_team_id uuid, p_action text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if coalesce(current_setting('app.restaurando', true), '') = '1' then return; end if;
  insert into public.history (user_email, team_id, team_name, action)
  values (
    coalesce(auth.jwt() ->> 'email', 'sistema'),
    p_team_id,
    coalesce((select name from public.teams where id = p_team_id), ''),
    p_action
  );
end $$;
revoke all on function public.log_history(uuid, text) from public, anon, authenticated;

-- Zera a equipe: cor, responsáveis, anotações, integrantes, músicas e arquivos.
-- Devolve os arquivos que o site precisa apagar do armazenamento.
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
    set color = null, notes = '', flag_owner = '', music_owner = ''
    where id = p_team_id;

  perform set_config('app.restaurando', '', true);
  perform public.log_history(p_team_id,
    'Restaurou a equipe ao zero (' || n_songs || ' música(s) e ' || n_files || ' arquivo(s) apagados)');

  return query select r.bucket, r.path from _reset_paths r;
end $$;
revoke all on function public.reset_team(uuid) from public, anon;
grant execute on function public.reset_team(uuid) to authenticated;
