-- =====================================================================
-- Revisão 1 (agente revisor): RLS com AAL2, diretório, revogação de uma
-- sessão, ledger e check-in mais estritos, compensação segura.
-- =====================================================================

-- C2: a política do diretório não pode depender da RLS de `members`
-- (o membro só lê a própria linha). Função definer, sem dado exposto.
create or replace function public.ch_membro_listavel(p_member uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.members m where m.id = p_member and m.status = 'active' and not m.is_synthetic)
$$;
revoke all on function public.ch_membro_listavel(uuid) from public, anon;

drop policy if exists directory_visible on public.directory_preferences;
create policy directory_visible on public.directory_preferences for select to authenticated
  using (visible and moderation_status = 'ok' and public.current_member_id() is not null and public.ch_membro_listavel(member_id));

-- I1: a identidade de membro na RLS exige o segundo fator. Exceções:
-- convidado em onboarding (ainda cadastrando o autenticador), MFA de
-- membro desligado na configuração, e o membro sintético de dev.
create or replace function public.current_member_id() returns uuid
language sql stable security definer set search_path = public as $$
  select m.id from public.members m
  where m.user_id = auth.uid()
    and m.status in ('invited', 'active')
    and (
      m.status = 'invited'
      or m.is_synthetic
      or public.ch_aal2()
      or coalesce((select (value)::text = 'false' from public.app_settings where key = 'mfa_obrigatorio_membro'), false)
    )
  limit 1
$$;

-- I2: revogar UMA sessão no Auth (refresh token), não só na nossa tabela.
create or replace function public.ch_revogar_sessao_auth(p_session uuid, p_user uuid) returns integer
language plpgsql security definer set search_path = public, auth as $$
declare n integer;
begin
  delete from auth.sessions where id = p_session and user_id = p_user;
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function public.ch_revogar_sessao_auth(uuid, uuid) from public, anon, authenticated;

-- Ledger: corrida na mesma chave devolve "duplicate"; estorno só da mesma
-- conta, pelo valor oposto, e nunca de outro estorno.
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
  select * into v_tx from public.gold_coin_transactions where idempotency_key = p_idempotency_key;
  if found then return jsonb_build_object('ok', true, 'duplicate', true, 'transaction_id', v_tx.id); end if;

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
    if found then return jsonb_build_object('ok', true, 'duplicate', true, 'transaction_id', v_tx.id); end if;
    return jsonb_build_object('ok', false, 'error', 'already_reversed');
  end;
  return jsonb_build_object('ok', true, 'duplicate', false, 'transaction_id', v_tx.id, 'balance', v_saldo + p_amount);
end $$;
revoke all on function public.ch_coin_lancar(uuid, integer, text, text, text, uuid, uuid, text, uuid) from public, anon, authenticated;

-- Check-in: só membro ATIVO entra; pendente/convidado/suspenso/revogado
-- recebe "suspended" com o status, para a recepção explicar.
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

  select * into v_member from public.members where id = p_member;
  if not found then
    insert into public.checkin_validation_logs (operator_user_id, event_id, query, source, result)
    values (p_operator, p_event, p_query, p_source, 'not_found');
    return jsonb_build_object('result', 'not_found');
  end if;

  if v_member.status <> 'active' then
    insert into public.checkin_validation_logs (operator_user_id, event_id, member_id, query, source, result, reason)
    values (p_operator, p_event, p_member, p_query, p_source, 'suspended', 'status: ' || v_member.status);
    return jsonb_build_object('result', 'suspended', 'status', v_member.status);
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
  values (p_member, p_event, v_day, p_operator, p_source, nullif(btrim(coalesce(p_exception_reason, '')), ''))
  returning id into v_ck;

  v_result := case when v_dup is not null then 'exception_granted' else 'validated' end;
  insert into public.checkin_validation_logs (operator_user_id, event_id, member_id, query, source, result, reason, checkin_id)
  values (p_operator, p_event, p_member, p_query, p_source, v_result, p_exception_reason, v_ck);
  return jsonb_build_object('result', v_result, 'checkin_id', v_ck);
end $$;
revoke all on function public.ch_validar_checkin(uuid, uuid, uuid, text, text, text) from public, anon, authenticated;

-- Compensação: recusa se um lote POSTERIOR do mesmo tipo tocou os mesmos membros.
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
         or exists (select 1 from public.gold_coin_accounts where member_id = r.member_id) then
        raise exception 'membro % já tem conta ou histórico: compensação manual', r.member_id;
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

-- Links internos não podem começar com "//" (protocolo relativo).
alter table public.portal_announcements drop constraint if exists portal_announcements_cta_target_check;
alter table public.portal_announcements add constraint portal_announcements_cta_target_check
  check (cta_target is null or cta_target ~ '^(/[^/]|/$|https://)');
alter table public.member_notifications drop constraint if exists member_notifications_link_check;
alter table public.member_notifications add constraint member_notifications_link_check
  check (link is null or link ~ '^/([^/]|$)');

-- C1: a equipe sintética de desenvolvimento não lê CS real.
delete from public.user_permissions
  where permission in ('cs.read', 'cs.write')
    and user_id in (select user_id from public.staff_members where is_synthetic);
