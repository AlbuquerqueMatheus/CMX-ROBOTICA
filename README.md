# Campeonato de Robótica CMX

Site para os professores de robótica e a coordenação do Colégio CMX gerenciarem as equipes do campeonato (6A a 9B): integrantes por papel (Líder, Organizador, Programador, Construtor), cor da equipe e, nas próximas etapas, músicas e arquivos.

## Rodar localmente

```bash
npm install
npm run dev
```

Sem configuração, o site abre em **modo demonstração** (dados salvos só no navegador).

## Conectar o banco de dados (Supabase)

1. Crie um projeto gratuito em https://supabase.com.
2. Em **SQL Editor**, cole e rode o conteúdo de `supabase/schema.sql`.
3. Em **Authentication > Sign In / Providers**, desative "Allow new users to sign up".
4. Em **Authentication > Users**, crie os usuários dos professores e do coordenador (e-mail e senha).
5. Copie `.env.example` para `.env.local` e preencha com a URL e a chave `anon` (Project Settings > API).

## Publicar (Vercel)

Importe o repositório em https://vercel.com/new e adicione as variáveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
