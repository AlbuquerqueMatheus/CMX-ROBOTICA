-- Atualização: responsável pela bandeira e responsável pela música de cada equipe.
-- Rode no Supabase: SQL Editor > New query > colar este arquivo inteiro > Run.
-- (Pode rodar mais de uma vez sem problema. Precisa do 002 já rodado.)

alter table public.teams add column if not exists flag_owner text not null default '';
alter table public.teams add column if not exists music_owner text not null default '';

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
  if new.flag_owner is distinct from old.flag_owner then
    perform public.log_history(new.id,
      case
        when new.flag_owner = '' then 'Responsável pela bandeira: removeu "' || old.flag_owner || '"'
        when old.flag_owner = '' then 'Responsável pela bandeira: definiu "' || new.flag_owner || '"'
        else 'Responsável pela bandeira: trocou "' || old.flag_owner || '" por "' || new.flag_owner || '"'
      end);
  end if;
  if new.music_owner is distinct from old.music_owner then
    perform public.log_history(new.id,
      case
        when new.music_owner = '' then 'Responsável pela música: removeu "' || old.music_owner || '"'
        when old.music_owner = '' then 'Responsável pela música: definiu "' || new.music_owner || '"'
        else 'Responsável pela música: trocou "' || old.music_owner || '" por "' || new.music_owner || '"'
      end);
  end if;
  return new;
end $$;
