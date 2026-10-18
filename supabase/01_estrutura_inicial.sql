-- ===== CIFRA: estrutura inicial do banco (Supabase) =====
-- Cole tudo no Supabase: SQL Editor → New query → Run. Pode rodar uma vez só.

-- perfis: dados do cadastro (nome, idade, endereço). O e-mail e a senha ficam no login do Supabase (auth.users).
create table public.perfis (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text not null default '' check (char_length(nome) <= 80),
  sobrenome text not null default '' check (char_length(sobrenome) <= 120),
  idade int check (idade between 18 and 120),
  endereco jsonb not null default '{}'::jsonb,
  aceitou_termos_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

alter table public.perfis enable row level security;

create policy "perfis: ver o proprio" on public.perfis
  for select to authenticated using ((select auth.uid()) = id);
create policy "perfis: criar o proprio" on public.perfis
  for insert to authenticated with check ((select auth.uid()) = id);
create policy "perfis: editar o proprio" on public.perfis
  for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- Quando alguém cria conta, o perfil nasce com os dados enviados no cadastro
create or replace function public.criar_perfil_do_novo_usuario()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  m jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  idade_lida int;
begin
  begin
    idade_lida := nullif(m ->> 'idade', '')::int;
  exception when others then
    idade_lida := null;
  end;
  if idade_lida is not null and (idade_lida < 18 or idade_lida > 120) then
    idade_lida := null;
  end if;
  insert into public.perfis (id, nome, sobrenome, idade, endereco, aceitou_termos_em)
  values (
    new.id,
    left(coalesce(m ->> 'nome', ''), 80),
    left(coalesce(m ->> 'sobrenome', ''), 120),
    idade_lida,
    case when jsonb_typeof(m -> 'endereco') = 'object' then m -> 'endereco' else '{}'::jsonb end,
    case when m ? 'aceitou_termos_em' then now() else null end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger ao_criar_usuario
  after insert on auth.users
  for each row execute function public.criar_perfil_do_novo_usuario();

-- dados: cada "gaveta" de informação do app (lancamentos, contas, objetivos...) de cada pessoa
create table public.dados (
  usuario uuid not null default auth.uid() references auth.users (id) on delete cascade,
  chave text not null check (chave ~ '^[a-z0-9_-]{1,60}$'),
  valor text not null check (octet_length(valor) <= 5000000),
  atualizado_em timestamptz not null default now(),
  primary key (usuario, chave)
);

alter table public.dados enable row level security;

create policy "dados: ver os proprios" on public.dados
  for select to authenticated using ((select auth.uid()) = usuario);
create policy "dados: criar os proprios" on public.dados
  for insert to authenticated with check ((select auth.uid()) = usuario);
create policy "dados: editar os proprios" on public.dados
  for update to authenticated using ((select auth.uid()) = usuario) with check ((select auth.uid()) = usuario);
create policy "dados: apagar os proprios" on public.dados
  for delete to authenticated using ((select auth.uid()) = usuario);

-- Excluir a própria conta (LGPD). Apaga o usuário; perfil e dados saem junto (on delete cascade).
-- Os arquivos de comprovantes são apagados pelo site antes, pela API do Storage.
create or replace function public.excluir_minha_conta()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  eu uuid := auth.uid();
begin
  if eu is null then
    raise exception 'sem sessao';
  end if;
  delete from auth.users where id = eu;
end;
$$;

revoke execute on function public.excluir_minha_conta() from public, anon;
grant execute on function public.excluir_minha_conta() to authenticated;
revoke execute on function public.criar_perfil_do_novo_usuario() from public, anon, authenticated;

-- Comprovantes: arquivos privados, cada pessoa na sua pasta "<id da pessoa>/..."
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('comprovantes', 'comprovantes', false, 10485760,
        array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'])
on conflict (id) do nothing;

create policy "comprovantes: ver os proprios" on storage.objects
  for select to authenticated
  using (bucket_id = 'comprovantes' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "comprovantes: enviar os proprios" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'comprovantes' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "comprovantes: trocar os proprios" on storage.objects
  for update to authenticated
  using (bucket_id = 'comprovantes' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "comprovantes: apagar os proprios" on storage.objects
  for delete to authenticated
  using (bucket_id = 'comprovantes' and (storage.foldername(name))[1] = (select auth.uid())::text);
