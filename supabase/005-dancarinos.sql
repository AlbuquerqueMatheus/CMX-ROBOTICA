-- Atualização: vários nomes na música (quem vai dançar), no lugar de um único responsável.
-- Rode no Supabase: SQL Editor > New query > colar este arquivo inteiro > Run.
-- (Pode rodar mais de uma vez sem problema. Precisa do 002, 003 e 004 já rodados.)

alter table public.teams add column if not exists music_dancers text[] not null default '{}';

-- Quem já estava como "responsável pela música" vira o primeiro nome da lista.
update public.teams
  set music_dancers = array[music_owner]
  where music_owner <> '' and cardinality(music_dancers) = 0;

create or replace function public.trg_teams_history()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  added text; removed text;
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
  if new.flag_owner is distinct from old.flag_owner then
    perform public.log_history(new.id,
      case
        when new.flag_owner = '' then 'Responsável pela bandeira: removeu "' || old.flag_owner || '"'
        when old.flag_owner = '' then 'Responsável pela bandeira: definiu "' || new.flag_owner || '"'
        else 'Responsável pela bandeira: trocou "' || old.flag_owner || '" por "' || new.flag_owner || '"'
      end);
  end if;
  if new.music_dancers is distinct from old.music_dancers then
    select string_agg('"' || n || '"', ', ') into added
      from unnest(new.music_dancers) n where not (n = any(old.music_dancers));
    select string_agg('"' || n || '"', ', ') into removed
      from unnest(old.music_dancers) n where not (n = any(new.music_dancers));
    if added is not null then
      perform public.log_history(new.id, 'Dançarinos da música: adicionou ' || added);
    end if;
    if removed is not null then
      perform public.log_history(new.id, 'Dançarinos da música: removeu ' || removed);
    end if;
  end if;
  return new;
end $$;

-- Restaurar a equipe também limpa a lista de dançarinos.
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

  return query select r.bucket, r.path from _reset_paths r;
end $$;
revoke all on function public.reset_team(uuid) from public, anon;
grant execute on function public.reset_team(uuid) to authenticated;
