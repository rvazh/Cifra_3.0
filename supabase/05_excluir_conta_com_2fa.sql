-- ===== CIFRA: "Excluir minha conta" também exige o código do 2FA =====
-- Cole no Supabase: SQL Editor → New query → Run (e confirme o aviso de operação destrutiva).
-- Sem isto, quem descobrisse só a senha de uma conta com 2FA conseguiria excluí-la.

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
  if not public.mfa_ok() then
    raise exception 'insufficient_aal: confirme o codigo da verificacao em duas etapas';
  end if;
  delete from auth.users where id = eu;
end;
$$;

revoke execute on function public.excluir_minha_conta() from public, anon;
grant execute on function public.excluir_minha_conta() to authenticated;
