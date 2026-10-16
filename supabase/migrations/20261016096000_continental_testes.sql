-- O ledger continua somente inserção para membros REAIS. Só movimentações
-- de contas de identidades sintéticas (dev e testes) podem ser apagadas,
-- para que a limpeza dos testes não deixe lixo no banco de produção.
create or replace function public.ch_coin_imutavel() returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' and exists (
    select 1 from public.gold_coin_accounts a join public.members m on m.id = a.member_id
    where a.id = old.account_id and m.is_synthetic
  ) then
    return old;
  end if;
  raise exception 'gold_coin_transactions é somente inserção';
end $$;
