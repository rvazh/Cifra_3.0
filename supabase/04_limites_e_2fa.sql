-- ===== CIFRA: limites por pessoa e verificação em duas etapas (2FA) =====
-- Já aplicado no projeto pelo Claude. Fica aqui para registro.

-- ---------- Limites (contra abuso e para não estourar o plano grátis) ----------

-- dados: no máximo 60 "gavetas" e 20 MB no total por pessoa
create or replace function public.limite_dados()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  qtd int;
  total bigint;
begin
  select count(*), coalesce(sum(octet_length(d.valor)), 0) into qtd, total
    from public.dados d where d.usuario = new.usuario and d.chave <> new.chave;
  if qtd >= 60 then
    raise exception 'limite_dados: a conta chegou ao limite de itens guardados' using errcode = 'P0001';
  end if;
  if total + octet_length(new.valor) > 20000000 then
    raise exception 'limite_dados: a conta chegou ao limite de 20 MB de dados' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
create trigger limite_dados before insert or update on public.dados
  for each row execute function public.limite_dados();

-- relatos: no máximo 10 por pessoa a cada 24 horas
create or replace function public.limite_relatos()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.relatos r
       where r.usuario = new.usuario and r.criado_em > now() - interval '1 day') >= 10 then
    raise exception 'limite_relatos: muitos relatos em 24 horas' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
create trigger limite_relatos before insert on public.relatos
  for each row execute function public.limite_relatos();

-- comprovantes: no máximo 300 arquivos e 100 MB por pessoa
create or replace function public.comprovantes_cabem(dono uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select count(*) < 300 and coalesce(sum((o.metadata ->> 'size')::bigint), 0) < 100000000
    from storage.objects o
   where o.bucket_id = 'comprovantes' and (storage.foldername(o.name))[1] = dono::text;
$$;
alter policy "comprovantes: enviar os proprios" on storage.objects
  with check (
    bucket_id = 'comprovantes'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and public.comprovantes_cabem((select auth.uid()))
  );

-- ---------- Verificação em duas etapas ----------
-- Quem ativou o 2FA só acessa os dados com uma sessão que passou pelo código (aal2).
create or replace function public.mfa_ok()
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((auth.jwt() ->> 'aal') = 'aal2', false)
      or not exists (select 1 from auth.mfa_factors f where f.user_id = auth.uid() and f.status = 'verified');
$$;

create policy "2fa: exigir codigo em dados" on public.dados
  as restrictive to authenticated using (public.mfa_ok()) with check (public.mfa_ok());
create policy "2fa: exigir codigo em perfis" on public.perfis
  as restrictive to authenticated using (public.mfa_ok()) with check (public.mfa_ok());
create policy "2fa: exigir codigo em relatos" on public.relatos
  as restrictive for insert to authenticated with check (public.mfa_ok());
create policy "2fa: exigir codigo em comprovantes" on storage.objects
  as restrictive to authenticated
  using (bucket_id <> 'comprovantes' or public.mfa_ok())
  with check (bucket_id <> 'comprovantes' or public.mfa_ok());

-- ---------- Permissões das funções ----------
revoke execute on function public.limite_dados() from public, anon, authenticated;
revoke execute on function public.limite_relatos() from public, anon, authenticated;
revoke execute on function public.comprovantes_cabem(uuid) from public, anon;
revoke execute on function public.mfa_ok() from public, anon;
grant execute on function public.comprovantes_cabem(uuid) to authenticated;
grant execute on function public.mfa_ok() to authenticated;

-- ---------- Ajuste (aplicado depois): limite de comprovantes sem parâmetro ----------
-- A função com "dono" deixava alguém logado consultar o limite da pasta de outra pessoa.
-- Esta versão só olha a pasta de quem está logado.
create or replace function public.meus_comprovantes_cabem()
returns boolean language sql stable security definer set search_path = '' as $$
  select count(*) < 300 and coalesce(sum((o.metadata ->> 'size')::bigint), 0) < 100000000
    from storage.objects o
   where o.bucket_id = 'comprovantes' and (storage.foldername(o.name))[1] = (auth.uid())::text;
$$;
revoke execute on function public.meus_comprovantes_cabem() from public, anon;
grant execute on function public.meus_comprovantes_cabem() to authenticated;
alter policy "comprovantes: enviar os proprios" on storage.objects
  with check (
    bucket_id = 'comprovantes'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and public.meus_comprovantes_cabem()
  );
revoke execute on function public.comprovantes_cabem(uuid) from authenticated;
