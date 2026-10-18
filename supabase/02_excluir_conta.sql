-- ===== CIFRA: parte final do banco =====
-- Cole no Supabase: SQL Editor → New query → Run.
-- (O resto da estrutura do arquivo 01 já foi criado pelo Claude; rode SÓ este arquivo.)

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

-- Só quem está logado pode chamar "excluir minha conta" (e só apaga a si mesmo)
revoke execute on function public.excluir_minha_conta() from public, anon;
grant execute on function public.excluir_minha_conta() to authenticated;

-- A função do cadastro só roda pelo gatilho do banco, nunca chamada pelo site
revoke execute on function public.criar_perfil_do_novo_usuario() from public, anon, authenticated;
