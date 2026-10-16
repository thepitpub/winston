-- =====================================================================
-- Revisão 2 (agente revisor, Continental Command).
-- =====================================================================

-- Check-in: exige credencial ATIVA (cartão suspenso não entra) e respeita
-- a janela do evento (abre 3 h antes do início; fecha no fim, se houver).
create or replace function public.ch_validar_checkin(
  p_member uuid, p_event uuid, p_operator uuid, p_source text,
  p_query text default null, p_exception_reason text default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_member public.members%rowtype;
  v_event  public.checkin_events%rowtype;
  v_day    date := (now() at time zone 'America/Sao_Paulo')::date;
  v_dup    uuid;
  v_ck     uuid;
  v_result text;
begin
  select * into v_event from public.checkin_events where id = p_event;
  if not found or v_event.status <> 'open' then
    insert into public.checkin_validation_logs (operator_user_id, event_id, member_id, query, source, result)
    values (p_operator, case when found then p_event end, p_member, p_query, p_source, 'event_closed');
    return jsonb_build_object('result', 'event_closed');
  end if;
  if now() < v_event.starts_at - interval '3 hours' or (v_event.ends_at is not null and now() > v_event.ends_at) then
    insert into public.checkin_validation_logs (operator_user_id, event_id, member_id, query, source, result, reason)
    values (p_operator, p_event, p_member, p_query, p_source, 'event_closed', 'fora do horário do evento');
    return jsonb_build_object('result', 'event_closed', 'motivo', 'fora do horário do evento');
  end if;

  select * into v_member from public.members where id = p_member;
  if not found then
    insert into public.checkin_validation_logs (operator_user_id, event_id, query, source, result)
    values (p_operator, p_event, p_query, p_source, 'not_found');
    return jsonb_build_object('result', 'not_found');
  end if;

  if v_member.status <> 'active' then
    insert into public.checkin_validation_logs (operator_user_id, event_id, member_id, query, source, result, reason)
    values (p_operator, p_event, p_member, p_query, p_source, 'suspended', 'status: ' || v_member.status);
    return jsonb_build_object('result', 'suspended', 'status', v_member.status, 'motivo', 'status: ' || v_member.status);
  end if;

  if not exists (select 1 from public.member_credentials where member_id = p_member and status = 'active') then
    insert into public.checkin_validation_logs (operator_user_id, event_id, member_id, query, source, result, reason)
    values (p_operator, p_event, p_member, p_query, p_source, 'suspended', 'credencial suspensa ou inexistente');
    return jsonb_build_object('result', 'suspended', 'status', v_member.status, 'motivo', 'credencial suspensa ou inexistente');
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_member::text || p_event::text, 0));

  select id into v_dup from public.member_checkins
  where member_id = p_member and event_id = p_event
    and (v_event.duplicate_policy = 'once_per_event'
         or (v_event.duplicate_policy = 'once_per_day' and local_day = v_day))
  order by validated_at desc limit 1;

  if v_dup is not null and coalesce(btrim(p_exception_reason), '') = '' then
    insert into public.checkin_validation_logs (operator_user_id, event_id, member_id, query, source, result, checkin_id)
    values (p_operator, p_event, p_member, p_query, p_source, 'already_validated', v_dup);
    return jsonb_build_object('result', 'already_validated', 'checkin_id', v_dup);
  end if;

  insert into public.member_checkins (member_id, event_id, local_day, operator_user_id, source, exception_reason)
  values (p_member, p_event, v_day, p_operator, p_source, case when v_dup is not null then nullif(btrim(coalesce(p_exception_reason, '')), '') end)
  returning id into v_ck;

  v_result := case when v_dup is not null then 'exception_granted' else 'validated' end;
  insert into public.checkin_validation_logs (operator_user_id, event_id, member_id, query, source, result, reason, checkin_id)
  values (p_operator, p_event, p_member, p_query, p_source, v_result, case when v_dup is not null then p_exception_reason end, v_ck);
  return jsonb_build_object('result', v_result, 'checkin_id', v_ck);
end $$;
revoke all on function public.ch_validar_checkin(uuid, uuid, uuid, text, text, text) from public, anon, authenticated;

-- Ledger: chave repetida com outro conteúdo é conflito, não "duplicado";
-- só recebe lançamento quem está convidado (bônus do onboarding), ativo ou suspenso.
create or replace function public.ch_coin_lancar(
  p_member uuid, p_amount integer, p_kind text, p_reason text,
  p_idempotency_key text, p_operator uuid default null, p_rule uuid default null,
  p_reference text default null, p_reverses uuid default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_acc   public.gold_coin_accounts%rowtype;
  v_saldo integer;
  v_tx    public.gold_coin_transactions%rowtype;
  v_orig  public.gold_coin_transactions%rowtype;
begin
  select t.* into v_tx from public.gold_coin_transactions t where t.idempotency_key = p_idempotency_key;
  if found then
    if v_tx.amount <> p_amount or v_tx.kind <> p_kind
       or not exists (select 1 from public.gold_coin_accounts a where a.id = v_tx.account_id and a.member_id = p_member) then
      return jsonb_build_object('ok', false, 'error', 'idempotency_conflict');
    end if;
    return jsonb_build_object('ok', true, 'duplicate', true, 'transaction_id', v_tx.id);
  end if;

  if not exists (select 1 from public.members where id = p_member and status in ('invited', 'active', 'suspended')) then
    return jsonb_build_object('ok', false, 'error', 'member_not_eligible');
  end if;

  insert into public.gold_coin_accounts (member_id) values (p_member) on conflict (member_id) do nothing;
  select * into v_acc from public.gold_coin_accounts where member_id = p_member for update;
  if v_acc.status <> 'open' then return jsonb_build_object('ok', false, 'error', 'account_frozen'); end if;

  if p_reverses is not null then
    select * into v_orig from public.gold_coin_transactions where id = p_reverses;
    if not found or v_orig.account_id <> v_acc.id or v_orig.kind = 'reversal' or v_orig.amount <> -p_amount or p_kind <> 'reversal' then
      return jsonb_build_object('ok', false, 'error', 'invalid_reversal');
    end if;
  elsif p_kind = 'reversal' then
    return jsonb_build_object('ok', false, 'error', 'invalid_reversal');
  end if;

  select coalesce(sum(amount), 0) into v_saldo from public.gold_coin_transactions where account_id = v_acc.id;
  if v_saldo + p_amount < 0 then
    return jsonb_build_object('ok', false, 'error', 'insufficient_balance', 'balance', v_saldo);
  end if;

  begin
    insert into public.gold_coin_transactions (account_id, amount, kind, reason, rule_id, reference, operator_user_id, reverses_id, idempotency_key)
    values (v_acc.id, p_amount, p_kind, p_reason, p_rule, p_reference, p_operator, p_reverses, p_idempotency_key)
    returning * into v_tx;
  exception when unique_violation then
    select * into v_tx from public.gold_coin_transactions where idempotency_key = p_idempotency_key;
    if found then
      if v_tx.amount <> p_amount or v_tx.kind <> p_kind or v_tx.account_id <> v_acc.id then
        return jsonb_build_object('ok', false, 'error', 'idempotency_conflict');
      end if;
      return jsonb_build_object('ok', true, 'duplicate', true, 'transaction_id', v_tx.id);
    end if;
    return jsonb_build_object('ok', false, 'error', 'already_reversed');
  end;
  return jsonb_build_object('ok', true, 'duplicate', false, 'transaction_id', v_tx.id, 'balance', v_saldo + p_amount);
end $$;
revoke all on function public.ch_coin_lancar(uuid, integer, text, text, text, uuid, uuid, text, uuid) from public, anon, authenticated;

-- Diretório: a função auxiliar só responde a um membro identificado
-- (usuários do LABPUB no mesmo Auth não a usam como oráculo).
create or replace function public.ch_membro_listavel(p_member uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.current_member_id() is not null
     and exists (select 1 from public.members m where m.id = p_member and m.status = 'active' and not m.is_synthetic)
$$;
revoke all on function public.ch_membro_listavel(uuid) from public, anon;

-- Convite antigo não "ressuscita": ao sair de "invited", os convites vivos
-- são revogados no próprio banco.
create or replace function public.ch_convites_ao_sair_de_convidado() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if old.status = 'invited' and new.status <> 'invited' then
    update public.member_invitations set revoked_at = now()
    where member_id = new.id and accepted_at is null and revoked_at is null;
  end if;
  return new;
end $$;
drop trigger if exists trg_convites_status on public.members;
create trigger trg_convites_status after update of status on public.members
  for each row execute function public.ch_convites_ao_sair_de_convidado();

-- Links internos: nem "//" nem "/\" (o navegador lê "\" como "/").
alter table public.portal_announcements drop constraint if exists portal_announcements_cta_target_check;
alter table public.portal_announcements add constraint portal_announcements_cta_target_check
  check (cta_target is null or cta_target ~ '^(/[^/\\]|/$|https://)');
alter table public.member_notifications drop constraint if exists member_notifications_link_check;
alter table public.member_notifications add constraint member_notifications_link_check
  check (link is null or link ~ '^/([^/\\]|$)');

-- CS privado: só para pessoa da equipe REAL e ativa, garantido no banco.
create or replace function public.ch_cs_so_equipe_real() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.permission like 'cs.%' and not exists (
    select 1 from public.staff_members s where s.user_id = new.user_id and s.status = 'active' and not s.is_synthetic
  ) then
    raise exception 'cs.* só pode ser concedido a pessoa da equipe real e ativa';
  end if;
  return new;
end $$;
drop trigger if exists trg_cs_so_equipe_real on public.user_permissions;
create trigger trg_cs_so_equipe_real before insert or update on public.user_permissions
  for each row execute function public.ch_cs_so_equipe_real();

-- Papel da equipe trocado numa transação (antes: delete + insert soltos).
create or replace function public.ch_definir_papel(p_user uuid, p_role text, p_by uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_role not in ('super_admin', 'admin', 'staff') then raise exception 'papel inválido'; end if;
  if not exists (select 1 from public.staff_members where user_id = p_user) then raise exception 'não é da equipe'; end if;
  delete from public.member_roles where user_id = p_user and role in ('super_admin', 'admin', 'staff');
  insert into public.member_roles (user_id, role, granted_by) values (p_user, p_role, p_by);
end $$;
revoke all on function public.ch_definir_papel(uuid, text, uuid) from public, anon, authenticated;

-- Senha provisória da equipe precisa ser trocada no primeiro acesso.
alter table public.staff_members add column if not exists must_change_password boolean not null default false;

-- Métricas agregadas no banco (o PostgREST corta em 1000 linhas).
create or replace function public.ch_metricas_comunicados(p_ids uuid[])
returns table (announcement_id uuid, impressoes bigint, alcance bigint, cliques bigint, clicantes bigint, fechamentos bigint, reconhecimentos bigint)
language sql stable security definer set search_path = public as $$
  select a.id,
    (select count(*) from public.announcement_impressions i where i.announcement_id = a.id),
    (select count(distinct i.member_id) from public.announcement_impressions i where i.announcement_id = a.id),
    (select count(*) from public.announcement_clicks c where c.announcement_id = a.id),
    (select count(distinct c.member_id) from public.announcement_clicks c where c.announcement_id = a.id),
    (select count(*) from public.announcement_dismissals d where d.announcement_id = a.id and d.kind = 'dismiss'),
    (select count(distinct d.member_id) from public.announcement_dismissals d where d.announcement_id = a.id and d.kind = 'acknowledge')
  from unnest(p_ids) as a(id)
$$;
revoke all on function public.ch_metricas_comunicados(uuid[]) from public, anon, authenticated;

-- Gold Coins em circulação, sem contas sintéticas.
create or replace function public.ch_coins_em_circulacao() returns bigint
language sql stable security definer set search_path = public as $$
  select coalesce(sum(t.amount), 0)::bigint
  from public.gold_coin_transactions t
  join public.gold_coin_accounts a on a.id = t.account_id
  join public.members m on m.id = a.member_id
  where not m.is_synthetic
$$;
revoke all on function public.ch_coins_em_circulacao() from public, anon, authenticated;

-- Compensação: membro inserido por um lote não é apagado se já recebeu CS
-- por um lote posterior (o cascade levaria o CS junto, sem aviso).
create or replace function public.ch_importar_compensar(p_batch uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  r record; v_kind text; v_inicio timestamptz; c int := 0;
begin
  select kind, started_at into v_kind, v_inicio from public.import_batches where id = p_batch and status = 'completed' and mode = 'apply';
  if v_kind is null then raise exception 'lote % não é compensável', p_batch; end if;
  if exists (
    select 1 from public.import_rows ir join public.import_batches b on b.id = ir.batch_id
    where b.kind = v_kind and b.mode = 'apply' and b.status = 'completed' and b.started_at > v_inicio
      and ir.action in ('insert', 'update')
      and ir.member_id in (select member_id from public.import_rows where batch_id = p_batch and action in ('insert', 'update'))
  ) then
    raise exception 'há lote posterior sobre os mesmos membros: compense os mais novos primeiro';
  end if;
  for r in select * from public.import_rows where batch_id = p_batch and action in ('insert', 'update') order by source_row desc loop
    if v_kind = 'members' and r.action = 'insert' then
      if exists (select 1 from public.members where id = r.member_id and user_id is not null)
         or exists (select 1 from public.member_checkins where member_id = r.member_id)
         or exists (select 1 from public.gold_coin_accounts where member_id = r.member_id)
         or exists (
           select 1 from public.import_rows ir2 join public.import_batches b2 on b2.id = ir2.batch_id
           where ir2.member_id = r.member_id and b2.kind = 'private_cs' and b2.mode = 'apply'
             and b2.status = 'completed' and ir2.action in ('insert', 'update')
         ) then
        raise exception 'membro % já tem conta, histórico ou CS importado: compensação manual', r.member_id;
      end if;
      delete from public.members where id = r.member_id;
    elsif v_kind = 'members' and r.action = 'update' then
      update public.members m set full_name = r.previous -> 'member' ->> 'full_name', display_name = r.previous -> 'member' ->> 'display_name',
        phone_e164 = r.previous -> 'member' ->> 'phone_e164', founder_number = (r.previous -> 'member' ->> 'founder_number')::int,
        source_file = r.previous -> 'member' ->> 'source_file', source_row = (r.previous -> 'member' ->> 'source_row')::int,
        import_batch_id = nullif(r.previous -> 'member' ->> 'import_batch_id', '')::uuid,
        imported_at = (r.previous -> 'member' ->> 'imported_at')::timestamptz, source_hash = r.previous -> 'member' ->> 'source_hash'
      where m.id = r.member_id;
      delete from public.member_profiles where member_id = r.member_id;
      if r.previous -> 'profile' is not null and jsonb_typeof(r.previous -> 'profile') = 'object' then
        insert into public.member_profiles select * from jsonb_populate_record(null::public.member_profiles, r.previous -> 'profile');
      end if;
      update public.member_private_cs set behavioral = coalesce(r.previous -> 'private' -> 'behavioral', '{}'),
        behavioral_source = r.previous -> 'private' -> 'behavioral_source', relationship_history = r.previous -> 'private' ->> 'relationship_history'
      where member_id = r.member_id;
    elsif v_kind = 'private_cs' then
      update public.member_private_cs set
        cs_columns = coalesce(r.previous -> 'cs_columns', '{}'), cs_source = r.previous -> 'cs_source',
        identification_status = r.previous ->> 'identification_status', confidence = r.previous ->> 'confidence',
        recommended_use = r.previous ->> 'recommended_use', search_text = r.previous ->> 'search_text'
      where member_id = r.member_id;
    end if;
    c := c + 1;
  end loop;
  update public.import_batches set status = 'compensated', report = report || jsonb_build_object('compensated_at', now(), 'rows', c) where id = p_batch;
  return jsonb_build_object('compensated_rows', c);
end $$;
revoke all on function public.ch_importar_compensar(uuid) from public, anon, authenticated;
