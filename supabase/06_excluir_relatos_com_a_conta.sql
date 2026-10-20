-- ===== CIFRA: ao excluir a conta, os relatos de problema dessa pessoa também são apagados =====
-- Cole no Supabase: SQL Editor → New query → Run (e confirme o aviso de operação destrutiva).
-- Antes, os relatos ficavam guardados sem o vínculo com a conta, mas com o texto e o contato.
-- A Política de Privacidade (seção 06) diz que tudo é apagado junto com a conta.

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
  delete from public.relatos where usuario = eu;
  delete from auth.users where id = eu;
end;
$$;

revoke execute on function public.excluir_minha_conta() from public, anon;
grant execute on function public.excluir_minha_conta() to authenticated;
