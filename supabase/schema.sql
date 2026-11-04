-- Site do campeonato de robótica do CMX
-- Rode este arquivo no Supabase: Dashboard > SQL Editor > New query > colar > Run.

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  color text unique
    check (color in ('amarela','vermelha','branca','verde','preta','laranja','rosa','marrom')),
  created_at timestamptz not null default now()
);

create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  role text not null
    check (role in ('lider','organizador','programador','construtor')),
  name text not null default '',
  updated_at timestamptz not null default now(),
  unique (team_id, role)
);

-- Só usuários logados (professores e coordenador) podem ler e alterar.
alter table public.teams enable row level security;
alter table public.members enable row level security;

drop policy if exists "logados leem equipes" on public.teams;
create policy "logados leem equipes" on public.teams
  for select to authenticated using (true);
drop policy if exists "logados alteram equipes" on public.teams;
create policy "logados alteram equipes" on public.teams
  for update to authenticated using (true) with check (true);

drop policy if exists "logados leem integrantes" on public.members;
create policy "logados leem integrantes" on public.members
  for select to authenticated using (true);
drop policy if exists "logados alteram integrantes" on public.members;
create policy "logados alteram integrantes" on public.members
  for all to authenticated using (true) with check (true);

-- As 8 equipes e os 4 papéis de cada uma.
insert into public.teams (name)
values ('6A'),('6B'),('7A'),('7B'),('8A'),('8B'),('9A'),('9B')
on conflict (name) do nothing;

insert into public.members (team_id, role)
select t.id, r.role
from public.teams t
cross join (values ('lider'),('organizador'),('programador'),('construtor')) as r(role)
on conflict (team_id, role) do nothing;

-- ============ Passo 2: músicas ============
create table if not exists public.songs (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  title text not null,
  path text not null unique,
  created_at timestamptz not null default now()
);
alter table public.songs enable row level security;
drop policy if exists "logados gerenciam musicas" on public.songs;
create policy "logados gerenciam musicas" on public.songs
  for all to authenticated using (true) with check (true);

-- Bucket privado para os arquivos de áudio (até 50 MB cada).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('musicas', 'musicas', false, 52428800, array['audio/*'])
on conflict (id) do nothing;

drop policy if exists "logados leem musicas" on storage.objects;
create policy "logados leem musicas" on storage.objects
  for select to authenticated using (bucket_id = 'musicas');
drop policy if exists "logados enviam musicas" on storage.objects;
create policy "logados enviam musicas" on storage.objects
  for insert to authenticated with check (bucket_id = 'musicas');
drop policy if exists "logados apagam musicas" on storage.objects;
create policy "logados apagam musicas" on storage.objects
  for delete to authenticated using (bucket_id = 'musicas');
