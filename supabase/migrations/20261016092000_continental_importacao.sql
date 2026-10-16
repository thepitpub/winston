-- =====================================================================
-- CONTINENTAL HERITAGE — aplicação transacional das importações.
-- O plano (insert/update/unchanged/review/error) é calculado pelo script
-- (regras puras, testadas); aqui ele é aplicado de uma vez: ou tudo, ou
-- nada. Cada linha guarda o bruto, o normalizado e o estado anterior, o
-- que permite compensar o lote inteiro depois.
-- =====================================================================

alter table public.members add column if not exists source_hash text;
alter table public.import_rows add column if not exists previous jsonb;

create or replace function public.ch_importar_membros(p_batch uuid, p_source_file text, p_itens jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  it jsonb; v_id uuid; v_prev jsonb; v_now timestamptz := now(); v_src jsonb;
  c_ins int := 0; c_upd int := 0; c_unc int := 0; c_rev int := 0; c_err int := 0;
begin
  if not exists (select 1 from public.import_batches where id = p_batch and status = 'running' and mode = 'apply' and kind = 'members') then
    raise exception 'lote % não está aberto para aplicação', p_batch;
  end if;

  for it in select * from jsonb_array_elements(p_itens) loop
    v_id := nullif(it ->> 'membro_id', '')::uuid;
    v_prev := null;
    v_src := jsonb_build_object('file', p_source_file, 'row', (it ->> 'linha')::int, 'batch_id', p_batch, 'imported_at', v_now, 'kind', 'inferencia_planilha');

    if it ->> 'acao' = 'insert' then
      insert into public.members (status, category, full_name, display_name, phone_e164, founder_number,
        source_system, source_file, source_row, legacy_id, import_batch_id, imported_at, source_hash)
      values ('pending', it -> 'member' ->> 'category', it -> 'member' ->> 'full_name', it -> 'member' ->> 'display_name',
        it -> 'member' ->> 'phone_e164', (it -> 'member' ->> 'founder_number')::int,
        'planilha_fundadores', p_source_file, (it ->> 'linha')::int, it -> 'member' ->> 'legacy_id', p_batch, v_now, it ->> 'hash')
      returning id into v_id;
      insert into public.member_profiles
        select * from jsonb_populate_record(null::public.member_profiles,
          (it -> 'profile') || jsonb_build_object('member_id', v_id, 'source_file', p_source_file, 'source_row', (it ->> 'linha')::int, 'updated_at', v_now));
      insert into public.member_private_cs (member_id, behavioral, behavioral_source, relationship_history)
      values (v_id, coalesce(it -> 'behavioral', '{}'), v_src, it ->> 'history');
      c_ins := c_ins + 1;

    elsif it ->> 'acao' = 'update' then
      select jsonb_build_object(
          'member', to_jsonb(m),
          'profile', (select to_jsonb(p) from public.member_profiles p where p.member_id = v_id),
          'private', (select jsonb_build_object('behavioral', c.behavioral, 'behavioral_source', c.behavioral_source, 'relationship_history', c.relationship_history)
                      from public.member_private_cs c where c.member_id = v_id))
        into v_prev
        from public.members m where m.id = v_id and m.updated_at = (it ->> 'esperado')::timestamptz
        for update;
      if v_prev is null then raise exception 'membro % mudou desde a prévia: rode o dry-run de novo', v_id; end if;
      update public.members set
        full_name = it -> 'member' ->> 'full_name',
        display_name = coalesce(it -> 'member' ->> 'display_name', display_name),
        phone_e164 = it -> 'member' ->> 'phone_e164',
        founder_number = (it -> 'member' ->> 'founder_number')::int,
        source_file = p_source_file, source_row = (it ->> 'linha')::int,
        import_batch_id = p_batch, imported_at = v_now, source_hash = it ->> 'hash'
      where id = v_id;
      delete from public.member_profiles where member_id = v_id;
      insert into public.member_profiles
        select * from jsonb_populate_record(null::public.member_profiles,
          (it -> 'profile') || jsonb_build_object('member_id', v_id, 'source_file', p_source_file, 'source_row', (it ->> 'linha')::int, 'updated_at', v_now));
      insert into public.member_private_cs (member_id, behavioral, behavioral_source, relationship_history)
      values (v_id, coalesce(it -> 'behavioral', '{}'), v_src, it ->> 'history')
      on conflict (member_id) do update set behavioral = excluded.behavioral, behavioral_source = excluded.behavioral_source,
        relationship_history = excluded.relationship_history;
      c_upd := c_upd + 1;

    elsif it ->> 'acao' = 'unchanged' then c_unc := c_unc + 1;
    elsif it ->> 'acao' = 'review' then c_rev := c_rev + 1;
    else c_err := c_err + 1;
    end if;

    insert into public.import_rows (batch_id, source_row, raw, normalized, action, member_id, note, previous)
    values (p_batch, (it ->> 'linha')::int, it -> 'raw', it -> 'normalizado', it ->> 'acao', v_id, it ->> 'motivo', v_prev);
  end loop;

  update public.import_batches set status = 'completed', finished_at = now(),
    counts = jsonb_build_object('inserted', c_ins, 'updated', c_upd, 'unchanged', c_unc, 'review', c_rev, 'error', c_err, 'processed', jsonb_array_length(p_itens))
  where id = p_batch;
  return jsonb_build_object('inserted', c_ins, 'updated', c_upd, 'unchanged', c_unc, 'review', c_rev, 'error', c_err);
end $$;

create or replace function public.ch_importar_cs(p_batch uuid, p_source_file text, p_sha text, p_itens jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  it jsonb; v_id uuid; v_prev jsonb; v_now timestamptz := now();
  c_ins int := 0; c_upd int := 0; c_unc int := 0; c_rev int := 0; c_err int := 0;
begin
  if not exists (select 1 from public.import_batches where id = p_batch and status = 'running' and mode = 'apply' and kind = 'private_cs') then
    raise exception 'lote % não está aberto para aplicação', p_batch;
  end if;
  for it in select * from jsonb_array_elements(p_itens) loop
    v_id := nullif(it ->> 'membro_id', '')::uuid;
    v_prev := null;
    if it ->> 'acao' in ('insert', 'update') then
      select jsonb_build_object('cs_columns', c.cs_columns, 'cs_source', c.cs_source, 'identification_status', c.identification_status,
               'confidence', c.confidence, 'recommended_use', c.recommended_use, 'search_text', c.search_text)
        into v_prev from public.member_private_cs c where c.member_id = v_id for update;
      insert into public.member_private_cs (member_id, cs_columns, cs_source, identification_status, confidence, recommended_use, search_text)
      values (v_id, it -> 'cs' -> 'colunas',
        jsonb_build_object('file', p_source_file, 'row', (it ->> 'linha')::int, 'sha256', p_sha, 'batch_id', p_batch, 'imported_at', v_now, 'row_hash', it -> 'cs' ->> 'hash'),
        it -> 'cs' ->> 'status', it -> 'cs' ->> 'confianca', it -> 'cs' ->> 'uso', it -> 'cs' ->> 'busca')
      on conflict (member_id) do update set cs_columns = excluded.cs_columns, cs_source = excluded.cs_source,
        identification_status = excluded.identification_status, confidence = excluded.confidence,
        recommended_use = excluded.recommended_use, search_text = excluded.search_text;
      if it ->> 'acao' = 'insert' then c_ins := c_ins + 1; else c_upd := c_upd + 1; end if;
    elsif it ->> 'acao' = 'unchanged' then c_unc := c_unc + 1;
    elsif it ->> 'acao' = 'review' then c_rev := c_rev + 1;
    else c_err := c_err + 1;
    end if;
    insert into public.import_rows (batch_id, source_row, raw, normalized, action, member_id, note, previous)
    values (p_batch, (it ->> 'linha')::int, it -> 'raw', it -> 'cs', it ->> 'acao', v_id, it ->> 'motivo', v_prev);
  end loop;
  update public.import_batches set status = 'completed', finished_at = now(),
    counts = jsonb_build_object('inserted', c_ins, 'updated', c_upd, 'unchanged', c_unc, 'review', c_rev, 'error', c_err, 'processed', jsonb_array_length(p_itens))
  where id = p_batch;
  return jsonb_build_object('inserted', c_ins, 'updated', c_upd, 'unchanged', c_unc, 'review', c_rev, 'error', c_err);
end $$;

-- Compensação: desfaz um lote aplicado, linha a linha, em ordem reversa.
-- Membro inserido só sai se ainda não tem conta nem histórico.
create or replace function public.ch_importar_compensar(p_batch uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  r record; v_kind text; c int := 0;
begin
  select kind into v_kind from public.import_batches where id = p_batch and status = 'completed' and mode = 'apply';
  if v_kind is null then raise exception 'lote % não é compensável', p_batch; end if;
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

revoke all on function public.ch_importar_membros(uuid, text, jsonb) from public, anon, authenticated;
revoke all on function public.ch_importar_cs(uuid, text, text, jsonb) from public, anon, authenticated;
revoke all on function public.ch_importar_compensar(uuid) from public, anon, authenticated;
