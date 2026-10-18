-- ===== CIFRA: relatos de problema e sugestões (botão "Relatar problema" do app) =====
-- Já aplicado no projeto pelo Claude. Fica aqui para registro.
-- Para ler os relatos: Supabase → Table Editor → relatos (marque "resolvido" quando tratar).

create table public.relatos (
  id bigint generated always as identity primary key,
  usuario uuid default auth.uid() references auth.users (id) on delete set null,
  tipo text not null check (tipo in ('problema', 'sugestao', 'outro')),
  mensagem text not null check (char_length(mensagem) between 5 and 4000),
  tela text check (char_length(tela) <= 200),
  aparelho text check (char_length(aparelho) <= 500),
  versao text check (char_length(versao) <= 40),
  contato text check (char_length(contato) <= 200),
  resolvido boolean not null default false,
  criado_em timestamptz not null default now()
);

alter table public.relatos enable row level security;

-- Quem está logado só pode ENVIAR relatos em seu próprio nome (não lê os de ninguém)
create policy "relatos: enviar o proprio" on public.relatos
  for insert to authenticated
  with check ((select auth.uid()) = usuario and resolvido = false);

create index relatos_criado_em on public.relatos (criado_em desc);
